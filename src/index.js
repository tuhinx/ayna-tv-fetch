'use strict';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { parseM3U, toJSON } from './parser.js';
import https from 'https';
import http from 'http';

// Set these to manually control defaults in code.
// - Set to a string (e.g., 'https://example.com') to force that value.
// - Set to null to force null and disable auto.
// - Leave undefined to allow auto (unless CLI flags are provided).
const DEFAULT_REFERER = "null"; // e.g., 'https://your-referer.example'
const DEFAULT_ORIGIN = "null";  // e.g., 'https://your-origin.example'

function normalizeGitHubRaw(url) {
	const m = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/i);
	if (m) {
		return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
	}
	return url;
}

function fetchUrl(url) {
	url = normalizeGitHubRaw(url);
	const client = url.startsWith('https') ? https : http;
	return new Promise((resolve, reject) => {
		client.get(url, res => {
			if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				return resolve(fetchUrl(res.headers.location));
			}
			if (res.statusCode !== 200) {
				return reject(new Error(`Request failed: ${res.statusCode}`));
			}
			const chunks = [];
			res.on('data', d => chunks.push(d));
			res.on('end', () => {
				const buf = Buffer.concat(chunks);
				resolve(buf.toString('utf8'));
			});
		}).on('error', reject);
	});
}

function readLocal(filePath) {
	return fs.readFileSync(filePath, 'utf8');
}

function parseArgs(argv) {
	const args = { _: [] };
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--url' || a === '-u') args.url = argv[++i];
		else if (a === '--file' || a === '-f') args.file = argv[++i];
		else if (a === '--out' || a === '-o') args.out = argv[++i];
		else if (a === '--out-filter') args.outFilter = argv[++i];
		else if (a === '--write-both') args.writeBoth = true;
		else if (a === '--out-dir') args.outDir = argv[++i];
		else if (a === '--filter') args.filter = argv[++i];
		else if (a === '--ids') args.ids = argv[++i];
		else if (a === '--from-json') args.fromJson = argv[++i];
		else if (a === '--referer') args.referer = argv[++i];
		else if (a === '--origin') args.origin = argv[++i];
		else if (a === '--minify' || a === '-m') args.minify = true;
		else if (a === '--stdout') args.stdout = true;
		else if (a === '--help' || a === '-h') args.help = true;
		else args._.push(a);
	}
	return args;
}

function printHelp() {
	console.log(`m3u-to-json\n\nUsage:\n  m3u-to-json --url <url> [--out file.json] [--out-filter filtered.json] [--write-both] [--out-dir dir] [--minify] [--filter sports.json] [--ids id1,id2] [--from-json api.json] [--referer v|null] [--origin v|null]\n  m3u-to-json --file <path.m3u8> [--out file.json] [--out-filter filtered.json] [--write-both] [--out-dir dir] [--minify] [--filter sports.json] [--ids id1,id2] [--from-json api.json] [--referer v|null] [--origin v|null]\n  m3u-to-json --help\n\nOptions:\n  -u, --url               URL to M3U/M3U8 (supports GitHub blob -> raw)\n  -f, --file              Local M3U/M3U8 file path\n      --from-json <file>  Use existing api.json as input to filter (skip M3U fetch/parse)\n  -o, --out               Output JSON filename or path (default: api.json, unfiltered when --write-both)\n      --out-filter <file> Filename for filtered output (default: filtered.json when --write-both)\n      --write-both        Write both unfiltered and filtered outputs to files\n      --out-dir <dir>     Output directory (created if missing)\n      --stdout            Print JSON to stdout instead of file\n      --filter <file>     JSON/JS file with allowed ids (array of strings or objects with id)\n      --ids id1,id2       Comma-separated ids to include\n      --referer <v|null>  Manually set referer; 'null' disables auto\n      --origin  <v|null>  Manually set origin; 'null' disables auto\n  -m, --minify            Minify JSON output\n  -h, --help              Show help\n`);
}

