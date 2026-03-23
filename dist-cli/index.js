#!/usr/bin/env node

// src/cli/index.ts
import { createServer as createServer2 } from "http";
import { chmodSync, createWriteStream, existsSync as existsSync4, mkdirSync } from "fs";
import { readFile as readFile4 } from "fs/promises";
import { homedir as homedir3, networkInterfaces } from "os";
import { join as join5 } from "path";
import { spawn as spawn3, spawnSync } from "child_process";
import { createInterface as createInterface2 } from "readline/promises";
import { fileURLToPath as fileURLToPath2 } from "url";
import { dirname as dirname3 } from "path";
import { get as httpsGet } from "https";
import { Command } from "commander";
import qrcode from "qrcode-terminal";

// src/server/httpServer.ts
import { fileURLToPath } from "url";
import { dirname as dirname2, extname as extname2, isAbsolute as isAbsolute2, join as join4 } from "path";
import { existsSync as existsSync3 } from "fs";
import { writeFile as writeFile3, stat as stat4 } from "fs/promises";
import express from "express";

// src/server/codexAppServerBridge.ts
import { spawn as spawn2 } from "child_process";
import { randomBytes } from "crypto";
import { mkdtemp as mkdtemp2, readFile as readFile2, mkdir as mkdir2, stat as stat2 } from "fs/promises";
import { createReadStream } from "fs";
import { request as httpsRequest } from "https";
import { homedir as homedir2 } from "os";
import { tmpdir as tmpdir2 } from "os";
import { basename, isAbsolute, join as join2, resolve } from "path";
import { createInterface } from "readline";
import { writeFile as writeFile2 } from "fs/promises";

