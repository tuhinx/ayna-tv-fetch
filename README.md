# m3u-to-json

Convert M3U/M3U8 playlists to JSON with a Node.js CLI. Supports filtering by ids, manual referer/origin, output folders, and building both unfiltered and filtered outputs.

### Quick start
```
node bin/m3u-to-json.js --url https://github.com/abusaeeidx/Ayna-Playlists-free-Version/blob/main/playlist.m3u --out-dir output --out api.json
```

### Options
```
m3u-to-json

Usage:
  m3u-to-json --url <url> [--out file.json] [--out-filter filtered.json] [--write-both] [--out-dir dir] [--minify] [--filter sports.json] [--ids id1,id2] [--from-json api.json] [--referer v|null] [--origin v|null]
  m3u-to-json --file <path.m3u8> [--out file.json] [--out-filter filtered.json] [--write-both] [--out-dir dir] [--minify] [--filter sports.json] [--ids id1,id2] [--from-json api.json] [--referer v|null] [--origin v|null]
  m3u-to-json --help

Options:
  -u, --url               URL to M3U/M3U8 (GitHub blob auto-converted to raw)
  -f, --file              Local M3U/M3U8 file path
      --from-json <file>  Use existing api.json as input to filter (skip M3U)
  -o, --out               Output JSON filename (default: api.json)
      --out-filter <file> Filename for filtered output (default: filtered.json when --write-both)
      --write-both        Write both unfiltered and filtered outputs
      --out-dir <dir>     Output directory (created if missing)
      --stdout            Print JSON to stdout instead of file
      --filter <file>     JSON/JS file of allowed ids (array of strings or objects with id)
      --ids id1,id2       Comma-separated ids to include
      --referer <v|null>  Set referer; 'null' disables auto
      --origin  <v|null>  Set origin; 'null' disables auto
  -m, --minify            Minify JSON output
  -h, --help              Show help
```

### Examples
- Unfiltered to folder (default name):
```
node bin/m3u-to-json.js --url <url> --out-dir output
```
- Filter by ids and write both files:
```
node bin/m3u-to-json.js --url <url> --ids banglavision,rtv --write-both --out-dir output --out api.json --out-filter filtered.json
```
- Use a JS filter file (preferred location: `src/filter.js`):
```javascript
// src/filter.js
export default ['tsportshd', 'dubaisports1'];
```
```
node bin/m3u-to-json.js --url <url> --filter src/filter.js --write-both --out-dir output
```
- Force manual headers:
```
node bin/m3u-to-json.js --url <url> --referer https://example.com --origin https://example.com --out-dir output
```
- Disable auto for headers:
```
node bin/m3u-to-json.js --url <url> --referer null --origin null --out-dir output
```
- Build filtered from an existing api.json:
```
node bin/m3u-to-json.js --from-json output/api.json --filter src/filter.js --out-dir output --out-filter filtered.json
```

### Stable ids and names
- id is a lowercase alphanumeric slug from the channel name (e.g., "Bangla Vision" -> "banglavision").
- Entries with the same id share one canonical name and the output is stable and ordered.

### Project defaults (code-level)
In `src/index.js` you can set global defaults:
```
const DEFAULT_REFERER = undefined; // string, null, or undefined
const DEFAULT_ORIGIN = undefined;  // string, null, or undefined
```
- string: forces that value
- null: forces null (no auto)
- undefined: auto (unless overridden by CLI)

### Build locally
```
npm run build:json
```
Outputs to `output/api.json` and `output/filtered.json` using `src/filter.js`.

### GitHub Actions (hourly)
Workflow: `.github/workflows/build-json.yml`

Secrets (in the workflow repo):
- `PLAYLIST_URL` (required): private playlist URL
- `PLAYLIST_REFERER` (optional)
- `PLAYLIST_ORIGIN` (optional)

The workflow builds into `output/` and commits the files. It can also push to another private repo if you set:
- `TARGET_REPO` (e.g., owner/other-repo)
- `TARGET_TOKEN` (PAT with repo scope)
- `TARGET_BRANCH` (e.g., main)
- `TARGET_DIR` (subfolder in target repo, e.g., public or .)
