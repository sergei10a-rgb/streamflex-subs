#!/usr/bin/env node
// Validate every {sha8}.srt + {sha8}.json pair under movies/ and tv/.
// Removes invalid pairs in place. Logs to stdout. Exit 0 always.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = process.cwd();
const MAX_SIZE = 200 * 1024;
const MIN_CUES = 5;
const REQUIRED_META = [
  "tmdb_id",
  "media_type",
  "sha256",
  "model",
];
// A date key is required, but accept EITHER `translated_at` (older app builds /
// heal script) OR `translated_at_day` (the privacy-day key all current clients —
// daemon pool.js, desktop ipc, mobile backend — write). Requiring only
// `translated_at` silently deleted every modern upload, leaving empty indexes.
function hasDateKey(meta) {
  return "translated_at" in meta || "translated_at_day" in meta;
}

const deletions = [];

function walkLeafFiles(dir, onSrtFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkLeafFiles(full, onSrtFile);
    else if (entry.name.endsWith(".srt")) onSrtFile(full);
  }
}

function validatePair(srtPath) {
  const jsonPath = srtPath.replace(/\.srt$/, ".json");
  const errors = [];
  try {
    const stat = fs.statSync(srtPath);
    if (stat.size > MAX_SIZE) {
      errors.push(`size ${stat.size} > ${MAX_SIZE}`);
    }
    const srt = fs.readFileSync(srtPath, "utf8");
    const cueCount = (srt.match(/-->/g) || []).length;
    if (cueCount < MIN_CUES) errors.push(`only ${cueCount} cues (min ${MIN_CUES})`);
    if (!fs.existsSync(jsonPath)) {
      errors.push("metadata file missing");
    } else {
      const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      for (const k of REQUIRED_META) {
        if (!(k in meta)) errors.push(`meta missing required key '${k}'`);
      }
      if (!hasDateKey(meta)) {
        errors.push("meta missing date (translated_at or translated_at_day)");
      }
      if (typeof meta.sha256 === "string") {
        const actualSha = crypto.createHash("sha256").update(srt).digest("hex");
        if (meta.sha256 !== actualSha) {
          errors.push(`sha256 mismatch (meta=${meta.sha256.slice(0, 8)} actual=${actualSha.slice(0, 8)})`);
        }
      }
    }
  } catch (e) {
    errors.push(`exception: ${e.message}`);
  }
  if (errors.length) {
    console.error(`INVALID ${path.relative(ROOT, srtPath)}: ${errors.join("; ")}`);
    try { fs.unlinkSync(srtPath); } catch {}
    try { if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath); } catch {}
    deletions.push(path.relative(ROOT, srtPath));
  }
}

walkLeafFiles(path.join(ROOT, "movies"), validatePair);
walkLeafFiles(path.join(ROOT, "tv"), validatePair);

if (deletions.length) {
  console.log(`\nDeleted ${deletions.length} invalid file pair(s):`);
  deletions.forEach((d) => console.log(`  - ${d}`));
} else {
  console.log("All files valid.");
}