// src/server/skillsRoutes.ts
import { spawn } from "child_process";
import { mkdtemp, readFile, readdir, rm, mkdir, stat, lstat, readlink, symlink } from "fs/promises";
import { existsSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { writeFile } from "fs/promises";
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function getErrorMessage(payload, fallback) {
  if (payload instanceof Error && payload.message.trim().length > 0) {
    return payload.message;
  }
  const record = asRecord(payload);
  if (!record) return fallback;
  const error = record.error;
  if (typeof error === "string" && error.length > 0) return error;
  const nestedError = asRecord(error);
  if (nestedError && typeof nestedError.message === "string" && nestedError.message.length > 0) {
    return nestedError.message;
  }
  return fallback;
}
function setJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function getCodexHomeDir() {
  const codexHome = process.env.CODEX_HOME?.trim();
  return codexHome && codexHome.length > 0 ? codexHome : join(homedir(), ".codex");
}
function getSkillsInstallDir() {
  return join(getCodexHomeDir(), "skills");
}
async function runCommand(command, args, options = {}) {
  await new Promise((resolve2, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve2();
        return;
      }
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
      const suffix = details.length > 0 ? `: ${details}` : "";
      reject(new Error(`Command failed (${command} ${args.join(" ")})${suffix}`));
    });
  });
}
async function runCommandWithOutput(command, args, options = {}) {
  return await new Promise((resolve2, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve2(stdout.trim());
        return;
      }
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
      const suffix = details.length > 0 ? `: ${details}` : "";
      reject(new Error(`Command failed (${command} ${args.join(" ")})${suffix}`));
    });
  });
}
async function detectUserSkillsDir(appServer) {
  try {
    const result = await appServer.rpc("skills/list", {});
    for (const entry of result.data ?? []) {
      for (const skill of entry.skills ?? []) {
        if (skill.scope !== "user" || !skill.path) continue;
        const parts = skill.path.split("/").filter(Boolean);
        if (parts.length < 2) continue;
        return `/${parts.slice(0, -2).join("/")}`;
      }
    }
  } catch {
  }
  return getSkillsInstallDir();
}
async function ensureInstalledSkillIsValid(appServer, skillPath) {
  const result = await appServer.rpc("skills/list", { forceReload: true });
  const normalized = skillPath.endsWith("/SKILL.md") ? skillPath : `${skillPath}/SKILL.md`;
  for (const entry of result.data ?? []) {
    for (const error of entry.errors ?? []) {
      if (error.path === normalized) {
        throw new Error(error.message || "Installed skill is invalid");
      }
    }
  }
}
var TREE_CACHE_TTL_MS = 5 * 60 * 1e3;
var skillsTreeCache = null;
var metaCache = /* @__PURE__ */ new Map();
async function getGhToken() {
  try {
    const proc = spawn("gh", ["auth", "token"], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout.on("data", (d) => {
      out += d.toString();
    });
    return new Promise((resolve2) => {
      proc.on("close", (code) => resolve2(code === 0 ? out.trim() : null));
      proc.on("error", () => resolve2(null));
    });
  } catch {
    return null;
  }
}
async function ghFetch(url) {
  const token = await getGhToken();
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "codex-web-local"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers });
}
async function fetchSkillsTree() {
  if (skillsTreeCache && Date.now() - skillsTreeCache.fetchedAt < TREE_CACHE_TTL_MS) {
    return skillsTreeCache.entries;
  }
  const resp = await ghFetch(`https://api.github.com/repos/${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}/git/trees/main?recursive=1`);
  if (!resp.ok) throw new Error(`GitHub tree API returned ${resp.status}`);
  const data = await resp.json();
  const metaPattern = /^skills\/([^/]+)\/([^/]+)\/_meta\.json$/;
  const seen = /* @__PURE__ */ new Set();
  const entries = [];
  for (const node of data.tree ?? []) {
    const match = metaPattern.exec(node.path);
    if (!match) continue;
    const [, owner, skillName] = match;
    const key = `${owner}/${skillName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      name: skillName,
      owner,
      url: `https://github.com/${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}/tree/main/skills/${owner}/${skillName}`
    });
  }
  skillsTreeCache = { entries, fetchedAt: Date.now() };
  return entries;
}
async function fetchMetaBatch(entries) {
  const toFetch = entries.filter((e) => !metaCache.has(`${e.owner}/${e.name}`));
  if (toFetch.length === 0) return;
  const batch = toFetch.slice(0, 50);
  await Promise.allSettled(
    batch.map(async (e) => {
      const rawUrl = `https://raw.githubusercontent.com/${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}/main/skills/${e.owner}/${e.name}/_meta.json`;
      const resp = await fetch(rawUrl);
      if (!resp.ok) return;
      const meta = await resp.json();
      metaCache.set(`${e.owner}/${e.name}`, {
        displayName: typeof meta.displayName === "string" ? meta.displayName : "",
        description: typeof meta.displayName === "string" ? meta.displayName : "",
        publishedAt: meta.latest?.publishedAt ?? 0
      });
    })
  );
}
function buildHubEntry(e) {
  const cached = metaCache.get(`${e.owner}/${e.name}`);
  return {
    name: e.name,
    owner: e.owner,
    description: cached?.description ?? "",
    displayName: cached?.displayName ?? "",
    publishedAt: cached?.publishedAt ?? 0,
    avatarUrl: `https://github.com/${e.owner}.png?size=40`,
    url: e.url,
    installed: false
  };
}
var GITHUB_DEVICE_CLIENT_ID = "Iv1.b507a08c87ecfe98";
var DEFAULT_SKILLS_SYNC_REPO_NAME = "codexskills";
var SKILLS_SYNC_MANIFEST_PATH = "installed-skills.json";
var SYNC_UPSTREAM_SKILLS_OWNER = "OpenClawAndroid";
var SYNC_UPSTREAM_SKILLS_REPO = "skills";
var HUB_SKILLS_OWNER = "openclaw";
var HUB_SKILLS_REPO = "skills";
var startupSkillsSyncInitialized = false;
var startupSyncStatus = {
  inProgress: false,
  mode: "idle",
  branch: getPreferredSyncBranch(),
  lastAction: "not-started",
  lastRunAtIso: "",
  lastSuccessAtIso: "",
  lastError: ""
};
async function scanInstalledSkillsFromDisk() {
  const map = /* @__PURE__ */ new Map();
  const skillsDir = getSkillsInstallDir();
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const skillMd = join(skillsDir, entry.name, "SKILL.md");
      try {
        await stat(skillMd);
        map.set(entry.name, { name: entry.name, path: skillMd, enabled: true });
      } catch {
      }
    }
  } catch {
  }
  return map;
}
function getSkillsSyncStatePath() {
  return join(getCodexHomeDir(), "skills-sync.json");
}
async function readSkillsSyncState() {
  try {
    const raw = await readFile(getSkillsSyncStatePath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
async function writeSkillsSyncState(state) {
  await writeFile(getSkillsSyncStatePath(), JSON.stringify(state), "utf8");
}
async function getGithubJson(url, token, method = "GET", body) {
  const resp = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "codex-web-local"
    },
    body: body ? JSON.stringify(body) : void 0
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub API ${method} ${url} failed (${resp.status}): ${text}`);
  }
  return await resp.json();
}
async function startGithubDeviceLogin() {
  const resp = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "codex-web-local"
    },
    body: new URLSearchParams({
      client_id: GITHUB_DEVICE_CLIENT_ID,
      scope: "repo read:user"
    })
  });
  if (!resp.ok) {
    throw new Error(`GitHub device flow init failed (${resp.status})`);
  }
  return await resp.json();
}
async function completeGithubDeviceLogin(deviceCode) {
  const resp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "codex-web-local"
    },
    body: new URLSearchParams({
      client_id: GITHUB_DEVICE_CLIENT_ID,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code"
    })
  });
  if (!resp.ok) {
    throw new Error(`GitHub token exchange failed (${resp.status})`);
  }
  const payload = await resp.json();
  if (!payload.access_token) return { token: null, error: payload.error || "unknown_error" };
  return { token: payload.access_token, error: null };
}
function isAndroidLikeRuntime() {
  if (process.platform === "android") return true;
  if (existsSync("/data/data/com.termux")) return true;
  if (process.env.TERMUX_VERSION) return true;
  const prefix = process.env.PREFIX?.toLowerCase() ?? "";
  if (prefix.includes("/com.termux/")) return true;
  const proot = process.env.PROOT_TMP_DIR?.toLowerCase() ?? "";
  return proot.length > 0;
}
function getPreferredSyncBranch() {
  return isAndroidLikeRuntime() ? "android" : "main";
}
function isUpstreamSkillsRepo(repoOwner, repoName) {
  return repoOwner.toLowerCase() === SYNC_UPSTREAM_SKILLS_OWNER.toLowerCase() && repoName.toLowerCase() === SYNC_UPSTREAM_SKILLS_REPO.toLowerCase();
}
async function resolveGithubUsername(token) {
  const user = await getGithubJson("https://api.github.com/user", token);
  return user.login;
}
async function ensurePrivateForkFromUpstream(token, username, repoName) {
  const repoUrl = `https://api.github.com/repos/${username}/${repoName}`;
  let created = false;
  const existing = await fetch(repoUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "codex-web-local"
    }
  });
  if (existing.ok) {
    const details = await existing.json();
    if (details.private === true) return;
    await getGithubJson(repoUrl, token, "PATCH", { private: true });
    return;
  }
  if (existing.status !== 404) {
    throw new Error(`Failed to check personal repo existence (${existing.status})`);
  }
  await getGithubJson(
    "https://api.github.com/user/repos",
    token,
    "POST",
    { name: repoName, private: true, auto_init: false, description: "Codex skills private mirror sync" }
  );
  created = true;
  let ready = false;
  for (let i = 0; i < 20; i++) {
    const check = await fetch(repoUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "codex-web-local"
      }
    });
    if (check.ok) {
      ready = true;
      break;
    }
    await new Promise((resolve2) => setTimeout(resolve2, 1e3));
  }
  if (!ready) throw new Error("Private mirror repo was created but is not available yet");
  if (!created) return;
  const tmp = await mkdtemp(join(tmpdir(), "codex-skills-seed-"));
  try {
    const upstreamUrl = `https://github.com/${SYNC_UPSTREAM_SKILLS_OWNER}/${SYNC_UPSTREAM_SKILLS_REPO}.git`;
    const branch = getPreferredSyncBranch();
    try {
      await runCommand("git", ["clone", "--depth", "1", "--single-branch", "--branch", branch, upstreamUrl, tmp]);
    } catch {
      await runCommand("git", ["clone", "--depth", "1", upstreamUrl, tmp]);
    }
    const privateRemote = toGitHubTokenRemote(username, repoName, token);
    await runCommand("git", ["remote", "set-url", "origin", privateRemote], { cwd: tmp });
    try {
      await runCommand("git", ["checkout", "-B", branch], { cwd: tmp });
    } catch {
    }
    await runCommand("git", ["push", "-u", "origin", `HEAD:${branch}`], { cwd: tmp });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
async function readRemoteSkillsManifest(token, repoOwner, repoName) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${SKILLS_SYNC_MANIFEST_PATH}`;
  const resp = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "codex-web-local"
    }
  });
  if (resp.status === 404) return [];
  if (!resp.ok) throw new Error(`Failed to read remote manifest (${resp.status})`);
  const payload = await resp.json();
  const content = payload.content ? Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8") : "[]";
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) return [];
  const skills = [];
  for (const row of parsed) {
    const item = asRecord(row);
    const owner = typeof item?.owner === "string" ? item.owner : "";
    const name = typeof item?.name === "string" ? item.name : "";
    if (!name) continue;
    skills.push({ ...owner ? { owner } : {}, name, enabled: item?.enabled !== false });
  }
  return skills;
}
async function writeRemoteSkillsManifest(token, repoOwner, repoName, skills) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${SKILLS_SYNC_MANIFEST_PATH}`;
  let sha = "";
  const existing = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "codex-web-local"
    }
  });
  if (existing.ok) {
    const payload = await existing.json();
    sha = payload.sha ?? "";
  }
  const content = Buffer.from(JSON.stringify(skills, null, 2), "utf8").toString("base64");
  await getGithubJson(url, token, "PUT", {
    message: "Update synced skills manifest",
    content,
    ...sha ? { sha } : {}
  });
}
function toGitHubTokenRemote(repoOwner, repoName, token) {
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${repoOwner}/${repoName}.git`;
}
async function ensureSkillsWorkingTreeRepo(repoUrl, branch) {
  const localDir = getSkillsInstallDir();
  await mkdir(localDir, { recursive: true });
  const gitDir = join(localDir, ".git");
  let hasGitDir = false;
  try {
    hasGitDir = (await stat(gitDir)).isDirectory();
  } catch {
    hasGitDir = false;
  }
  if (!hasGitDir) {
    await runCommand("git", ["init"], { cwd: localDir });
    await runCommand("git", ["config", "user.email", "skills-sync@local"], { cwd: localDir });
    await runCommand("git", ["config", "user.name", "Skills Sync"], { cwd: localDir });
    await runCommand("git", ["add", "-A"], { cwd: localDir });
    try {
      await runCommand("git", ["commit", "-m", "Local skills snapshot before sync"], { cwd: localDir });
    } catch {
    }
    await runCommand("git", ["branch", "-M", branch], { cwd: localDir });
    try {
      await runCommand("git", ["remote", "add", "origin", repoUrl], { cwd: localDir });
    } catch {
      await runCommand("git", ["remote", "set-url", "origin", repoUrl], { cwd: localDir });
    }
    await runCommand("git", ["fetch", "origin"], { cwd: localDir });
    try {
      await runCommand("git", ["merge", "--allow-unrelated-histories", "--no-edit", `origin/${branch}`], { cwd: localDir });
    } catch {
    }
    return localDir;
  }
  await runCommand("git", ["remote", "set-url", "origin", repoUrl], { cwd: localDir });
  await runCommand("git", ["fetch", "origin"], { cwd: localDir });
  await resolveMergeConflictsByNewerCommit(localDir, branch);
  try {
    await runCommand("git", ["checkout", branch], { cwd: localDir });
  } catch {
    await resolveMergeConflictsByNewerCommit(localDir, branch);
    await runCommand("git", ["checkout", "-B", branch], { cwd: localDir });
  }
  await resolveMergeConflictsByNewerCommit(localDir, branch);
  const localMtimesBeforePull = await snapshotFileMtimes(localDir);
  try {
    await runCommand("git", ["stash", "push", "--include-untracked", "-m", "codex-skills-autostash"], { cwd: localDir });
  } catch {
  }
  let pulledMtimes = /* @__PURE__ */ new Map();
  try {
    await runCommand("git", ["pull", "--no-rebase", "origin", branch], { cwd: localDir });
    pulledMtimes = await snapshotFileMtimes(localDir);
  } catch {
    await resolveMergeConflictsByNewerCommit(localDir, branch);
    pulledMtimes = await snapshotFileMtimes(localDir);
  }
  try {
    await runCommand("git", ["stash", "pop"], { cwd: localDir });
  } catch {
    await resolveStashPopConflictsByFileTime(localDir, localMtimesBeforePull, pulledMtimes);
  }
  return localDir;
}
async function resolveMergeConflictsByNewerCommit(repoDir, branch) {
  const unmerged = (await runCommandWithOutput("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: repoDir })).split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  if (unmerged.length === 0) return;
  for (const path of unmerged) {
    const oursTime = await getCommitTime(repoDir, "HEAD", path);
    const theirsTime = await getCommitTime(repoDir, `origin/${branch}`, path);
    if (theirsTime > oursTime) {
      await runCommand("git", ["checkout", "--theirs", "--", path], { cwd: repoDir });
    } else {
      await runCommand("git", ["checkout", "--ours", "--", path], { cwd: repoDir });
    }
    await runCommand("git", ["add", "--", path], { cwd: repoDir });
  }
  const mergeHead = (await runCommandWithOutput("git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"], { cwd: repoDir })).trim();
  if (mergeHead) {
    await runCommand("git", ["commit", "-m", "Auto-resolve skills merge by newer file"], { cwd: repoDir });
  }
}
async function getCommitTime(repoDir, ref, path) {
  try {
    const output = (await runCommandWithOutput("git", ["log", "-1", "--format=%ct", ref, "--", path], { cwd: repoDir })).trim();
    return output ? Number.parseInt(output, 10) : 0;
  } catch {
    return 0;
  }
}
async function resolveStashPopConflictsByFileTime(repoDir, localMtimesBeforePull, pulledMtimes) {
  const unmerged = (await runCommandWithOutput("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: repoDir })).split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  if (unmerged.length === 0) return;
  for (const path of unmerged) {
    const localMtime = localMtimesBeforePull.get(path) ?? 0;
    const pulledMtime = pulledMtimes.get(path) ?? 0;
    const side = localMtime >= pulledMtime ? "--theirs" : "--ours";
    await runCommand("git", ["checkout", side, "--", path], { cwd: repoDir });
    await runCommand("git", ["add", "--", path], { cwd: repoDir });
  }
  const mergeHead = (await runCommandWithOutput("git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"], { cwd: repoDir })).trim();
  if (mergeHead) {
    await runCommand("git", ["commit", "-m", "Auto-resolve stash-pop conflicts by file time"], { cwd: repoDir });
  }
}
async function snapshotFileMtimes(dir) {
  const mtimes = /* @__PURE__ */ new Map();
  await walkFileMtimes(dir, dir, mtimes);
  return mtimes;
}
async function walkFileMtimes(rootDir, currentDir, out) {
  let entries;
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryName = String(entry.name);
    if (entryName === ".git") continue;
    const absolutePath = join(currentDir, entryName);
    const relativePath = absolutePath.slice(rootDir.length + 1);
    if (entry.isDirectory()) {
      await walkFileMtimes(rootDir, absolutePath, out);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      const info = await stat(absolutePath);
      out.set(relativePath, info.mtimeMs);
    } catch {
    }
  }
}
async function syncInstalledSkillsFolderToRepo(token, repoOwner, repoName, _installedMap) {
  const remoteUrl = toGitHubTokenRemote(repoOwner, repoName, token);
  const branch = getPreferredSyncBranch();
  const repoDir = await ensureSkillsWorkingTreeRepo(remoteUrl, branch);
  void _installedMap;
  await runCommand("git", ["config", "user.email", "skills-sync@local"], { cwd: repoDir });
  await runCommand("git", ["config", "user.name", "Skills Sync"], { cwd: repoDir });
  await runCommand("git", ["add", "."], { cwd: repoDir });
  const status = (await runCommandWithOutput("git", ["status", "--porcelain"], { cwd: repoDir })).trim();
  if (!status) return;
  await runCommand("git", ["commit", "-m", "Sync installed skills folder and manifest"], { cwd: repoDir });
  await runCommand("git", ["push", "origin", `HEAD:${branch}`], { cwd: repoDir });
}
async function pullInstalledSkillsFolderFromRepo(token, repoOwner, repoName) {
  const remoteUrl = toGitHubTokenRemote(repoOwner, repoName, token);
  const branch = getPreferredSyncBranch();
  await ensureSkillsWorkingTreeRepo(remoteUrl, branch);
}
async function bootstrapSkillsFromUpstreamIntoLocal() {
  const repoUrl = `https://github.com/${SYNC_UPSTREAM_SKILLS_OWNER}/${SYNC_UPSTREAM_SKILLS_REPO}.git`;
  const branch = getPreferredSyncBranch();
  await ensureSkillsWorkingTreeRepo(repoUrl, branch);
}
async function collectLocalSyncedSkills(appServer) {
  const state = await readSkillsSyncState();
  const owners = { ...state.installedOwners ?? {} };
  const tree = await fetchSkillsTree();
  const uniqueOwnerByName = /* @__PURE__ */ new Map();
  const ambiguousNames = /* @__PURE__ */ new Set();
  for (const entry of tree) {
    if (ambiguousNames.has(entry.name)) continue;
    const existingOwner = uniqueOwnerByName.get(entry.name);
    if (!existingOwner) {
      uniqueOwnerByName.set(entry.name, entry.owner);
      continue;
    }
    if (existingOwner !== entry.owner) {
      uniqueOwnerByName.delete(entry.name);
      ambiguousNames.add(entry.name);
    }
  }
  const skills = await appServer.rpc("skills/list", {});
  const seen = /* @__PURE__ */ new Set();
  const synced = [];
  let ownersChanged = false;
  for (const entry of skills.data ?? []) {
    for (const skill of entry.skills ?? []) {
      const name = typeof skill.name === "string" ? skill.name : "";
      if (!name || seen.has(name)) continue;
      seen.add(name);
      let owner = owners[name];
      if (!owner) {
        owner = uniqueOwnerByName.get(name) ?? "";
        if (owner) {
          owners[name] = owner;
          ownersChanged = true;
        }
      }
      synced.push({ ...owner ? { owner } : {}, name, enabled: skill.enabled !== false });
    }
  }
  if (ownersChanged) {
    await writeSkillsSyncState({ ...state, installedOwners: owners });
  }
  synced.sort((a, b) => `${a.owner ?? ""}/${a.name}`.localeCompare(`${b.owner ?? ""}/${b.name}`));
  return synced;
}
async function autoPushSyncedSkills(appServer) {
  const state = await readSkillsSyncState();
  if (!state.githubToken || !state.repoOwner || !state.repoName) return;
  if (isUpstreamSkillsRepo(state.repoOwner, state.repoName)) {
    throw new Error("Refusing to push to upstream skills repository");
  }
  const local = await collectLocalSyncedSkills(appServer);
  const installedMap = await scanInstalledSkillsFromDisk();
  await writeRemoteSkillsManifest(state.githubToken, state.repoOwner, state.repoName, local);
  await syncInstalledSkillsFolderToRepo(state.githubToken, state.repoOwner, state.repoName, installedMap);
}
async function ensureCodexAgentsSymlinkToSkillsAgents() {
  const codexHomeDir = getCodexHomeDir();
  const skillsAgentsPath = join(codexHomeDir, "skills", "AGENTS.md");
  const codexAgentsPath = join(codexHomeDir, "AGENTS.md");
  await mkdir(join(codexHomeDir, "skills"), { recursive: true });
  let copiedFromCodex = false;
  try {
    const codexAgentsStat = await lstat(codexAgentsPath);
    if (codexAgentsStat.isFile() || codexAgentsStat.isSymbolicLink()) {
      const content = await readFile(codexAgentsPath, "utf8");
      await writeFile(skillsAgentsPath, content, "utf8");
      copiedFromCodex = true;
    } else {
      await rm(codexAgentsPath, { force: true, recursive: true });
    }
  } catch {
  }
  if (!copiedFromCodex) {
    try {
      const skillsAgentsStat = await stat(skillsAgentsPath);
      if (!skillsAgentsStat.isFile()) {
        await rm(skillsAgentsPath, { force: true, recursive: true });
        await writeFile(skillsAgentsPath, "", "utf8");
      }
    } catch {
      await writeFile(skillsAgentsPath, "", "utf8");
    }
  }
  const relativeTarget = join("skills", "AGENTS.md");
  try {
    const current = await lstat(codexAgentsPath);
    if (current.isSymbolicLink()) {
      const existingTarget = await readlink(codexAgentsPath);
      if (existingTarget === relativeTarget) return;
    }
    await rm(codexAgentsPath, { force: true, recursive: true });
  } catch {
  }
  await symlink(relativeTarget, codexAgentsPath);
}
async function initializeSkillsSyncOnStartup(appServer) {
  if (startupSkillsSyncInitialized) return;
  startupSkillsSyncInitialized = true;
  startupSyncStatus.inProgress = true;
  startupSyncStatus.lastRunAtIso = (/* @__PURE__ */ new Date()).toISOString();
  startupSyncStatus.lastError = "";
  startupSyncStatus.branch = getPreferredSyncBranch();
  try {
    const state = await readSkillsSyncState();
    if (!state.githubToken) {
      await ensureCodexAgentsSymlinkToSkillsAgents();
      if (!isAndroidLikeRuntime()) {
        startupSyncStatus.mode = "idle";
        startupSyncStatus.lastAction = "skip-upstream-non-android";
        startupSyncStatus.lastSuccessAtIso = (/* @__PURE__ */ new Date()).toISOString();
        return;
      }
      startupSyncStatus.mode = "unauthenticated-bootstrap";
      startupSyncStatus.lastAction = "pull-upstream";
      await bootstrapSkillsFromUpstreamIntoLocal();
      try {
        await appServer.rpc("skills/list", { forceReload: true });
      } catch {
      }
      startupSyncStatus.lastSuccessAtIso = (/* @__PURE__ */ new Date()).toISOString();
      startupSyncStatus.lastAction = "pull-upstream-complete";
      return;
    }
    startupSyncStatus.mode = "authenticated-fork-sync";
    startupSyncStatus.lastAction = "ensure-private-fork";
    const username = state.githubUsername || await resolveGithubUsername(state.githubToken);
    const repoName = DEFAULT_SKILLS_SYNC_REPO_NAME;
    await ensurePrivateForkFromUpstream(state.githubToken, username, repoName);
    await writeSkillsSyncState({ ...state, githubUsername: username, repoOwner: username, repoName });
    startupSyncStatus.lastAction = "pull-private-fork";
    await pullInstalledSkillsFolderFromRepo(state.githubToken, username, repoName);
    try {
      await appServer.rpc("skills/list", { forceReload: true });
    } catch {
    }
    startupSyncStatus.lastAction = "push-private-fork";
    await autoPushSyncedSkills(appServer);
    startupSyncStatus.lastSuccessAtIso = (/* @__PURE__ */ new Date()).toISOString();
    startupSyncStatus.lastAction = "startup-sync-complete";
  } catch (error) {
    startupSyncStatus.lastError = getErrorMessage(error, "startup-sync-failed");
    startupSyncStatus.lastAction = "startup-sync-failed";
  } finally {
    startupSyncStatus.inProgress = false;
  }
}
async function finalizeGithubLoginAndSync(token, username, appServer) {
  const repoName = DEFAULT_SKILLS_SYNC_REPO_NAME;
  await ensurePrivateForkFromUpstream(token, username, repoName);
  const current = await readSkillsSyncState();
  await writeSkillsSyncState({ ...current, githubToken: token, githubUsername: username, repoOwner: username, repoName });
  await pullInstalledSkillsFolderFromRepo(token, username, repoName);
  try {
    await appServer.rpc("skills/list", { forceReload: true });
  } catch {
  }
  await autoPushSyncedSkills(appServer);
}
async function searchSkillsHub(allEntries, query, limit, sort, installedMap) {
  const q = query.toLowerCase().trim();
  const filtered = q ? allEntries.filter((s) => {
    if (s.name.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q)) return true;
    const cached = metaCache.get(`${s.owner}/${s.name}`);
    return Boolean(cached?.displayName?.toLowerCase().includes(q));
  }) : allEntries;
  const page = filtered.slice(0, Math.min(limit * 2, 200));
  await fetchMetaBatch(page);
  let results = page.map(buildHubEntry);
  if (sort === "date") {
    results.sort((a, b) => b.publishedAt - a.publishedAt);
  } else if (q) {
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === q ? 1 : 0;
      const bExact = b.name.toLowerCase() === q ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return b.publishedAt - a.publishedAt;
    });
  }
  return results.slice(0, limit).map((s) => {
    const local = installedMap.get(s.name);
    return local ? { ...s, installed: true, path: local.path, enabled: local.enabled } : s;
  });
}
async function handleSkillsRoutes(req, res, url, context) {
  const { appServer, readJsonBody: readJsonBody2 } = context;
  if (req.method === "GET" && url.pathname === "/codex-api/skills-hub") {
    try {
      const q = url.searchParams.get("q") || "";
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 200);
      const sort = url.searchParams.get("sort") || "date";
      const allEntries = await fetchSkillsTree();
      const installedMap = await scanInstalledSkillsFromDisk();
      try {
        const result = await appServer.rpc("skills/list", {});
        for (const entry of result.data ?? []) {
          for (const skill of entry.skills ?? []) {
            if (skill.name) {
              installedMap.set(skill.name, { name: skill.name, path: skill.path ?? "", enabled: skill.enabled !== false });
            }
          }
        }
      } catch {
      }
      const installedHubEntries = allEntries.filter((e) => installedMap.has(e.name));
      await fetchMetaBatch(installedHubEntries);
      const installed = [];
      for (const [, info] of installedMap) {
        const hubEntry = allEntries.find((e) => e.name === info.name);
        const base = hubEntry ? buildHubEntry(hubEntry) : {
          name: info.name,
          owner: "local",
          description: "",
          displayName: "",
          publishedAt: 0,
          avatarUrl: "",
          url: "",
          installed: false
        };
        installed.push({ ...base, installed: true, path: info.path, enabled: info.enabled });
      }
      const results = await searchSkillsHub(allEntries, q, limit, sort, installedMap);
      setJson(res, 200, { data: results, installed, total: allEntries.length });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to fetch skills hub") });
    }
    return true;
  }
  if (req.method === "GET" && url.pathname === "/codex-api/skills-sync/status") {
    const state = await readSkillsSyncState();
    setJson(res, 200, {
      data: {
        loggedIn: Boolean(state.githubToken),
        githubUsername: state.githubUsername ?? "",
        repoOwner: state.repoOwner ?? "",
        repoName: state.repoName ?? "",
        configured: Boolean(state.githubToken && state.repoOwner && state.repoName),
        startup: {
          inProgress: startupSyncStatus.inProgress,
          mode: startupSyncStatus.mode,
          branch: startupSyncStatus.branch,
          lastAction: startupSyncStatus.lastAction,
          lastRunAtIso: startupSyncStatus.lastRunAtIso,
          lastSuccessAtIso: startupSyncStatus.lastSuccessAtIso,
          lastError: startupSyncStatus.lastError
        }
      }
    });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/codex-api/skills-sync/github/start-login") {
    try {
      const started = await startGithubDeviceLogin();
      setJson(res, 200, { data: started });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to start GitHub login") });
    }
    return true;
  }
  if (req.method === "POST" && url.pathname === "/codex-api/skills-sync/github/token-login") {
    try {
      const payload = asRecord(await readJsonBody2(req));
      const token = typeof payload?.token === "string" ? payload.token.trim() : "";
      if (!token) {
        setJson(res, 400, { error: "Missing GitHub token" });
        return true;
      }
      const username = await resolveGithubUsername(token);
      await finalizeGithubLoginAndSync(token, username, appServer);
      setJson(res, 200, { ok: true, data: { githubUsername: username } });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to login with GitHub token") });
    }
    return true;
  }
  if (req.method === "POST" && url.pathname === "/codex-api/skills-sync/github/logout") {
    try {
      const state = await readSkillsSyncState();
      await writeSkillsSyncState({
        ...state,
        githubToken: void 0,
        githubUsername: void 0,
        repoOwner: void 0,
        repoName: void 0
      });
      setJson(res, 200, { ok: true });
    } catch (error) {
      setJson(res, 500, { error: getErrorMessage(error, "Failed to logout GitHub") });
    }
    return true;
  }
  if (req.method === "POST" && url.pathname === "/codex-api/skills-sync/github/complete-login") {
    try {
      const payload = asRecord(await readJsonBody2(req));
      const deviceCode = typeof payload?.deviceCode === "string" ? payload.deviceCode : "";
      if (!deviceCode) {
        setJson(res, 400, { error: "Missing deviceCode" });
        return true;
      }
      const result = await completeGithubDeviceLogin(deviceCode);
      if (!result.token) {
        setJson(res, 200, { ok: false, pending: result.error === "authorization_pending", error: result.error || "login_failed" });
        return true;
      }
      const token = result.token;
      const username = await resolveGithubUsername(token);
      await finalizeGithubLoginAndSync(token, username, appServer);
      setJson(res, 200, { ok: true, data: { githubUsername: username } });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to complete GitHub login") });
    }
    return true;
  }
  if (req.method === "POST" && url.pathname === "/codex-api/skills-sync/push") {
    try {
      const state = await readSkillsSyncState();
      if (!state.githubToken || !state.repoOwner || !state.repoName) {
        setJson(res, 400, { error: "Skills sync is not configured yet" });
        return true;
      }
      if (isUpstreamSkillsRepo(state.repoOwner, state.repoName)) {
        setJson(res, 400, { error: "Refusing to push to upstream repository" });
        return true;
      }
      const local = await collectLocalSyncedSkills(appServer);
      const installedMap = await scanInstalledSkillsFromDisk();
      await writeRemoteSkillsManifest(state.githubToken, state.repoOwner, state.repoName, local);
      await syncInstalledSkillsFolderToRepo(state.githubToken, state.repoOwner, state.repoName, installedMap);
      setJson(res, 200, { ok: true, data: { synced: local.length } });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to push synced skills") });
    }
    return true;
  }
  if (req.method === "POST" && url.pathname === "/codex-api/skills-sync/pull") {
    try {
      const state = await readSkillsSyncState();
      if (!state.githubToken || !state.repoOwner || !state.repoName) {
        await bootstrapSkillsFromUpstreamIntoLocal();
        try {
          await appServer.rpc("skills/list", { forceReload: true });
        } catch {
        }
        setJson(res, 200, { ok: true, data: { synced: 0, source: "upstream" } });
        return true;
      }
      const remote = await readRemoteSkillsManifest(state.githubToken, state.repoOwner, state.repoName);
      const tree = await fetchSkillsTree();
      const uniqueOwnerByName = /* @__PURE__ */ new Map();
      const ambiguousNames = /* @__PURE__ */ new Set();
      for (const entry of tree) {
        if (ambiguousNames.has(entry.name)) continue;
        const existingOwner = uniqueOwnerByName.get(entry.name);
        if (!existingOwner) {
          uniqueOwnerByName.set(entry.name, entry.owner);
          continue;
        }
        if (existingOwner !== entry.owner) {
          uniqueOwnerByName.delete(entry.name);
          ambiguousNames.add(entry.name);
        }
      }
      const localDir = await detectUserSkillsDir(appServer);
      await pullInstalledSkillsFolderFromRepo(state.githubToken, state.repoOwner, state.repoName);
      const installerScript = "/Users/igor/.cursor/skills/.system/skill-installer/scripts/install-skill-from-github.py";
      const localSkills = await scanInstalledSkillsFromDisk();
      for (const skill of remote) {
        const owner = skill.owner || uniqueOwnerByName.get(skill.name) || "";
        if (!owner) continue;
        if (!localSkills.has(skill.name)) {
          await runCommand("python3", [
            installerScript,
            "--repo",
            `${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}`,
            "--path",
            `skills/${owner}/${skill.name}`,
            "--dest",
            localDir,
            "--method",
            "git"
          ]);
        }
        const skillPath = join(localDir, skill.name);
        await appServer.rpc("skills/config/write", { path: skillPath, enabled: skill.enabled });
      }
      const remoteNames = new Set(remote.map((row) => row.name));
      for (const [name, localInfo] of localSkills.entries()) {
        if (!remoteNames.has(name)) {
          await rm(localInfo.path.replace(/\/SKILL\.md$/, ""), { recursive: true, force: true });
        }
      }
      const nextOwners = {};
      for (const item of remote) {
        const owner = item.owner || uniqueOwnerByName.get(item.name) || "";
        if (owner) nextOwners[item.name] = owner;
      }
      await writeSkillsSyncState({ ...state, installedOwners: nextOwners });
      try {
        await appServer.rpc("skills/list", { forceReload: true });
      } catch {
      }
      setJson(res, 200, { ok: true, data: { synced: remote.length } });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to pull synced skills") });
    }
    return true;
  }
  if (req.method === "GET" && url.pathname === "/codex-api/skills-hub/readme") {
    try {
      const owner = url.searchParams.get("owner") || "";
      const name = url.searchParams.get("name") || "";
      if (!owner || !name) {
        setJson(res, 400, { error: "Missing owner or name" });
        return true;
      }
      const rawUrl = `https://raw.githubusercontent.com/${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}/main/skills/${owner}/${name}/SKILL.md`;
      const resp = await fetch(rawUrl);
      if (!resp.ok) throw new Error(`Failed to fetch SKILL.md: ${resp.status}`);
      const content = await resp.text();
      setJson(res, 200, { content });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to fetch SKILL.md") });
    }
    return true;
  }
  if (req.method === "POST" && url.pathname === "/codex-api/skills-hub/install") {
    try {
      const payload = asRecord(await readJsonBody2(req));
      const owner = typeof payload?.owner === "string" ? payload.owner : "";
      const name = typeof payload?.name === "string" ? payload.name : "";
      if (!owner || !name) {
        setJson(res, 400, { error: "Missing owner or name" });
        return true;
      }
      const installerScript = "/Users/igor/.cursor/skills/.system/skill-installer/scripts/install-skill-from-github.py";
      const installDest = await detectUserSkillsDir(appServer);
      await runCommand("python3", [
        installerScript,
        "--repo",
        `${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}`,
        "--path",
        `skills/${owner}/${name}`,
        "--dest",
        installDest,
        "--method",
        "git"
      ]);
      const skillDir = join(installDest, name);
      await ensureInstalledSkillIsValid(appServer, skillDir);
      const syncState = await readSkillsSyncState();
      const nextOwners = { ...syncState.installedOwners ?? {}, [name]: owner };
      await writeSkillsSyncState({ ...syncState, installedOwners: nextOwners });
      await autoPushSyncedSkills(appServer);
      setJson(res, 200, { ok: true, path: skillDir });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to install skill") });
    }
    return true;
  }
  if (req.method === "POST" && url.pathname === "/codex-api/skills-hub/uninstall") {
    try {
      const payload = asRecord(await readJsonBody2(req));
      const name = typeof payload?.name === "string" ? payload.name : "";
      const path = typeof payload?.path === "string" ? payload.path : "";
      const target = path || (name ? join(getSkillsInstallDir(), name) : "");
      if (!target) {
        setJson(res, 400, { error: "Missing name or path" });
        return true;
      }
      await rm(target, { recursive: true, force: true });
      if (name) {
        const syncState = await readSkillsSyncState();
        const nextOwners = { ...syncState.installedOwners ?? {} };
        delete nextOwners[name];
        await writeSkillsSyncState({ ...syncState, installedOwners: nextOwners });
      }
      await autoPushSyncedSkills(appServer);
      try {
        await appServer.rpc("skills/list", { forceReload: true });
      } catch {
      }
      setJson(res, 200, { ok: true, deletedPath: target });
    } catch (error) {
      setJson(res, 502, { error: getErrorMessage(error, "Failed to uninstall skill") });
    }
    return true;
  }
  return false;
}

