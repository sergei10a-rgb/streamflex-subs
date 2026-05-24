#!/usr/bin/env node
// Walks movies/* and tv/*/* leaf directories. For each leaf, reads all
// {sha8}.json metadata files and emits index.json with [{sha8, sha256,
// model, translated_at}] sorted newest-first.

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function* leafTitleDirs(rootDir, depth) {
  // movies/ has depth 1 (movies/<tmdbId>)
  // tv/    has depth 2 (tv/<tmdbId>/<s..e..>)
  if (!fs.existsSync(rootDir)) return;
  function walk(dir, level) {
    if (level === depth) {
      yieldDir(dir);
      return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name), level + 1);
    }
  }
  const collected = [];
  function yieldDir(d) { collected.push(d); }
  walk(rootDir, 0);
  for (const d of collected) yield d;
}

function regenIndex(dir) {
  const subs = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    if (entry === "index.json") continue;
    const sha8 = entry.replace(/\.json$/, "");
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, entry), "utf8"));
      subs.push({
        sha8,
        sha256: meta.sha256,
        model: meta.model,
        translated_at: meta.translated_at,
      });
    } catch (e) {
      console.error(`Skipping ${entry}: ${e.message}`);
    }
  }
  // Newest first
  subs.sort((a, b) => (a.translated_at < b.translated_at ? 1 : -1));

  const rel = path.relative(ROOT, dir).replace(/\\/g, "/");
  const parts = rel.split("/");
  const mediaType = parts[0] === "movies" ? "movie" : "tv";
  const tmdbId = Number(parts[1]);

  const index = { tmdb_id: tmdbId, media_type: mediaType, subs };
  const idxPath = path.join(dir, "index.json");
  fs.writeFileSync(idxPath, JSON.stringify(index, null, 2) + "\n");
  console.log(`Regenerated ${rel}/index.json (${subs.length} sub(s))`);
}

let count = 0;
for (const dir of leafTitleDirs(path.join(ROOT, "movies"), 1)) {
  regenIndex(dir);
  count++;
}
for (const dir of leafTitleDirs(path.join(ROOT, "tv"), 2)) {
  regenIndex(dir);
  count++;
}
console.log(`\nProcessed ${count} title directory/ies.`);
