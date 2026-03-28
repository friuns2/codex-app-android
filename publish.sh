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

package_name=$(node -p "require('./package.json').name")
current_version=$(node -p "require('./package.json').version")
published_version=$(npm view "$package_name" dist-tags.latest 2>/dev/null || true)

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
