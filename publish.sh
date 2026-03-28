#!/usr/bin/env bash
set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "publish.sh must be run inside a git worktree" >&2
  exit 1
fi

current_branch=$(git branch --show-current)
if [[ -z "$current_branch" ]]; then
  echo "publish.sh must be run on a branch, not detached HEAD" >&2
  exit 1
fi

tracking_ref=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
if [[ -z "$tracking_ref" ]]; then
  echo "current branch $current_branch has no upstream tracking branch" >&2
  exit 1
fi

tracking_remote=${tracking_ref%%/*}
git fetch --prune "$tracking_remote"

has_local_changes=0
if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  has_local_changes=1
fi

local_commit=$(git rev-parse @)
remote_commit=$(git rev-parse "$tracking_ref")
base_commit=$(git merge-base @ "$tracking_ref")

if [[ "$local_commit" == "$base_commit" && "$local_commit" != "$remote_commit" ]]; then
  if [[ "$has_local_changes" -eq 1 ]]; then
    echo "branch is behind $tracking_ref; sync remote changes before publishing" >&2
    exit 1
  fi

  git pull --ff-only "$tracking_remote" "$current_branch"
elif [[ "$remote_commit" != "$base_commit" ]]; then
  echo "branch has diverged from $tracking_ref; rebase or merge remote changes before publishing" >&2
  exit 1
fi

package_name=$(node -p "require('./package.json').name")
current_version=$(node -p "require('./package.json').version")
published_version=$(npm view "$package_name" dist-tags.latest 2>/dev/null || true)

has_unpublished_commits=0
if [[ "$local_commit" != "$remote_commit" ]]; then
  has_unpublished_commits=1
fi

should_publish_clean_tree=0
if [[ -n "$published_version" ]] && node -e "
const parse = (v) => v.split('.').map((n) => Number(n));
const gt = (a, b) => {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
};
process.exit(gt(parse(process.argv[1]), parse(process.argv[2])) ? 0 : 1);
" "$current_version" "$published_version"; then
  should_publish_clean_tree=1
fi

if [[ "$has_local_changes" -eq 0 && "$has_unpublished_commits" -eq 0 && "$should_publish_clean_tree" -eq 0 ]]; then
  echo "no local changes or newer version to publish" >&2
  exit 1
fi

next_version=$(node -e "
const parse = (v) => v.split('.').map((n) => Number(n));
const gt = (a, b) => {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
};
const current = parse(process.argv[1]);
const published = process.argv[2] ? parse(process.argv[2]) : [0, 0, 0];
const base = gt(current, published) ? current : published;
base[2] += 1;
console.log(base.join('.'));
" "$current_version" "$published_version")

if [[ "$next_version" != "$current_version" ]]; then
  npm version "$next_version" --no-git-tag-version
fi

release_tag="v$next_version"
release_message="Release $release_tag"

if git rev-parse -q --verify "refs/tags/$release_tag" >/dev/null 2>&1; then
  echo "tag $release_tag already exists" >&2
  exit 1
fi

git add -A

if git diff --cached --quiet; then
  echo "no changes staged for $release_tag" >&2
  exit 1
fi

git commit -m "$release_message"
git tag -a "$release_tag" -m "$release_message"

npm run build
npm publish --access public