// src/server/codexAppServerBridge.ts
function asRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function getErrorMessage2(payload, fallback) {
  if (payload instanceof Error && payload.message.trim().length > 0) {
    return payload.message;
  }
  const record = asRecord2(payload);
  if (!record) return fallback;
  const error = record.error;
  if (typeof error === "string" && error.length > 0) return error;
  const nestedError = asRecord2(error);
  if (nestedError && typeof nestedError.message === "string" && nestedError.message.length > 0) {
    return nestedError.message;
  }
  return fallback;
}
function setJson2(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function extractThreadMessageText(threadReadPayload) {
  const payload = asRecord2(threadReadPayload);
  const thread = asRecord2(payload?.thread);
  const turns = Array.isArray(thread?.turns) ? thread.turns : [];
  const parts = [];
  for (const turn of turns) {
    const turnRecord = asRecord2(turn);
    const items = Array.isArray(turnRecord?.items) ? turnRecord.items : [];
    for (const item of items) {
      const itemRecord = asRecord2(item);
      const type = typeof itemRecord?.type === "string" ? itemRecord.type : "";
      if (type === "agentMessage" && typeof itemRecord?.text === "string" && itemRecord.text.trim().length > 0) {
        parts.push(itemRecord.text.trim());
        continue;
      }
      if (type === "userMessage") {
        const content = Array.isArray(itemRecord?.content) ? itemRecord.content : [];
        for (const block of content) {
          const blockRecord = asRecord2(block);
          if (blockRecord?.type === "text" && typeof blockRecord.text === "string" && blockRecord.text.trim().length > 0) {
            parts.push(blockRecord.text.trim());
          }
        }
        continue;
      }
      if (type === "commandExecution") {
        const command = typeof itemRecord?.command === "string" ? itemRecord.command.trim() : "";
        const output = typeof itemRecord?.aggregatedOutput === "string" ? itemRecord.aggregatedOutput.trim() : "";
        if (command) parts.push(command);
        if (output) parts.push(output);
      }
    }
  }
  return parts.join("\n").trim();
}
function isExactPhraseMatch(query, doc) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return doc.title.toLowerCase().includes(q) || doc.preview.toLowerCase().includes(q) || doc.messageText.toLowerCase().includes(q);
}
function scoreFileCandidate(path, query) {
  if (!query) return 0;
  const lowerPath = path.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const baseName = lowerPath.slice(lowerPath.lastIndexOf("/") + 1);
  if (baseName === lowerQuery) return 0;
  if (baseName.startsWith(lowerQuery)) return 1;
  if (baseName.includes(lowerQuery)) return 2;
  if (lowerPath.includes(`/${lowerQuery}`)) return 3;
  if (lowerPath.includes(lowerQuery)) return 4;
  return 10;
}
async function listFilesWithRipgrep(cwd) {
  return await new Promise((resolve2, reject) => {
    const proc = spawn2("rg", ["--files", "--hidden", "-g", "!.git", "-g", "!node_modules"], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        const rows = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        resolve2(rows);
        return;
      }
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
      reject(new Error(details || "rg --files failed"));
    });
  });
}
function getCodexHomeDir2() {
  const codexHome = process.env.CODEX_HOME?.trim();
  return codexHome && codexHome.length > 0 ? codexHome : join2(homedir2(), ".codex");
}
async function runCommand2(command, args, options = {}) {
  await new Promise((resolve2, reject) => {
    const proc = spawn2(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve2();
        return;
      }
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
      const suffix = details.length > 0 ? `: ${details}` : "";
      reject(new Error(`Command failed (${command} ${args.join(" ")})${suffix}`));
    });
  });
}
function isMissingHeadError(error) {
  const message = getErrorMessage2(error, "").toLowerCase();
  return message.includes("not a valid object name: 'head'") || message.includes("not a valid object name: head") || message.includes("invalid reference: head");
}
function isNotGitRepositoryError(error) {
  const message = getErrorMessage2(error, "").toLowerCase();
  return message.includes("not a git repository") || message.includes("fatal: not a git repository");
}
async function ensureRepoHasInitialCommit(repoRoot) {
  const agentsPath = join2(repoRoot, "AGENTS.md");
  try {
    await stat2(agentsPath);
  } catch {
    await writeFile2(agentsPath, "", "utf8");
  }
  await runCommand2("git", ["add", "AGENTS.md"], { cwd: repoRoot });
  await runCommand2(
    "git",
    ["-c", "user.name=Codex", "-c", "user.email=codex@local", "commit", "-m", "Initialize repository for worktree support"],
    { cwd: repoRoot }
  );
}
async function runCommandCapture(command, args, options = {}) {
  return await new Promise((resolve2, reject) => {
    const proc = spawn2(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve2(stdout.trim());
        return;
      }
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
      const suffix = details.length > 0 ? `: ${details}` : "";
      reject(new Error(`Command failed (${command} ${args.join(" ")})${suffix}`));
    });
  });
}
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  const normalized = [];
  for (const item of value) {
    if (typeof item === "string" && item.length > 0 && !normalized.includes(item)) {
      normalized.push(item);
    }
  }
  return normalized;
}
function normalizeStringRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof key === "string" && key.length > 0 && typeof item === "string") {
      next[key] = item;
    }
  }
  return next;
}
function getCodexAuthPath() {
  return join2(getCodexHomeDir2(), "auth.json");
}
async function readCodexAuth() {
  try {
    const raw = await readFile2(getCodexAuthPath(), "utf8");
    const auth = JSON.parse(raw);
    const token = auth.tokens?.access_token;
    if (!token) return null;
    return { accessToken: token, accountId: auth.tokens?.account_id ?? void 0 };
  } catch {
    return null;
  }
}
function getCodexGlobalStatePath() {
  return join2(getCodexHomeDir2(), ".codex-global-state.json");
}
function getCodexSessionIndexPath() {
  return join2(getCodexHomeDir2(), "session_index.jsonl");
}
var MAX_THREAD_TITLES = 500;
var EMPTY_THREAD_TITLE_CACHE = { titles: {}, order: [] };
var sessionIndexThreadTitleCacheState = {
  fileSignature: null,
  cache: EMPTY_THREAD_TITLE_CACHE
};
function normalizeThreadTitleCache(value) {
  const record = asRecord2(value);
  if (!record) return EMPTY_THREAD_TITLE_CACHE;
  const rawTitles = asRecord2(record.titles);
  const titles = {};
  if (rawTitles) {
    for (const [k, v] of Object.entries(rawTitles)) {
      if (typeof v === "string" && v.length > 0) titles[k] = v;
    }
  }
  const order = normalizeStringArray(record.order);
  return { titles, order };
}
function updateThreadTitleCache(cache, id, title) {
  const titles = { ...cache.titles, [id]: title };
  const order = [id, ...cache.order.filter((o) => o !== id)];
  while (order.length > MAX_THREAD_TITLES) {
    const removed = order.pop();
    if (removed) delete titles[removed];
  }
  return { titles, order };
}
function removeFromThreadTitleCache(cache, id) {
  const { [id]: _, ...titles } = cache.titles;
  return { titles, order: cache.order.filter((o) => o !== id) };
}
function normalizeSessionIndexThreadTitle(value) {
  const record = asRecord2(value);
  if (!record) return null;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const title = typeof record.thread_name === "string" ? record.thread_name.trim() : "";
  const updatedAtIso = typeof record.updated_at === "string" ? record.updated_at.trim() : "";
  const updatedAtMs = updatedAtIso ? Date.parse(updatedAtIso) : Number.NaN;
  if (!id || !title) return null;
  return {
    id,
    title,
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0
  };
}
function trimThreadTitleCache(cache) {
  const titles = { ...cache.titles };
  const order = cache.order.filter((id) => {
    if (!titles[id]) return false;
    return true;
  }).slice(0, MAX_THREAD_TITLES);
  for (const id of Object.keys(titles)) {
    if (!order.includes(id)) {
      delete titles[id];
    }
  }
  return { titles, order };
}
function mergeThreadTitleCaches(base, overlay) {
  const titles = { ...base.titles, ...overlay.titles };
  const order = [];
  for (const id of [...overlay.order, ...base.order]) {
    if (!titles[id] || order.includes(id)) continue;
    order.push(id);
  }
  for (const id of Object.keys(titles)) {
    if (!order.includes(id)) {
      order.push(id);
    }
  }
  return trimThreadTitleCache({ titles, order });
}
async function readThreadTitleCache() {
  const statePath = getCodexGlobalStatePath();
  try {
    const raw = await readFile2(statePath, "utf8");
    const payload = asRecord2(JSON.parse(raw)) ?? {};
    return normalizeThreadTitleCache(payload["thread-titles"]);
  } catch {
    return EMPTY_THREAD_TITLE_CACHE;
  }
}
async function writeThreadTitleCache(cache) {
  const statePath = getCodexGlobalStatePath();
  let payload = {};
  try {
    const raw = await readFile2(statePath, "utf8");
    payload = asRecord2(JSON.parse(raw)) ?? {};
  } catch {
    payload = {};
  }
  payload["thread-titles"] = cache;
  await writeFile2(statePath, JSON.stringify(payload), "utf8");
}
function getSessionIndexFileSignature(stats) {
  return `${String(stats.mtimeMs)}:${String(stats.size)}`;
}
async function parseThreadTitlesFromSessionIndex(sessionIndexPath) {
  const latestById = /* @__PURE__ */ new Map();
  const input = createReadStream(sessionIndexPath, { encoding: "utf8" });
  const lines = createInterface({
    input,
    crlfDelay: Infinity
  });
  try {
    for await (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = normalizeSessionIndexThreadTitle(JSON.parse(trimmed));
        if (!entry) continue;
        const previous = latestById.get(entry.id);
        if (!previous || entry.updatedAtMs >= previous.updatedAtMs) {
          latestById.set(entry.id, entry);
        }
      } catch {
      }
    }
  } finally {
    lines.close();
    input.close();
  }
  const entries = Array.from(latestById.values()).sort((first, second) => second.updatedAtMs - first.updatedAtMs);
  const titles = {};
  const order = [];
  for (const entry of entries) {
    titles[entry.id] = entry.title;
    order.push(entry.id);
  }
  return trimThreadTitleCache({ titles, order });
}
async function readThreadTitlesFromSessionIndex() {
  const sessionIndexPath = getCodexSessionIndexPath();
  try {
    const stats = await stat2(sessionIndexPath);
    const fileSignature = getSessionIndexFileSignature(stats);
    if (sessionIndexThreadTitleCacheState.fileSignature === fileSignature) {
      return sessionIndexThreadTitleCacheState.cache;
    }
    const cache = await parseThreadTitlesFromSessionIndex(sessionIndexPath);
    sessionIndexThreadTitleCacheState = { fileSignature, cache };
    return cache;
  } catch {
    sessionIndexThreadTitleCacheState = {
      fileSignature: "missing",
      cache: EMPTY_THREAD_TITLE_CACHE
    };
    return sessionIndexThreadTitleCacheState.cache;
  }
}
async function readMergedThreadTitleCache() {
  const [sessionIndexCache, persistedCache] = await Promise.all([
    readThreadTitlesFromSessionIndex(),
    readThreadTitleCache()
  ]);
  return mergeThreadTitleCaches(persistedCache, sessionIndexCache);
}
async function readWorkspaceRootsState() {
  const statePath = getCodexGlobalStatePath();
  let payload = {};
  try {
    const raw = await readFile2(statePath, "utf8");
    const parsed = JSON.parse(raw);
    payload = asRecord2(parsed) ?? {};
  } catch {
    payload = {};
  }
  return {
    order: normalizeStringArray(payload["electron-saved-workspace-roots"]),
    labels: normalizeStringRecord(payload["electron-workspace-root-labels"]),
    active: normalizeStringArray(payload["active-workspace-roots"])
  };
}
async function writeWorkspaceRootsState(nextState) {
  const statePath = getCodexGlobalStatePath();
  let payload = {};
  try {
    const raw = await readFile2(statePath, "utf8");
    payload = asRecord2(JSON.parse(raw)) ?? {};
  } catch {
    payload = {};
  }
  payload["electron-saved-workspace-roots"] = normalizeStringArray(nextState.order);
  payload["electron-workspace-root-labels"] = normalizeStringRecord(nextState.labels);
  payload["active-workspace-roots"] = normalizeStringArray(nextState.active);
  await writeFile2(statePath, JSON.stringify(payload), "utf8");
}
async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (raw.length === 0) return null;
  const text = raw.toString("utf8").trim();
  if (text.length === 0) return null;
  return JSON.parse(text);
}
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
function bufferIndexOf(buf, needle, start = 0) {
  for (let i = start; i <= buf.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (buf[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}
function handleFileUpload(req, res) {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    try {
      const body = Buffer.concat(chunks);
      const contentType = req.headers["content-type"] ?? "";
      const boundaryMatch = contentType.match(/boundary=(.+)/i);
      if (!boundaryMatch) {
        setJson2(res, 400, { error: "Missing multipart boundary" });
        return;
      }
      const boundary = boundaryMatch[1];
      const boundaryBuf = Buffer.from(`--${boundary}`);
      const parts = [];
      let searchStart = 0;
      while (searchStart < body.length) {
        const idx = body.indexOf(boundaryBuf, searchStart);
        if (idx < 0) break;
        if (searchStart > 0) parts.push(body.subarray(searchStart, idx));
        searchStart = idx + boundaryBuf.length;
        if (body[searchStart] === 13 && body[searchStart + 1] === 10) searchStart += 2;
      }
      let fileName = "uploaded-file";
      let fileData = null;
      const headerSep = Buffer.from("\r\n\r\n");
      for (const part of parts) {
        const headerEnd = bufferIndexOf(part, headerSep);
        if (headerEnd < 0) continue;
        const headers = part.subarray(0, headerEnd).toString("utf8");
        const fnMatch = headers.match(/filename="([^"]+)"/i);
        if (!fnMatch) continue;
        fileName = fnMatch[1].replace(/[/\\]/g, "_");
        let end = part.length;
        if (end >= 2 && part[end - 2] === 13 && part[end - 1] === 10) end -= 2;
        fileData = part.subarray(headerEnd + 4, end);
        break;
      }
      if (!fileData) {
        setJson2(res, 400, { error: "No file in request" });
        return;
      }
      const uploadDir = join2(tmpdir2(), "codex-web-uploads");
      await mkdir2(uploadDir, { recursive: true });
      const destDir = await mkdtemp2(join2(uploadDir, "f-"));
      const destPath = join2(destDir, fileName);
      await writeFile2(destPath, fileData);
      setJson2(res, 200, { path: destPath });
    } catch (err) {
      setJson2(res, 500, { error: getErrorMessage2(err, "Upload failed") });
    }
  });
  req.on("error", (err) => {
    setJson2(res, 500, { error: getErrorMessage2(err, "Upload stream error") });
  });
}
async function proxyTranscribe(body, contentType, authToken, accountId) {
  const headers = {
    "Content-Type": contentType,
    "Content-Length": body.length,
    Authorization: `Bearer ${authToken}`,
    originator: "Codex Desktop",
    "User-Agent": `Codex Desktop/0.1.0 (${process.platform}; ${process.arch})`
  };
  if (accountId) {
    headers["ChatGPT-Account-Id"] = accountId;
  }
  return new Promise((resolve2, reject) => {
    const req = httpsRequest(
      "https://chatgpt.com/backend-api/transcribe",
      { method: "POST", headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve2({ status: res.statusCode ?? 500, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
var AppServerProcess = class {
  constructor() {
    this.process = null;
    this.initialized = false;
    this.initializePromise = null;
    this.readBuffer = "";
    this.nextId = 1;
    this.stopping = false;
    this.pending = /* @__PURE__ */ new Map();
    this.notificationListeners = /* @__PURE__ */ new Set();
    this.pendingServerRequests = /* @__PURE__ */ new Map();
    this.appServerArgs = [
      "app-server",
      "-c",
      'approval_policy="never"',
      "-c",
      'sandbox_mode="danger-full-access"'
    ];
  }
  start() {
    if (this.process) return;
    this.stopping = false;
    const proc = spawn2("codex", this.appServerArgs, { stdio: ["pipe", "pipe", "pipe"] });
    this.process = proc;
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      this.readBuffer += chunk;
      let lineEnd = this.readBuffer.indexOf("\n");
      while (lineEnd !== -1) {
        const line = this.readBuffer.slice(0, lineEnd).trim();
        this.readBuffer = this.readBuffer.slice(lineEnd + 1);
        if (line.length > 0) {
          this.handleLine(line);
        }
        lineEnd = this.readBuffer.indexOf("\n");
      }
    });
    proc.stderr.setEncoding("utf8");
    proc.stderr.on("data", () => {
    });
    proc.on("exit", () => {
      const failure = new Error(this.stopping ? "codex app-server stopped" : "codex app-server exited unexpectedly");
      for (const request of this.pending.values()) {
        request.reject(failure);
      }
      this.pending.clear();
      this.pendingServerRequests.clear();
      this.process = null;
      this.initialized = false;
      this.initializePromise = null;
      this.readBuffer = "";
    });
  }
  sendLine(payload) {
    if (!this.process) {
      throw new Error("codex app-server is not running");
    }
    this.process.stdin.write(`${JSON.stringify(payload)}
`);
  }
  handleLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (typeof message.id === "number" && this.pending.has(message.id)) {
      const pendingRequest = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (!pendingRequest) return;
      if (message.error) {
        pendingRequest.reject(new Error(message.error.message));
      } else {
        pendingRequest.resolve(message.result);
      }
      return;
    }
    if (typeof message.method === "string" && typeof message.id !== "number") {
      this.emitNotification({
        method: message.method,
        params: message.params ?? null
      });
      return;
    }
    if (typeof message.id === "number" && typeof message.method === "string") {
      this.handleServerRequest(message.id, message.method, message.params ?? null);
    }
  }
  emitNotification(notification) {
    for (const listener of this.notificationListeners) {
      listener(notification);
    }
  }
  sendServerRequestReply(requestId, reply) {
    if (reply.error) {
      this.sendLine({
        jsonrpc: "2.0",
        id: requestId,
        error: reply.error
      });
      return;
    }
    this.sendLine({
      jsonrpc: "2.0",
      id: requestId,
      result: reply.result ?? {}
    });
  }
  resolvePendingServerRequest(requestId, reply) {
    const pendingRequest = this.pendingServerRequests.get(requestId);
    if (!pendingRequest) {
      throw new Error(`No pending server request found for id ${String(requestId)}`);
    }
    this.pendingServerRequests.delete(requestId);
    this.sendServerRequestReply(requestId, reply);
    const requestParams = asRecord2(pendingRequest.params);
    const threadId = typeof requestParams?.threadId === "string" && requestParams.threadId.length > 0 ? requestParams.threadId : "";
    this.emitNotification({
      method: "server/request/resolved",
      params: {
        id: requestId,
        method: pendingRequest.method,
        threadId,
        mode: "manual",
        resolvedAtIso: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  }
  handleServerRequest(requestId, method, params) {
    const pendingRequest = {
      id: requestId,
      method,
      params,
      receivedAtIso: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.pendingServerRequests.set(requestId, pendingRequest);
    this.emitNotification({
      method: "server/request",
      params: pendingRequest
    });
  }
  async call(method, params) {
    this.start();
    const id = this.nextId++;
    return new Promise((resolve2, reject) => {
      this.pending.set(id, { resolve: resolve2, reject });
      this.sendLine({
        jsonrpc: "2.0",
        id,
        method,
        params
      });
    });
  }
  async ensureInitialized() {
    if (this.initialized) return;
    if (this.initializePromise) {
      await this.initializePromise;
      return;
    }
    this.initializePromise = this.call("initialize", {
      clientInfo: {
        name: "codex-web-local",
        version: "0.1.0"
      }
    }).then(() => {
      this.initialized = true;
    }).finally(() => {
      this.initializePromise = null;
    });
    await this.initializePromise;
  }
  async rpc(method, params) {
    await this.ensureInitialized();
    return this.call(method, params);
  }
  onNotification(listener) {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }
  async respondToServerRequest(payload) {
    await this.ensureInitialized();
    const body = asRecord2(payload);
    if (!body) {
      throw new Error("Invalid response payload: expected object");
    }
    const id = body.id;
    if (typeof id !== "number" || !Number.isInteger(id)) {
      throw new Error('Invalid response payload: "id" must be an integer');
    }
    const rawError = asRecord2(body.error);
    if (rawError) {
      const message = typeof rawError.message === "string" && rawError.message.trim().length > 0 ? rawError.message.trim() : "Server request rejected by client";
      const code = typeof rawError.code === "number" && Number.isFinite(rawError.code) ? Math.trunc(rawError.code) : -32e3;
      this.resolvePendingServerRequest(id, { error: { code, message } });
      return;
    }
    if (!("result" in body)) {
      throw new Error('Invalid response payload: expected "result" or "error"');
    }
    this.resolvePendingServerRequest(id, { result: body.result });
  }
  listPendingServerRequests() {
    return Array.from(this.pendingServerRequests.values());
  }
  dispose() {
    if (!this.process) return;
    const proc = this.process;
    this.stopping = true;
    this.process = null;
    this.initialized = false;
    this.initializePromise = null;
    this.readBuffer = "";
    const failure = new Error("codex app-server stopped");
    for (const request of this.pending.values()) {
      request.reject(failure);
    }
    this.pending.clear();
    this.pendingServerRequests.clear();
    try {
      proc.stdin.end();
    } catch {
    }
    try {
      proc.kill("SIGTERM");
    } catch {
    }
    const forceKillTimer = setTimeout(() => {
      if (!proc.killed) {
        try {
          proc.kill("SIGKILL");
        } catch {
        }
      }
    }, 1500);
    forceKillTimer.unref();
  }
};
var MethodCatalog = class {
  constructor() {
    this.methodCache = null;
    this.notificationCache = null;
  }
  async runGenerateSchemaCommand(outDir) {
    await new Promise((resolve2, reject) => {
      const process2 = spawn2("codex", ["app-server", "generate-json-schema", "--out", outDir], {
        stdio: ["ignore", "ignore", "pipe"]
      });
      let stderr = "";
      process2.stderr.setEncoding("utf8");
      process2.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      process2.on("error", reject);
      process2.on("exit", (code) => {
        if (code === 0) {
          resolve2();
          return;
        }
        reject(new Error(stderr.trim() || `generate-json-schema exited with code ${String(code)}`));
      });
    });
  }
  extractMethodsFromClientRequest(payload) {
    const root = asRecord2(payload);
    const oneOf = Array.isArray(root?.oneOf) ? root.oneOf : [];
    const methods = /* @__PURE__ */ new Set();
    for (const entry of oneOf) {
      const row = asRecord2(entry);
      const properties = asRecord2(row?.properties);
      const methodDef = asRecord2(properties?.method);
      const methodEnum = Array.isArray(methodDef?.enum) ? methodDef.enum : [];
      for (const item of methodEnum) {
        if (typeof item === "string" && item.length > 0) {
          methods.add(item);
        }
      }
    }
    return Array.from(methods).sort((a, b) => a.localeCompare(b));
  }
  extractMethodsFromServerNotification(payload) {
    const root = asRecord2(payload);
    const oneOf = Array.isArray(root?.oneOf) ? root.oneOf : [];
    const methods = /* @__PURE__ */ new Set();
    for (const entry of oneOf) {
      const row = asRecord2(entry);
      const properties = asRecord2(row?.properties);
      const methodDef = asRecord2(properties?.method);
      const methodEnum = Array.isArray(methodDef?.enum) ? methodDef.enum : [];
      for (const item of methodEnum) {
        if (typeof item === "string" && item.length > 0) {
          methods.add(item);
        }
      }
    }
    return Array.from(methods).sort((a, b) => a.localeCompare(b));
  }
  async listMethods() {
    if (this.methodCache) {
      return this.methodCache;
    }
    const outDir = await mkdtemp2(join2(tmpdir2(), "codex-web-local-schema-"));
    await this.runGenerateSchemaCommand(outDir);
    const clientRequestPath = join2(outDir, "ClientRequest.json");
    const raw = await readFile2(clientRequestPath, "utf8");
    const parsed = JSON.parse(raw);
    const methods = this.extractMethodsFromClientRequest(parsed);
    this.methodCache = methods;
    return methods;
  }
  async listNotificationMethods() {
    if (this.notificationCache) {
      return this.notificationCache;
    }
    const outDir = await mkdtemp2(join2(tmpdir2(), "codex-web-local-schema-"));
    await this.runGenerateSchemaCommand(outDir);
    const serverNotificationPath = join2(outDir, "ServerNotification.json");
    const raw = await readFile2(serverNotificationPath, "utf8");
    const parsed = JSON.parse(raw);
    const methods = this.extractMethodsFromServerNotification(parsed);
    this.notificationCache = methods;
    return methods;
  }
};
var SHARED_BRIDGE_KEY = "__codexRemoteSharedBridge__";
function getSharedBridgeState() {
  const globalScope = globalThis;
  const existing = globalScope[SHARED_BRIDGE_KEY];
  if (existing) return existing;
  const created = {
    appServer: new AppServerProcess(),
    methodCatalog: new MethodCatalog()
  };
  globalScope[SHARED_BRIDGE_KEY] = created;
  return created;
}
async function loadAllThreadsForSearch(appServer) {
  const threads = [];
  let cursor = null;
  do {
    const response = asRecord2(await appServer.rpc("thread/list", {
      archived: false,
      limit: 100,
      sortKey: "updated_at",
      cursor
    }));
    const data = Array.isArray(response?.data) ? response.data : [];
    for (const row of data) {
      const record = asRecord2(row);
      const id = typeof record?.id === "string" ? record.id : "";
      if (!id) continue;
      const title = typeof record?.name === "string" && record.name.trim().length > 0 ? record.name.trim() : typeof record?.preview === "string" && record.preview.trim().length > 0 ? record.preview.trim() : "Untitled thread";
      const preview = typeof record?.preview === "string" ? record.preview : "";
      threads.push({ id, title, preview });
    }
    cursor = typeof response?.nextCursor === "string" && response.nextCursor.length > 0 ? response.nextCursor : null;
  } while (cursor);
  const docs = [];
  const concurrency = 4;
  for (let offset = 0; offset < threads.length; offset += concurrency) {
    const batch = threads.slice(offset, offset + concurrency);
    const loaded = await Promise.all(batch.map(async (thread) => {
      try {
        const readResponse = await appServer.rpc("thread/read", {
          threadId: thread.id,
          includeTurns: true
        });
        const messageText = extractThreadMessageText(readResponse);
        const searchableText = [thread.title, thread.preview, messageText].filter(Boolean).join("\n");
        return {
          id: thread.id,
          title: thread.title,
          preview: thread.preview,
          messageText,
          searchableText
        };
      } catch {
        const searchableText = [thread.title, thread.preview].filter(Boolean).join("\n");
        return {
          id: thread.id,
          title: thread.title,
          preview: thread.preview,
          messageText: "",
          searchableText
        };
      }
    }));
    docs.push(...loaded);
  }
  return docs;
}
async function buildThreadSearchIndex(appServer) {
  const docs = await loadAllThreadsForSearch(appServer);
  const docsById = new Map(docs.map((doc) => [doc.id, doc]));
  return { docsById };
}
function createCodexBridgeMiddleware() {
  const { appServer, methodCatalog } = getSharedBridgeState();
  let threadSearchIndex = null;
  let threadSearchIndexPromise = null;
  async function getThreadSearchIndex() {
    if (threadSearchIndex) return threadSearchIndex;
    if (!threadSearchIndexPromise) {
      threadSearchIndexPromise = buildThreadSearchIndex(appServer).then((index) => {
        threadSearchIndex = index;
        return index;
      }).finally(() => {
        threadSearchIndexPromise = null;
      });
    }
    return threadSearchIndexPromise;
  }
  void initializeSkillsSyncOnStartup(appServer);
  const middleware = async (req, res, next) => {
    try {
      if (!req.url) {
        next();
        return;
      }
      const url = new URL(req.url, "http://localhost");
      if (await handleSkillsRoutes(req, res, url, { appServer, readJsonBody })) {
        return;
      }
      if (req.method === "POST" && url.pathname === "/codex-api/upload-file") {
        handleFileUpload(req, res);
        return;
      }
      if (req.method === "POST" && url.pathname === "/codex-api/rpc") {
        const payload = await readJsonBody(req);
        const body = asRecord2(payload);
        if (!body || typeof body.method !== "string" || body.method.length === 0) {
          setJson2(res, 400, { error: "Invalid body: expected { method, params? }" });
          return;
        }
        const result = await appServer.rpc(body.method, body.params ?? null);
        setJson2(res, 200, { result });
        return;
      }
      if (req.method === "POST" && url.pathname === "/codex-api/transcribe") {
        const auth = await readCodexAuth();
        if (!auth) {
          setJson2(res, 401, { error: "No auth token available for transcription" });
          return;
        }
        const rawBody = await readRawBody(req);
        const incomingCt = req.headers["content-type"] ?? "application/octet-stream";
        const upstream = await proxyTranscribe(rawBody, incomingCt, auth.accessToken, auth.accountId);
        res.statusCode = upstream.status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(upstream.body);
        return;
      }
      if (req.method === "POST" && url.pathname === "/codex-api/server-requests/respond") {
        const payload = await readJsonBody(req);
        await appServer.respondToServerRequest(payload);
        setJson2(res, 200, { ok: true });
        return;
      }
      if (req.method === "GET" && url.pathname === "/codex-api/server-requests/pending") {
        setJson2(res, 200, { data: appServer.listPendingServerRequests() });
        return;
      }
      if (req.method === "GET" && url.pathname === "/codex-api/meta/methods") {
        const methods = await methodCatalog.listMethods();
        setJson2(res, 200, { data: methods });
        return;
      }
      if (req.method === "GET" && url.pathname === "/codex-api/meta/notifications") {
        const methods = await methodCatalog.listNotificationMethods();
        setJson2(res, 200, { data: methods });
        return;
      }
      if (req.method === "GET" && url.pathname === "/codex-api/workspace-roots-state") {
        const state = await readWorkspaceRootsState();
        setJson2(res, 200, { data: state });
        return;
      }
      if (req.method === "GET" && url.pathname === "/codex-api/home-directory") {
        setJson2(res, 200, { data: { path: homedir2() } });
        return;
      }
      if (req.method === "POST" && url.pathname === "/codex-api/worktree/create") {
        const payload = asRecord2(await readJsonBody(req));
        const rawSourceCwd = typeof payload?.sourceCwd === "string" ? payload.sourceCwd.trim() : "";
        if (!rawSourceCwd) {
          setJson2(res, 400, { error: "Missing sourceCwd" });
          return;
        }
        const sourceCwd = isAbsolute(rawSourceCwd) ? rawSourceCwd : resolve(rawSourceCwd);
        try {
          const sourceInfo = await stat2(sourceCwd);
          if (!sourceInfo.isDirectory()) {
            setJson2(res, 400, { error: "sourceCwd is not a directory" });
            return;
          }
        } catch {
          setJson2(res, 404, { error: "sourceCwd does not exist" });
          return;
        }
        try {
          let gitRoot = "";
          try {
            gitRoot = await runCommandCapture("git", ["rev-parse", "--show-toplevel"], { cwd: sourceCwd });
          } catch (error) {
            if (!isNotGitRepositoryError(error)) throw error;
            await runCommand2("git", ["init"], { cwd: sourceCwd });
            gitRoot = await runCommandCapture("git", ["rev-parse", "--show-toplevel"], { cwd: sourceCwd });
          }
          const repoName = basename(gitRoot) || "repo";
          const worktreesRoot = join2(getCodexHomeDir2(), "worktrees");
          await mkdir2(worktreesRoot, { recursive: true });
          let worktreeId = "";
          let worktreeParent = "";
          let worktreeCwd = "";
          for (let attempt = 0; attempt < 12; attempt += 1) {
            const candidate = randomBytes(2).toString("hex");
            const parent = join2(worktreesRoot, candidate);
            try {
              await stat2(parent);
              continue;
            } catch {
              worktreeId = candidate;
              worktreeParent = parent;
              worktreeCwd = join2(parent, repoName);
              break;
            }
          }
          if (!worktreeId || !worktreeParent || !worktreeCwd) {
            throw new Error("Failed to allocate a unique worktree id");
          }
          const branch = `codex/${worktreeId}`;
          await mkdir2(worktreeParent, { recursive: true });
          try {
            await runCommand2("git", ["worktree", "add", "-b", branch, worktreeCwd, "HEAD"], { cwd: gitRoot });
          } catch (error) {
            if (!isMissingHeadError(error)) throw error;
            await ensureRepoHasInitialCommit(gitRoot);
            await runCommand2("git", ["worktree", "add", "-b", branch, worktreeCwd, "HEAD"], { cwd: gitRoot });
          }
          setJson2(res, 200, {
            data: {
              cwd: worktreeCwd,
              branch,
              gitRoot
            }
          });
        } catch (error) {
          setJson2(res, 500, { error: getErrorMessage2(error, "Failed to create worktree") });
        }
        return;
      }
      if (req.method === "PUT" && url.pathname === "/codex-api/workspace-roots-state") {
        const payload = await readJsonBody(req);
        const record = asRecord2(payload);
        if (!record) {
          setJson2(res, 400, { error: "Invalid body: expected object" });
          return;
        }
        const nextState = {
          order: normalizeStringArray(record.order),
          labels: normalizeStringRecord(record.labels),
          active: normalizeStringArray(record.active)
        };
        await writeWorkspaceRootsState(nextState);
        setJson2(res, 200, { ok: true });
        return;
      }
      if (req.method === "POST" && url.pathname === "/codex-api/project-root") {
        const payload = asRecord2(await readJsonBody(req));
        const rawPath = typeof payload?.path === "string" ? payload.path.trim() : "";
        const createIfMissing = payload?.createIfMissing === true;
        const label = typeof payload?.label === "string" ? payload.label : "";
        if (!rawPath) {
          setJson2(res, 400, { error: "Missing path" });
          return;
        }
        const normalizedPath = isAbsolute(rawPath) ? rawPath : resolve(rawPath);
        let pathExists = true;
        try {
          const info = await stat2(normalizedPath);
          if (!info.isDirectory()) {
            setJson2(res, 400, { error: "Path exists but is not a directory" });
            return;
          }
        } catch {
          pathExists = false;
        }
        if (!pathExists && createIfMissing) {
          await mkdir2(normalizedPath, { recursive: true });
        } else if (!pathExists) {
          setJson2(res, 404, { error: "Directory does not exist" });
          return;
        }
        const existingState = await readWorkspaceRootsState();
        const nextOrder = [normalizedPath, ...existingState.order.filter((item) => item !== normalizedPath)];
        const nextActive = [normalizedPath, ...existingState.active.filter((item) => item !== normalizedPath)];
        const nextLabels = { ...existingState.labels };
        if (label.trim().length > 0) {
          nextLabels[normalizedPath] = label.trim();
        }
        await writeWorkspaceRootsState({
          order: nextOrder,
          labels: nextLabels,
          active: nextActive
        });
        setJson2(res, 200, { data: { path: normalizedPath } });
        return;
      }
      if (req.method === "GET" && url.pathname === "/codex-api/project-root-suggestion") {
        const basePath = url.searchParams.get("basePath")?.trim() ?? "";
        if (!basePath) {
          setJson2(res, 400, { error: "Missing basePath" });
          return;
        }
        const normalizedBasePath = isAbsolute(basePath) ? basePath : resolve(basePath);
        try {
          const baseInfo = await stat2(normalizedBasePath);
          if (!baseInfo.isDirectory()) {
            setJson2(res, 400, { error: "basePath is not a directory" });
            return;
          }
        } catch {
          setJson2(res, 404, { error: "basePath does not exist" });
          return;
        }
        let index = 1;
        while (index < 1e5) {
          const candidateName = `New Project (${String(index)})`;
          const candidatePath = join2(normalizedBasePath, candidateName);
          try {
            await stat2(candidatePath);
            index += 1;
            continue;
          } catch {
            setJson2(res, 200, { data: { name: candidateName, path: candidatePath } });
            return;
          }
        }
        setJson2(res, 500, { error: "Failed to compute project name suggestion" });
        return;
      }
      if (req.method === "POST" && url.pathname === "/codex-api/composer-file-search") {
        const payload = asRecord2(await readJsonBody(req));
        const rawCwd = typeof payload?.cwd === "string" ? payload.cwd.trim() : "";
        const query = typeof payload?.query === "string" ? payload.query.trim() : "";
        const limitRaw = typeof payload?.limit === "number" ? payload.limit : 20;
        const limit = Math.max(1, Math.min(100, Math.floor(limitRaw)));
        if (!rawCwd) {
          setJson2(res, 400, { error: "Missing cwd" });
          return;
        }
        const cwd = isAbsolute(rawCwd) ? rawCwd : resolve(rawCwd);
        try {
          const info = await stat2(cwd);
          if (!info.isDirectory()) {
            setJson2(res, 400, { error: "cwd is not a directory" });
            return;
          }
        } catch {
          setJson2(res, 404, { error: "cwd does not exist" });
          return;
        }
        try {
          const files = await listFilesWithRipgrep(cwd);
          const scored = files.map((path) => ({ path, score: scoreFileCandidate(path, query) })).filter((row) => query.length === 0 || row.score < 10).sort((a, b) => a.score - b.score || a.path.localeCompare(b.path)).slice(0, limit).map((row) => ({ path: row.path }));
          setJson2(res, 200, { data: scored });
        } catch (error) {
          setJson2(res, 500, { error: getErrorMessage2(error, "Failed to search files") });
        }
        return;
      }
      if (req.method === "GET" && url.pathname === "/codex-api/thread-titles") {
        const cache = await readMergedThreadTitleCache();
        setJson2(res, 200, { data: cache });
        return;
      }
      if (req.method === "POST" && url.pathname === "/codex-api/thread-search") {
        const payload = asRecord2(await readJsonBody(req));
        const query = typeof payload?.query === "string" ? payload.query.trim() : "";
        const limitRaw = typeof payload?.limit === "number" ? payload.limit : 200;
        const limit = Math.max(1, Math.min(1e3, Math.floor(limitRaw)));
        if (!query) {
          setJson2(res, 200, { data: { threadIds: [], indexedThreadCount: 0 } });
          return;
        }
        const index = await getThreadSearchIndex();
        const matchedIds = Array.from(index.docsById.entries()).filter(([, doc]) => isExactPhraseMatch(query, doc)).slice(0, limit).map(([id]) => id);
        setJson2(res, 200, { data: { threadIds: matchedIds, indexedThreadCount: index.docsById.size } });
        return;
      }
      if (req.method === "PUT" && url.pathname === "/codex-api/thread-titles") {
        const payload = asRecord2(await readJsonBody(req));
        const id = typeof payload?.id === "string" ? payload.id : "";
        const title = typeof payload?.title === "string" ? payload.title : "";
        if (!id) {
          setJson2(res, 400, { error: "Missing id" });
          return;
        }
        const cache = await readThreadTitleCache();
        const next2 = title ? updateThreadTitleCache(cache, id, title) : removeFromThreadTitleCache(cache, id);
        await writeThreadTitleCache(next2);
        setJson2(res, 200, { ok: true });
        return;
      }
      if (req.method === "GET" && url.pathname === "/codex-api/events") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        const unsubscribe = middleware.subscribeNotifications((notification) => {
          if (res.writableEnded || res.destroyed) return;
          res.write(`data: ${JSON.stringify(notification)}

`);
        });
        res.write(`event: ready
data: ${JSON.stringify({ ok: true })}

`);
        const keepAlive = setInterval(() => {
          res.write(": ping\n\n");
        }, 15e3);
        const close = () => {
          clearInterval(keepAlive);
          unsubscribe();
          if (!res.writableEnded) {
            res.end();
          }
        };
        req.on("close", close);
        req.on("aborted", close);
        return;
      }
      next();
    } catch (error) {
      const message = getErrorMessage2(error, "Unknown bridge error");
      setJson2(res, 502, { error: message });
    }
  };
  middleware.dispose = () => {
    threadSearchIndex = null;
    appServer.dispose();
  };
  middleware.subscribeNotifications = (listener) => {
    return appServer.onNotification((notification) => {
      listener({
        ...notification,
        atIso: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  };
  return middleware;
}

// src/server/authMiddleware.ts
import { randomBytes as randomBytes2, timingSafeEqual } from "crypto";
var TOKEN_COOKIE = "codex_web_local_token";
function constantTimeCompare(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = value;
  }
  return cookies;
}
function isLocalhostRemote(remote) {
  return remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
}
function isLocalhostHost(host) {
  const normalized = host.toLowerCase();
  return normalized.startsWith("localhost:") || normalized === "localhost" || normalized.startsWith("127.0.0.1:");
}
function isAuthorizedByRequestLike(remoteAddress, hostHeader, cookieHeader, validTokens) {
  const remote = remoteAddress ?? "";
  if (isLocalhostRemote(remote) || isLocalhostHost(hostHeader ?? "")) {
    return true;
  }
  const cookies = parseCookies(cookieHeader);
  const token = cookies[TOKEN_COOKIE];
  return Boolean(token && validTokens.has(token));
}
var LOGIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Codex Web Local &mdash; Login</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem}
.card{background:#171717;border:1px solid #262626;border-radius:12px;padding:2rem;width:100%;max-width:380px}
h1{font-size:1.25rem;font-weight:600;margin-bottom:1.5rem;text-align:center;color:#fafafa}
label{display:block;font-size:.875rem;color:#a3a3a3;margin-bottom:.5rem}
input{width:100%;padding:.625rem .75rem;background:#0a0a0a;border:1px solid #404040;border-radius:8px;color:#fafafa;font-size:1rem;outline:none;transition:border-color .15s}
input:focus{border-color:#3b82f6}
button{width:100%;padding:.625rem;margin-top:1rem;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:.9375rem;font-weight:500;cursor:pointer;transition:background .15s}
button:hover{background:#2563eb}
.error{color:#ef4444;font-size:.8125rem;margin-top:.75rem;text-align:center;display:none}
</style>
</head>
<body>
<div class="card">
<h1>Codex Web Local</h1>
<form id="f">
<label for="pw">Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">Sign in</button>
<p class="error" id="err">Incorrect password</p>
</form>
</div>
<script>
const form=document.getElementById('f');
const errEl=document.getElementById('err');
form.addEventListener('submit',async e=>{
  e.preventDefault();
  errEl.style.display='none';
  const res=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});
  if(res.ok){window.location.reload()}else{errEl.style.display='block';document.getElementById('pw').value='';document.getElementById('pw').focus()}
});
</script>
</body>
</html>`;
function createAuthSession(password) {
  const validTokens = /* @__PURE__ */ new Set();
  const middleware = (req, res, next) => {
    if (isAuthorizedByRequestLike(req.socket.remoteAddress, req.headers.host, req.headers.cookie, validTokens)) {
      next();
      return;
    }
    if (req.method === "POST" && req.path === "/auth/login") {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const provided = typeof parsed.password === "string" ? parsed.password : "";
          if (!constantTimeCompare(provided, password)) {
            res.status(401).json({ error: "Invalid password" });
            return;
          }
          const token = randomBytes2(32).toString("hex");
          validTokens.add(token);
          res.setHeader("Set-Cookie", `${TOKEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict`);
          res.json({ ok: true });
        } catch {
          res.status(400).json({ error: "Invalid request body" });
        }
      });
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(LOGIN_PAGE_HTML);
  };
  return {
    middleware,
    isRequestAuthorized: (req) => isAuthorizedByRequestLike(req.socket.remoteAddress, req.headers.host, req.headers.cookie, validTokens)
  };
}

// src/server/localBrowseUi.ts
import { dirname, extname, join as join3 } from "path";
import { open, readFile as readFile3, readdir as readdir3, stat as stat3 } from "fs/promises";
var TEXT_EDITABLE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".txt",
  ".md",
  ".json",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".css",
  ".scss",
  ".html",
  ".htm",
  ".xml",
  ".yml",
  ".yaml",
  ".log",
  ".csv",
  ".env",
  ".py",
  ".sh",
  ".toml",
  ".ini",
  ".conf",
  ".sql",
  ".bat",
  ".cmd",
  ".ps1"
]);
function languageForPath(pathValue) {
  const extension = extname(pathValue).toLowerCase();
  switch (extension) {
    case ".js":
      return "javascript";
    case ".ts":
      return "typescript";
    case ".jsx":
      return "javascript";
    case ".tsx":
      return "typescript";
    case ".py":
      return "python";
    case ".sh":
      return "sh";
    case ".css":
    case ".scss":
      return "css";
    case ".html":
    case ".htm":
      return "html";
    case ".json":
      return "json";
    case ".md":
      return "markdown";
    case ".yaml":
    case ".yml":
      return "yaml";
    case ".xml":
      return "xml";
    case ".sql":
      return "sql";
    case ".toml":
      return "ini";
    case ".ini":
    case ".conf":
      return "ini";
    default:
      return "plaintext";
  }
}
function normalizeLocalPath(rawPath) {
  const trimmed = rawPath.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("file://")) {
    try {
      return decodeURIComponent(trimmed.replace(/^file:\/\//u, ""));
    } catch {
      return trimmed.replace(/^file:\/\//u, "");
    }
  }
  return trimmed;
}
function decodeBrowsePath(rawPath) {
  if (!rawPath) return "";
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}
function isTextEditablePath(pathValue) {
  return TEXT_EDITABLE_EXTENSIONS.has(extname(pathValue).toLowerCase());
}
function looksLikeTextBuffer(buffer) {
  if (buffer.length === 0) return true;
  for (const byte of buffer) {
    if (byte === 0) return false;
  }
  const decoded = buffer.toString("utf8");
  const replacementCount = (decoded.match(/\uFFFD/gu) ?? []).length;
  return replacementCount / decoded.length < 0.05;
}
async function probeFileIsText(localPath) {
  const handle = await open(localPath, "r");
  try {
    const sample = Buffer.allocUnsafe(4096);
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
    return looksLikeTextBuffer(sample.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}
async function isTextEditableFile(localPath) {
  if (isTextEditablePath(localPath)) return true;
  try {
    const fileStat = await stat3(localPath);
    if (!fileStat.isFile()) return false;
    return await probeFileIsText(localPath);
  } catch {
    return false;
  }
}
function escapeHtml(value) {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&#39;");
}
function toBrowseHref(pathValue) {
  return `/codex-local-browse${encodeURI(pathValue)}`;
}
function toEditHref(pathValue) {
  return `/codex-local-edit${encodeURI(pathValue)}`;
}
function escapeForInlineScriptString(value) {
  return JSON.stringify(value).replace(/<\//gu, "<\\/").replace(/<!--/gu, "<\\!--").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
}
async function getDirectoryItems(localPath) {
  const entries = await readdir3(localPath, { withFileTypes: true });
  const withMeta = await Promise.all(entries.map(async (entry) => {
    const entryPath = join3(localPath, entry.name);
    const entryStat = await stat3(entryPath);
    const editable = !entry.isDirectory() && await isTextEditableFile(entryPath);
    return {
      name: entry.name,
      path: entryPath,
      isDirectory: entry.isDirectory(),
      editable,
      mtimeMs: entryStat.mtimeMs
    };
  }));
  return withMeta.sort((a, b) => {
    if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs;
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}
async function createDirectoryListingHtml(localPath) {
  const items = await getDirectoryItems(localPath);
  const parentPath = dirname(localPath);
  const rows = items.map((item) => {
    const suffix = item.isDirectory ? "/" : "";
    const editAction = item.editable ? ` <a class="icon-btn" aria-label="Edit ${escapeHtml(item.name)}" href="${escapeHtml(toEditHref(item.path))}" title="Edit">\u270F\uFE0F</a>` : "";
    return `<li class="file-row"><a class="file-link" href="${escapeHtml(toBrowseHref(item.path))}">${escapeHtml(item.name)}${suffix}</a>${editAction}</li>`;
  }).join("\n");
  const parentLink = localPath !== parentPath ? `<p><a href="${escapeHtml(toBrowseHref(parentPath))}">..</a></p>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Index of ${escapeHtml(localPath)}</title>
  <style>
    body { font-family: ui-monospace, Menlo, Monaco, monospace; margin: 16px; background: #0b1020; color: #dbe6ff; }
    a { color: #8cc2ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 8px; }
    .file-row { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 10px; }
    .file-link { display: block; padding: 10px 12px; border: 1px solid #28405f; border-radius: 10px; background: #0f1b33; overflow-wrap: anywhere; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border: 1px solid #36557a; border-radius: 10px; background: #162643; text-decoration: none; }
    .icon-btn:hover { filter: brightness(1.08); text-decoration: none; }
    h1 { font-size: 18px; margin: 0; word-break: break-all; }
    @media (max-width: 640px) {
      body { margin: 12px; }
      .file-row { gap: 8px; }
      .file-link { font-size: 15px; padding: 12px; }
      .icon-btn { width: 44px; height: 44px; }
    }
  </style>
</head>
<body>
  <h1>Index of ${escapeHtml(localPath)}</h1>
  ${parentLink}
  <ul>${rows}</ul>
</body>
</html>`;
}
async function createTextEditorHtml(localPath) {
  const content = await readFile3(localPath, "utf8");
  const parentPath = dirname(localPath);
  const language = languageForPath(localPath);
  const safeContentLiteral = escapeForInlineScriptString(content);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Edit ${escapeHtml(localPath)}</title>
  <style>
    html, body { width: 100%; height: 100%; margin: 0; }
    body { font-family: ui-monospace, Menlo, Monaco, monospace; background: #0b1020; color: #dbe6ff; display: flex; flex-direction: column; overflow: hidden; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; background: #0b1020; border-bottom: 1px solid #243a5a; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    button, a { background: #1b2a4a; color: #dbe6ff; border: 1px solid #345; padding: 6px 10px; border-radius: 6px; text-decoration: none; cursor: pointer; }
    button:hover, a:hover { filter: brightness(1.08); }
    #editor { flex: 1 1 auto; min-height: 0; width: 100%; border: none; overflow: hidden; }
    #status { margin-left: 8px; color: #8cc2ff; }
    .ace_editor { background: #07101f !important; color: #dbe6ff !important; width: 100% !important; height: 100% !important; }
    .ace_gutter { background: #07101f !important; color: #6f8eb5 !important; }
    .ace_marker-layer .ace_active-line { background: #10213c !important; }
    .ace_marker-layer .ace_selection { background: rgba(140, 194, 255, 0.3) !important; }
    .meta { opacity: 0.9; font-size: 12px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="row">
      <a href="${escapeHtml(toBrowseHref(parentPath))}">Back</a>
      <button id="saveBtn" type="button">Save</button>
      <span id="status"></span>
    </div>
    <div class="meta">${escapeHtml(localPath)} \xB7 ${escapeHtml(language)}</div>
  </div>
  <div id="editor"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2/ace.js"></script>
  <script>
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    const editor = ace.edit('editor');
    editor.setTheme('ace/theme/tomorrow_night');
    editor.session.setMode('ace/mode/${escapeHtml(language)}');
    editor.setValue(${safeContentLiteral}, -1);
    editor.setOptions({
      fontSize: '13px',
      wrap: true,
      showPrintMargin: false,
      useSoftTabs: true,
      tabSize: 2,
      behavioursEnabled: true,
    });
    editor.resize();

    saveBtn.addEventListener('click', async () => {
      status.textContent = 'Saving...';
      const response = await fetch(location.pathname, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: editor.getValue(),
      });
      status.textContent = response.ok ? 'Saved' : 'Save failed';
    });
  </script>
</body>
</html>`;
}

// src/server/httpServer.ts
import { WebSocketServer } from "ws";
var __dirname = dirname2(fileURLToPath(import.meta.url));
var distDir = join4(__dirname, "..", "dist");
var spaEntryFile = join4(distDir, "index.html");
var IMAGE_CONTENT_TYPES = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};
function normalizeLocalImagePath(rawPath) {
  const trimmed = rawPath.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("file://")) {
    try {
      return decodeURIComponent(trimmed.replace(/^file:\/\//u, ""));
    } catch {
      return trimmed.replace(/^file:\/\//u, "");
    }
  }
  return trimmed;
}
function readWildcardPathParam(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join("/");
  return "";
}
function createServer(options = {}) {
  const app = express();
  const bridge = createCodexBridgeMiddleware();
  const authSession = options.password ? createAuthSession(options.password) : null;
  if (authSession) {
    app.use(authSession.middleware);
  }
  app.use(bridge);
  app.get("/codex-local-image", (req, res) => {
    const rawPath = typeof req.query.path === "string" ? req.query.path : "";
    const localPath = normalizeLocalImagePath(rawPath);
    if (!localPath || !isAbsolute2(localPath)) {
      res.status(400).json({ error: "Expected absolute local file path." });
      return;
    }
    const contentType = IMAGE_CONTENT_TYPES[extname2(localPath).toLowerCase()];
    if (!contentType) {
      res.status(415).json({ error: "Unsupported image type." });
      return;
    }
    res.type(contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.sendFile(localPath, { dotfiles: "allow" }, (error) => {
      if (!error) return;
      if (!res.headersSent) res.status(404).json({ error: "Image file not found." });
    });
  });
  app.get("/codex-local-file", (req, res) => {
    const rawPath = typeof req.query.path === "string" ? req.query.path : "";
    const localPath = normalizeLocalPath(rawPath);
    if (!localPath || !isAbsolute2(localPath)) {
      res.status(400).json({ error: "Expected absolute local file path." });
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(localPath, { dotfiles: "allow" }, (error) => {
      if (!error) return;
      if (!res.headersSent) res.status(404).json({ error: "File not found." });
    });
  });
  app.get("/codex-local-browse/*path", async (req, res) => {
    const rawPath = readWildcardPathParam(req.params.path);
    const localPath = decodeBrowsePath(`/${rawPath}`);
    if (!localPath || !isAbsolute2(localPath)) {
      res.status(400).json({ error: "Expected absolute local file path." });
      return;
    }
    try {
      const fileStat = await stat4(localPath);
      res.setHeader("Cache-Control", "private, no-store");
      if (fileStat.isDirectory()) {
        const html = await createDirectoryListingHtml(localPath);
        res.status(200).type("text/html; charset=utf-8").send(html);
        return;
      }
      res.sendFile(localPath, { dotfiles: "allow" }, (error) => {
        if (!error) return;
        if (!res.headersSent) res.status(404).json({ error: "File not found." });
      });
    } catch {
      res.status(404).json({ error: "File not found." });
    }
  });
  app.get("/codex-local-edit/*path", async (req, res) => {
    const rawPath = readWildcardPathParam(req.params.path);
    const localPath = decodeBrowsePath(`/${rawPath}`);
    if (!localPath || !isAbsolute2(localPath)) {
      res.status(400).json({ error: "Expected absolute local file path." });
      return;
    }
    try {
      const fileStat = await stat4(localPath);
      if (!fileStat.isFile()) {
        res.status(400).json({ error: "Expected file path." });
        return;
      }
      const html = await createTextEditorHtml(localPath);
      res.status(200).type("text/html; charset=utf-8").send(html);
    } catch {
      res.status(404).json({ error: "File not found." });
    }
  });
  app.put("/codex-local-edit/*path", express.text({ type: "*/*", limit: "10mb" }), async (req, res) => {
    const rawPath = readWildcardPathParam(req.params.path);
    const localPath = decodeBrowsePath(`/${rawPath}`);
    if (!localPath || !isAbsolute2(localPath)) {
      res.status(400).json({ error: "Expected absolute local file path." });
      return;
    }
    if (!await isTextEditableFile(localPath)) {
      res.status(415).json({ error: "Only text-like files are editable." });
      return;
    }
    const body = typeof req.body === "string" ? req.body : "";
    try {
      await writeFile3(localPath, body, "utf8");
      res.status(200).json({ ok: true });
    } catch {
      res.status(404).json({ error: "File not found." });
    }
  });
  const hasFrontendAssets = existsSync3(spaEntryFile);
  if (hasFrontendAssets) {
    app.use(express.static(distDir));
  }
  app.use((_req, res) => {
    if (!hasFrontendAssets) {
      res.status(503).type("text/plain").send(
        [
          "Codex web UI assets are missing.",
          `Expected: ${spaEntryFile}`,
          "If running from source, build frontend assets with: npm run build:frontend",
          "If running with npx, clear the npx cache and reinstall codexapp."
        ].join("\n")
      );
      return;
    }
    res.sendFile(spaEntryFile, (error) => {
      if (!error) return;
      if (!res.headersSent) {
        res.status(404).type("text/plain").send("Frontend entry file not found.");
      }
    });
  });
  return {
    app,
    dispose: () => bridge.dispose(),
    attachWebSocket: (server) => {
      const wss = new WebSocketServer({ noServer: true });
      server.on("upgrade", (req, socket, head) => {
        const url = new URL(req.url ?? "", "http://localhost");
        if (url.pathname !== "/codex-api/ws") {
          return;
        }
        if (authSession && !authSession.isRequestAuthorized(req)) {
          socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
          socket.destroy();
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      });
      wss.on("connection", (ws) => {
        ws.send(JSON.stringify({ method: "ready", params: { ok: true }, atIso: (/* @__PURE__ */ new Date()).toISOString() }));
        const unsubscribe = bridge.subscribeNotifications((notification) => {
          if (ws.readyState !== 1) return;
          ws.send(JSON.stringify(notification));
        });
        ws.on("close", unsubscribe);
        ws.on("error", unsubscribe);
      });
    }
  };
}

// src/server/password.ts
import { randomInt } from "crypto";
var CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
function randomGroup(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[randomInt(CHARS.length)];
  }
  return result;
}
function generatePassword() {
  return `${randomGroup(3)}-${randomGroup(3)}-${randomGroup(3)}`;
}

// src/cli/index.ts
var program = new Command().name("codexui").description("Web interface for Codex app-server");
var __dirname2 = dirname3(fileURLToPath2(import.meta.url));
async function readCliVersion() {
  try {
    const packageJsonPath = join5(__dirname2, "..", "package.json");
    const raw = await readFile4(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed.version === "string" ? parsed.version : "unknown";
  } catch {
    return "unknown";
  }
}
function isTermuxRuntime() {
  return Boolean(process.env.TERMUX_VERSION || process.env.PREFIX?.includes("/com.termux/"));
}
function canRun(command, args = []) {
  const result = spawnSync(command, args, { stdio: "ignore" });
  return result.status === 0;
}
function runOrFail(command, args, label) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${String(result.status ?? -1)}`);
  }
}
function runWithStatus(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  return result.status ?? -1;
}
function getUserNpmPrefix() {
  return join5(homedir3(), ".npm-global");
}
function resolveCodexCommand() {
  if (canRun("codex", ["--version"])) {
    return "codex";
  }
  const userCandidate = join5(getUserNpmPrefix(), "bin", "codex");
  if (existsSync4(userCandidate) && canRun(userCandidate, ["--version"])) {
    return userCandidate;
  }
  const prefix = process.env.PREFIX?.trim();
  if (!prefix) {
    return null;
  }
  const candidate = join5(prefix, "bin", "codex");
  if (existsSync4(candidate) && canRun(candidate, ["--version"])) {
    return candidate;
  }
  return null;
}
function resolveCloudflaredCommand() {
  if (canRun("cloudflared", ["--version"])) {
    return "cloudflared";
  }
  const localCandidate = join5(homedir3(), ".local", "bin", "cloudflared");
  if (existsSync4(localCandidate) && canRun(localCandidate, ["--version"])) {
    return localCandidate;
  }
  return null;
}
function mapCloudflaredLinuxArch(arch) {
  if (arch === "x64") {
    return "amd64";
  }
  if (arch === "arm64") {
    return "arm64";
  }
  return null;
}
function downloadFile(url, destination) {
  return new Promise((resolve2, reject) => {
    const request = (currentUrl) => {
      httpsGet(currentUrl, (response) => {
        const code = response.statusCode ?? 0;
        if (code >= 300 && code < 400 && response.headers.location) {
          response.resume();
          request(response.headers.location);
          return;
        }
        if (code !== 200) {
          response.resume();
          reject(new Error(`Download failed with HTTP status ${String(code)}`));
          return;
        }
        const file = createWriteStream(destination, { mode: 493 });
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve2();
        });
        file.on("error", reject);
      }).on("error", reject);
    };
    request(url);
  });
}
async function ensureCloudflaredInstalledLinux() {
  const current = resolveCloudflaredCommand();
  if (current) {
    return current;
  }
  if (process.platform !== "linux") {
    return null;
  }
  const mappedArch = mapCloudflaredLinuxArch(process.arch);
  if (!mappedArch) {
    throw new Error(`cloudflared auto-install is not supported for Linux architecture: ${process.arch}`);
  }
  const userBinDir = join5(homedir3(), ".local", "bin");
  mkdirSync(userBinDir, { recursive: true });
  const destination = join5(userBinDir, "cloudflared");
  const downloadUrl = `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${mappedArch}`;
  console.log("\ncloudflared not found. Installing to ~/.local/bin...\n");
  await downloadFile(downloadUrl, destination);
  chmodSync(destination, 493);
  process.env.PATH = `${userBinDir}:${process.env.PATH ?? ""}`;
  const installed = resolveCloudflaredCommand();
  if (!installed) {
    throw new Error("cloudflared download completed but executable is still not available");
  }
  console.log("\ncloudflared installed.\n");
  return installed;
}
async function shouldInstallCloudflaredInteractively() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.warn("\n[cloudflared] cloudflared is missing and terminal is non-interactive, skipping install.");
    return false;
  }
  const prompt = createInterface2({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question("cloudflared is not installed. Install it now to ~/.local/bin? [y/N] ");
    const normalized = answer.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
  } finally {
    prompt.close();
  }
}
async function resolveCloudflaredForTunnel() {
  const current = resolveCloudflaredCommand();
  if (current) {
    return current;
  }
  const installApproved = await shouldInstallCloudflaredInteractively();
  if (!installApproved) {
    return null;
  }
  return ensureCloudflaredInstalledLinux();
}
function hasCodexAuth() {
  const codexHome = process.env.CODEX_HOME?.trim() || join5(homedir3(), ".codex");
  return existsSync4(join5(codexHome, "auth.json"));
}
function ensureCodexInstalled() {
  let codexCommand = resolveCodexCommand();
  if (!codexCommand) {
    const installWithFallback = (pkg, label) => {
      const status = runWithStatus("npm", ["install", "-g", pkg]);
      if (status === 0) {
        return;
      }
      if (isTermuxRuntime()) {
        throw new Error(`${label} failed with exit code ${String(status)}`);
      }
      const userPrefix = getUserNpmPrefix();
      console.log(`
Global npm install requires elevated permissions. Retrying with --prefix ${userPrefix}...
`);
      runOrFail("npm", ["install", "-g", "--prefix", userPrefix, pkg], `${label} (user prefix)`);
      process.env.PATH = `${join5(userPrefix, "bin")}:${process.env.PATH ?? ""}`;
    };
    if (isTermuxRuntime()) {
      console.log("\nCodex CLI not found. Installing Termux-compatible Codex CLI from npm...\n");
      installWithFallback("@mmmbuto/codex-cli-termux", "Codex CLI install");
      codexCommand = resolveCodexCommand();
      if (!codexCommand) {
        console.log("\nTermux npm package did not expose `codex`. Installing official CLI fallback...\n");
        installWithFallback("@openai/codex", "Codex CLI fallback install");
      }
    } else {
      console.log("\nCodex CLI not found. Installing official Codex CLI from npm...\n");
      installWithFallback("@openai/codex", "Codex CLI install");
    }
    codexCommand = resolveCodexCommand();
    if (!codexCommand && !isTermuxRuntime()) {
      throw new Error("Official Codex CLI install completed but binary is still not available in PATH");
    }
    if (!codexCommand && isTermuxRuntime()) {
      codexCommand = resolveCodexCommand();
    }
    if (!codexCommand) {
      throw new Error("Codex CLI install completed but binary is still not available in PATH");
    }
    console.log("\nCodex CLI installed.\n");
  }
  return codexCommand;
}
function resolvePassword(input) {
  if (input === false) {
    return void 0;
  }
  if (typeof input === "string") {
    return input;
  }
  return generatePassword();
}
function printTermuxKeepAlive(lines) {
  if (!isTermuxRuntime()) {
    return;
  }
  lines.push("");
  lines.push("  Android/Termux keep-alive:");
  lines.push("  1) Keep this Termux session open (do not swipe it away).");
  lines.push("  2) Disable battery optimization for Termux in Android settings.");
  lines.push("  3) Optional: run `termux-wake-lock` in another shell.");
}
function openBrowser(url) {
  const command = process.platform === "darwin" ? { cmd: "open", args: [url] } : process.platform === "win32" ? { cmd: "cmd", args: ["/c", "start", "", url] } : { cmd: "xdg-open", args: [url] };
  const child = spawn3(command.cmd, command.args, { detached: true, stdio: "ignore" });
  child.on("error", () => {
  });
  child.unref();
}
function parseCloudflaredUrl(chunk) {
  const urlMatch = chunk.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g);
  if (!urlMatch || urlMatch.length === 0) {
    return null;
  }
  return urlMatch[urlMatch.length - 1] ?? null;
}
function getAccessibleUrls(port) {
  const urls = /* @__PURE__ */ new Set([`http://localhost:${String(port)}`]);
  const interfaces = networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) {
      continue;
    }
    for (const entry of entries) {
      if (entry.internal) {
        continue;
      }
      if (entry.family === "IPv4") {
        urls.add(`http://${entry.address}:${String(port)}`);
      }
    }
  }
  return Array.from(urls);
}
async function startCloudflaredTunnel(command, localPort) {
  return new Promise((resolve2, reject) => {
    const child = spawn3(command, ["tunnel", "--url", `http://localhost:${String(localPort)}`], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Timed out waiting for cloudflared tunnel URL"));
    }, 2e4);
    const handleData = (value) => {
      const text = String(value);
      const parsedUrl = parseCloudflaredUrl(text);
      if (!parsedUrl) {
        return;
      }
      clearTimeout(timeout);
      child.stdout?.off("data", handleData);
      child.stderr?.off("data", handleData);
      resolve2({ process: child, url: parsedUrl });
    };
    const onError = (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start cloudflared: ${error.message}`));
    };
    child.once("error", onError);
    child.stdout?.on("data", handleData);
    child.stderr?.on("data", handleData);
    child.once("exit", (code) => {
      if (code === 0) {
        return;
      }
      clearTimeout(timeout);
      reject(new Error(`cloudflared exited before providing a URL (code ${String(code)})`));
    });
  });
}
function listenWithFallback(server, startPort) {
  return new Promise((resolve2, reject) => {
    const attempt = (port) => {
      const onError = (error) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE" || error.code === "EACCES") {
          attempt(port + 1);
          return;
        }
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve2(port);
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, "0.0.0.0");
    };
    attempt(startPort);
  });
}
async function startServer(options) {
  const version = await readCliVersion();
  const codexCommand = ensureCodexInstalled() ?? resolveCodexCommand();
  if (!hasCodexAuth() && codexCommand) {
    console.log("\nCodex is not logged in. Starting `codex login`...\n");
    runOrFail(codexCommand, ["login"], "Codex login");
  }
  const requestedPort = parseInt(options.port, 10);
  const password = resolvePassword(options.password);
  const { app, dispose, attachWebSocket } = createServer({ password });
  const server = createServer2(app);
  attachWebSocket(server);
  const port = await listenWithFallback(server, requestedPort);
  let tunnelChild = null;
  let tunnelUrl = null;
  if (options.tunnel) {
    try {
      const cloudflaredCommand = await resolveCloudflaredForTunnel();
      if (!cloudflaredCommand) {
        throw new Error("cloudflared is not installed");
      }
      const tunnel = await startCloudflaredTunnel(cloudflaredCommand, port);
      tunnelChild = tunnel.process;
      tunnelUrl = tunnel.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`
[cloudflared] Tunnel not started: ${message}`);
    }
  }
  const lines = [
    "",
    "Codex Web Local is running!",
    `  Version:  ${version}`,
    "  GitHub:   https://github.com/friuns2/codexui",
    "",
    `  Bind:     http://0.0.0.0:${String(port)}`
  ];
  const accessUrls = getAccessibleUrls(port);
  if (accessUrls.length > 0) {
    lines.push(`  Local:    ${accessUrls[0]}`);
    for (const accessUrl of accessUrls.slice(1)) {
      lines.push(`  Network:  ${accessUrl}`);
    }
  }
  if (port !== requestedPort) {
    lines.push(`  Requested port ${String(requestedPort)} was unavailable; using ${String(port)}.`);
  }
  if (password) {
    lines.push(`  Password: ${password}`);
  }
  if (tunnelUrl) {
    lines.push(`  Tunnel:   ${tunnelUrl}`);
    lines.push("  Tunnel QR code below");
  }
  printTermuxKeepAlive(lines);
  lines.push("");
  console.log(lines.join("\n"));
  if (tunnelUrl) {
    qrcode.generate(tunnelUrl, { small: true });
    console.log("");
  }
  openBrowser(`http://localhost:${String(port)}`);
  function shutdown() {
    console.log("\nShutting down...");
    if (tunnelChild && !tunnelChild.killed) {
      tunnelChild.kill("SIGTERM");
    }
    server.close(() => {
      dispose();
      process.exit(0);
    });
    setTimeout(() => {
      dispose();
      process.exit(1);
    }, 5e3).unref();
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
async function runLogin() {
  const codexCommand = ensureCodexInstalled() ?? "codex";
  console.log("\nStarting `codex login`...\n");
  runOrFail(codexCommand, ["login"], "Codex login");
}
program.option("-p, --port <port>", "port to listen on", "5999").option("--password <pass>", "set a specific password").option("--no-password", "disable password protection").option("--tunnel", "start cloudflared tunnel", true).option("--no-tunnel", "disable cloudflared tunnel startup").action(async (opts) => {
  await startServer(opts);
});
program.command("login").description("Install/check Codex CLI and run `codex login`").action(runLogin);
program.command("help").description("Show codexui command help").action(() => {
  program.outputHelp();
});
program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`
Failed to run codexui: ${message}`);
  process.exit(1);
});
//# sourceMappingURL=index.js.map