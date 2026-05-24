# Streamflex Community Subtitles

Community-sourced Mongolian subtitle translations for [Streamflex](https://github.com/sergei10a-rgb/Sflex).

## What is this?

Streamflex translates English subtitles to Mongolian via Claude on first play. When that translation succeeds, the app uploads the result here anonymously via a bot account, so the next user gets the translation instantly without paying the API cost or waiting.

## Repository layout

```
movies/{tmdb_id}/{sha8}.srt        → translated SRT
movies/{tmdb_id}/{sha8}.json       → metadata (model, translated_at, sha256, app_version)
movies/{tmdb_id}/index.json        → auto-regenerated list, newest first

tv/{tmdb_id}/s{NN}e{NN}/{sha8}.srt
tv/{tmdb_id}/s{NN}e{NN}/{sha8}.json
tv/{tmdb_id}/s{NN}e{NN}/index.json
```

`sha8` = first 8 hex chars of `sha256(srtContent)`. Multiple translations per title are kept — newer wins by default in the client.

## Validation + index regeneration

Every push to `movies/**` or `tv/**` triggers `.github/workflows/regen-index.yml`:

1. `scripts/validate-subs.js` removes invalid uploads (size > 200 KB, < 5 cues, schema violations, sha mismatch).
2. `scripts/regen-indexes.js` rebuilds every per-title `index.json` from the surviving `.json` metadata files.

## Privacy

The app uploads only the translated SRT + metadata. No usernames, IPs, or session info. All commits authored by a single bot account.

## License

GPL-3.0, matching Streamflex.
