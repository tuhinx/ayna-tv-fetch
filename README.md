# ayna-tv-fetch (m3u-to-json)

Convert M3U/M3U8 playlists to JSON with a Node.js CLI. Includes filtering, manual referer/origin, output folders, stable ids/names, and CI automation through a separate auto-update repo.

## Quick start
```
node bin/m3u-to-json.js --url https://github.com/abusaeeidx/Ayna-Playlists-free-Version/blob/main/playlist.m3u --out-dir output --out api.json
```

## CLI usage
```
m3u-to-json


## Examples
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

## Stable ids and names
- id is a lowercase alphanumeric slug from the channel name (e.g., "Bangla Vision" -> "banglavision").
- Entries with the same id share a canonical name; output is stably ordered (by id/name/link). If you need forced names, add a name override map in code.

## Project defaults (code-level)
In `src/index.js` you can set global defaults:
```
const DEFAULT_REFERER = undefined; // string, null, or undefined
const DEFAULT_ORIGIN = undefined;  // string, null, or undefined
```
- string: forces that value
- null: forces null (no auto)
- undefined: auto (unless overridden by CLI)

## Build locally
```
npm run build:json
```
Outputs to `output/api.json` and `output/filtered.json` using `src/filter.js`.

## CI: auto-update repo (two-repo setup)
Use a separate public repo (e.g., `auto-update`) to run the GitHub Actions workflow that builds every 5 minutes and pushes JSON here or to another repo. This repo (`ayna-tv-fetch`) is private; the workflow checks it out using a read-token (see secrets below).

In the auto-update repo, set ALL of the following repository secrets (no defaults):
- PLAYLIST_URL: private playlist URL
- PLAYLIST_REFERER: referer header value (use `null` if you want to disable auto)
- PLAYLIST_ORIGIN: origin header value (use `null` if you want to disable auto)
- CODE_REPO: `owner/ayna-tv-fetch` (this repo) so the workflow pulls the CLI/filter
- CODE_REF: branch/tag to use in `CODE_REPO` (e.g., `main`)
- FILTER_PATH: path to filter file in `CODE_REPO` (e.g., `src/filter.js`)
- TARGET_REPO: repo to receive the JSONs (e.g., `owner/ayna-tv-fetch`)
- TARGET_TOKEN: fine-grained PAT with contents:read/write on TARGET_REPO (required if the target repo is private; optional if public and you allow anonymous reads but writes still require PAT)
- TARGET_BRANCH: branch in the target repo (e.g., `main`)
- TARGET_DIR: folder path inside target repo (e.g., `public` or `.`)


## auto-update repo in
Setup (repo secrets):
- `PLAYLIST_URL`: required
- `PLAYLIST_REFERER`: optional (use `null` to disable auto)
- `PLAYLIST_ORIGIN`: optional (use `null` to disable auto)
- `CODE_REPO`: `owner/ayna-tv-fetch`
- `CODE_REF`: `main`
- `CODE_TOKEN`: leave empty if `ayna-tv-fetch` is public; else PAT with Contents: Read
- `TARGET_REPO`: `owner/ayna-tv-fetch`
- `TARGET_TOKEN`: PAT with Contents: Read/Write on `ayna-tv-fetch`
- `TARGET_BRANCH`: `main`
- `TARGET_DIR`: `output` (or desired folder)

Behavior:
- Generates `output/api.json` and `output/filtered.json` in the workflow workspace
- Does not commit to this `auto-update` repo
- Copies and pushes outputs into `TARGET_REPO` at `TARGET_DIR`




The auto-update workflow will:
1) Checkout auto-update repo
2) Checkout this repo at CODE_REF into `code-repo/`
3) Setup Node 20 and install deps if `package.json` exists
4) Run `node code-repo/bin/m3u-to-json.js ...` to produce `output/api.json` and `output/filtered.json`
5) If TARGET_* are set, copy JSONs into the target repo (e.g., `owner/ayna-tv-fetch`) and push

Cron schedule is every 5 minutes by default (changeable in `auto-update/.github/workflows/build-json.yml`).


How to create and set it
## Create PAT:
- GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
- Repository access: Only select owner/ayna-tv-fetch.
- Permissions: Contents → Read and Write; Metadata → Read.
Set an expiration, generate, and copy the token.
## Add as secret:
Go to the auto-update repo → Settings → Secrets and variables → Actions → New repository secret.
- Name: TARGET_TOKEN; Value: paste the PAT.
## Notes
Required even if ayna-tv-fetch is public; pushes always need a token.
If you use classic tokens, give it the minimal repo scope and limit to the needed repo if possible.
Do not use the auto-update repo’s default GITHUB_TOKEN; it cannot push to a different repo.



## Security notes
- Never commit tokens. Use repo secrets for PLAYLIST_URL and TARGET_TOKEN.
- Prefer fine-grained PAT restricted to the target repo with only Contents: Read/Write.
