#!/usr/bin/env node

/**
 * Dependency update script with 7-day minimum release age policy.
 *
 * Usage:
 *   node scripts/deps-update.mjs          # dry-run (default)
 *   node scripts/deps-update.mjs --apply  # actually update
 *   node scripts/deps-update.mjs --days 3 # custom age threshold
 */

import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = !args.includes("--apply");
const daysFlag = args.indexOf("--days");
const MIN_AGE_DAYS = daysFlag !== -1 ? Number(args[daysFlag + 1]) : 7;
const NOW = Date.now();
const MS_PER_DAY = 86_400_000;
const MIN_AGE_MS = MIN_AGE_DAYS * MS_PER_DAY;

// ── 1. Collect outdated packages ──

let outdated;
try {
  const raw = execSync("pnpm outdated -r --json", { encoding: "utf-8" });
  outdated = JSON.parse(raw);
} catch (e) {
  // pnpm outdated exits with code 1 when there ARE outdated deps
  if (e.stdout) {
    outdated = JSON.parse(e.stdout);
  } else {
    console.log("All dependencies are up to date.");
    process.exit(0);
  }
}

const pkgNames = Object.keys(outdated);
if (pkgNames.length === 0) {
  console.log("All dependencies are up to date.");
  process.exit(0);
}

console.log(`Found ${pkgNames.length} outdated package(s). Checking publish dates...\n`);

// ── 2. Check publish dates and find safe versions ──

const safe = []; // non-major, >= MIN_AGE_DAYS old
const safeMajor = []; // major update, >= MIN_AGE_DAYS old
const upToDate = []; // already on the best safe version

for (const name of pkgNames) {
  const { current, latest } = outdated[name];
  if (current === latest) continue;

  let times;
  try {
    const timeJson = execSync(`npm view ${name} time --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    times = JSON.parse(timeJson);
  } catch {
    console.log(`  ⚠ Could not fetch publish date for ${name}, skipping`);
    continue;
  }

  // Find the newest version that is >= MIN_AGE_DAYS old and newer than current
  const targetVersion = findSafeVersion(times, current);

  if (!targetVersion) {
    upToDate.push({ name, current, latest, latestAgeDays: ageDays(times[latest]) });
    continue;
  }

  const isMajor = major(current) !== major(targetVersion);
  const entry = {
    name,
    current,
    target: targetVersion,
    latest,
    targetAgeDays: ageDays(times[targetVersion]),
    isLatest: targetVersion === latest,
  };

  if (isMajor) {
    safeMajor.push(entry);
  } else {
    safe.push(entry);
  }
}

// ── 3. Report ──

if (safe.length > 0) {
  console.log(`✅ Safe to update (>= ${MIN_AGE_DAYS} days old, non-major):`);
  for (const p of safe) {
    const latestNote = p.isLatest ? "" : `  (latest: ${p.latest})`;
    console.log(`   ${p.name}  ${p.current} → ${p.target}  (${p.targetAgeDays}d)${latestNote}`);
  }
  console.log();
}

if (safeMajor.length > 0) {
  console.log(`⚠️  Major updates (>= ${MIN_AGE_DAYS} days old, requires manual review):`);
  for (const p of safeMajor) {
    const latestNote = p.isLatest ? "" : `  (latest: ${p.latest})`;
    console.log(`   ${p.name}  ${p.current} → ${p.target}  (${p.targetAgeDays}d)${latestNote}`);
  }
  console.log();
}

if (upToDate.length > 0) {
  console.log(`🕐 No safe version yet (all newer versions < ${MIN_AGE_DAYS} days old):`);
  for (const p of upToDate) {
    console.log(`   ${p.name}  ${p.current}  (latest: ${p.latest}, ${p.latestAgeDays}d)`);
  }
  console.log();
}

// ── 4. Apply non-major updates ──

if (safe.length === 0) {
  console.log("No non-major updates to apply.");
  process.exit(0);
}

if (dryRun) {
  console.log("Dry run complete. Run with --apply to update.");
  process.exit(0);
}

console.log("Applying updates...\n");

const updateTargets = safe.map((p) => `${p.name}@${p.target}`).join(" ");
try {
  execSync(`pnpm update -r ${updateTargets}`, { stdio: "inherit" });
  console.log("\n✅ Updates applied. Run `pnpm install` and test your project.");
} catch {
  console.error("\n❌ Update failed. Check errors above.");
  process.exit(1);
}

// ── Helpers ──

function major(version) {
  return version.split(".")[0];
}

function ageDays(isoDate) {
  return Math.floor((NOW - new Date(isoDate).getTime()) / MS_PER_DAY);
}

/**
 * Find the newest published version that is:
 *  - newer than `current`
 *  - at least MIN_AGE_DAYS old
 * Skips non-release versions (pre-release tags like alpha, beta, rc).
 */
function findSafeVersion(times, current) {
  const SEMVER_RE = /^\d+\.\d+\.\d+$/;
  const candidates = Object.entries(times)
    .filter(([v]) => SEMVER_RE.test(v))
    .filter(([v]) => compareVersions(v, current) > 0)
    .filter(([, date]) => NOW - new Date(date).getTime() >= MIN_AGE_MS)
    .sort(([a], [b]) => compareVersions(b, a)); // newest first

  return candidates.length > 0 ? candidates[0][0] : null;
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