async function main() {
	const args = parseArgs(process.argv);
	if (args.help || (!args.url && !args.file)) {
		printHelp();
		return;
	}
	try {
		let unfiltered;
		if (args.fromJson) {
			const src = path.isAbsolute(args.fromJson) ? args.fromJson : path.join(process.cwd(), args.fromJson);
			const raw = fs.readFileSync(src, 'utf8');
			unfiltered = JSON.parse(raw);
		} else {
			let content;
			if (args.url) {
				content = await fetchUrl(args.url);
			} else {
				const abs = path.isAbsolute(args.file) ? args.file : path.join(process.cwd(), args.file);
				content = readLocal(abs);
			}
			const entries = parseM3U(content);
			const overrides = {};
			if (Object.prototype.hasOwnProperty.call(args, 'referer')) {
				overrides.referer = args.referer === 'null' ? null : args.referer;
			} else if (typeof DEFAULT_REFERER !== 'undefined') {
				overrides.referer = DEFAULT_REFERER;
			}
			if (Object.prototype.hasOwnProperty.call(args, 'origin')) {
				overrides.origin = args.origin === 'null' ? null : args.origin;
			} else if (typeof DEFAULT_ORIGIN !== 'undefined') {
				overrides.origin = DEFAULT_ORIGIN;
			}
			unfiltered = toJSON(entries, overrides);
		}
		const overrides = {};
		if (Object.prototype.hasOwnProperty.call(args, 'referer')) {
			overrides.referer = args.referer === 'null' ? null : args.referer;
		} else if (typeof DEFAULT_REFERER !== 'undefined') {
			overrides.referer = DEFAULT_REFERER;
		}
		if (Object.prototype.hasOwnProperty.call(args, 'origin')) {
			overrides.origin = args.origin === 'null' ? null : args.origin;
		} else if (typeof DEFAULT_ORIGIN !== 'undefined') {
			overrides.origin = DEFAULT_ORIGIN;
		}
		// If from-json used, apply overrides onto each element
		if (args.fromJson && (Object.prototype.hasOwnProperty.call(overrides, 'referer') || Object.prototype.hasOwnProperty.call(overrides, 'origin'))) {
			unfiltered = unfiltered.map(item => ({
				...item,
				referer: Object.prototype.hasOwnProperty.call(overrides, 'referer') ? overrides.referer : item.referer,
				origin: Object.prototype.hasOwnProperty.call(overrides, 'origin') ? overrides.origin : item.origin
			}));
		}
		// Canonicalize names per id to keep the same channel name across duplicates
		const makeCanonical = (items) => {
			const idToName = new Map();
			for (const it of items) {
				if (!it || typeof it.id !== 'string') continue;
				const current = idToName.get(it.id);
				const candidate = (it.name || '').trim();
				if (!current) {
					idToName.set(it.id, candidate);
				} else {
					// choose lexicographically smaller non-empty to be stable
					if (candidate && candidate.toLowerCase() < current.toLowerCase()) {
						idToName.set(it.id, candidate);
					}
				}
			}
			return items.map(it => it && typeof it.id === 'string' ? { ...it, name: idToName.get(it.id) || it.name || '' } : it);
		};
		const sortStable = (items) => {
			return [...items].sort((a, b) => {
				const aid = (a.id || '').localeCompare(b.id || '');
				if (aid !== 0) return aid;
				const an = (a.name || '').localeCompare(b.name || '');
				if (an !== 0) return an;
				return (a.link || '').localeCompare(b.link || '');
			});
		};
        unfiltered = makeCanonical(unfiltered);
        let json = unfiltered;
		// Filtering by ids
        let allowedIds = new Set();
        let idOrder = [];
        if (args.ids) {
            args.ids.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).forEach(id => { if (!allowedIds.has(id)) { allowedIds.add(id); idOrder.push(id); } });
        }
		if (args.filter) {
			try {
				let filterPath = path.isAbsolute(args.filter) ? args.filter : path.join(process.cwd(), args.filter);
				if (!fs.existsSync(filterPath)) {
					const alt = path.join(process.cwd(), 'src', args.filter);
					if (fs.existsSync(alt)) filterPath = alt;
				}
				if (/[.](mjs|js)$/i.test(filterPath)) {
					const mod = await import(pathToFileURL(filterPath).href);
					const list = Array.isArray(mod?.default) ? mod.default : (Array.isArray(mod?.ids) ? mod.ids : null);
                    if (Array.isArray(list)) {
                        for (const item of list) {
                            const rawId = typeof item === 'string' ? item : (item && typeof item === 'object' ? item.id : undefined);
                            if (typeof rawId === 'string') {
                                const id = rawId.toLowerCase();
                                if (!allowedIds.has(id)) { allowedIds.add(id); idOrder.push(id); }
                            }
                        }
                    }
				} else {
					const raw = fs.readFileSync(filterPath, 'utf8');
					const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        for (const item of parsed) {
                            const rawId = typeof item === 'string' ? item : (item && typeof item === 'object' ? item.id : undefined);
                            if (typeof rawId === 'string') {
                                const id = rawId.toLowerCase();
                                if (!allowedIds.has(id)) { allowedIds.add(id); idOrder.push(id); }
                            }
                        }
                    }
				}
			} catch (e) {
				console.error('Filter load error:', e.message);
			}
		}
        if (allowedIds.size > 0) {
            // Build in the exact order of ids provided
            const byIdOrder = [];
            for (const id of (idOrder.length > 0 ? idOrder : Array.from(allowedIds))) {
                for (const item of unfiltered) {
                    if (typeof item.id === 'string' && item.id.toLowerCase() === id) {
                        byIdOrder.push(item);
                    }
                }
            }
            json = byIdOrder;
        } else {
            json = sortStable(makeCanonical(json));
        }
		const text = args.minify ? JSON.stringify(json) : JSON.stringify(json, null, 2);
		if (args.stdout) {
			console.log(text);
		} else {
			const ensureDir = (dir) => {
				if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
			};
			const resolveOut = (name) => {
				let p = name;
				if (args.outDir) {
					const dir = path.isAbsolute(args.outDir) ? args.outDir : path.join(process.cwd(), args.outDir);
					ensureDir(dir);
					p = path.join(dir, path.basename(name));
				}
				return p;
			};
			if (args.writeBoth && (args.filter || args.ids)) {
				const unfilteredName = args.out || 'api.json';
				const filteredName = args.outFilter || 'filtered.json';
				const unfilteredPath = resolveOut(unfilteredName);
				const filteredPath = resolveOut(filteredName);
				const textUnf = args.minify ? JSON.stringify(unfiltered) : JSON.stringify(unfiltered, null, 2);
				const textFil = args.minify ? JSON.stringify(json) : JSON.stringify(json, null, 2);
				fs.writeFileSync(unfilteredPath, textUnf, 'utf8');
				fs.writeFileSync(filteredPath, textFil, 'utf8');
				console.log(`Wrote ${unfiltered.length} items to ${unfilteredPath}`);
				console.log(`Wrote ${json.length} items to ${filteredPath}`);
			} else {
				let fileName = args.out || 'api.json';
				let outPath = resolveOut(fileName);
				fs.writeFileSync(outPath, text, 'utf8');
				console.log(`Wrote ${json.length} items to ${outPath}`);
			}
		}
	} catch (err) {
		console.error('Error:', err.message || err);
		process.exitCode = 1;
	}
}

if (process.argv[1] && import.meta && import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export default main;

