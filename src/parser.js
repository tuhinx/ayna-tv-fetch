'use strict';

function parseAttributes(attrStr) {
	const attributes = {};
	const regex = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
	let match;
	while ((match = regex.exec(attrStr)) !== null) {
		attributes[match[1]] = match[2];
	}
	return attributes;
}

export function parseM3U(content) {
	const lines = content.split(/\r?\n/);
	const entries = [];
	let currentInfo = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line.length === 0) continue;
		if (line.startsWith('#EXTM3U')) {
			continue;
		}
		if (line.startsWith('#EXTINF:')) {
			const rest = line.substring('#EXTINF:'.length);
			const commaIdx = rest.indexOf(',');
			const durationStr = commaIdx >= 0 ? rest.substring(0, commaIdx) : rest;
			const name = commaIdx >= 0 ? rest.substring(commaIdx + 1).trim() : '';
			const duration = Number.parseInt(durationStr, 10);
			const attrs = parseAttributes(rest);
			currentInfo = { name, duration: Number.isNaN(duration) ? null : duration, attributes: attrs, rawExtinf: line };
			continue;
		}
		// Capture player-specific properties commonly used for HTTP headers
		if (line.startsWith('#EXTVLCOPT:') || line.startsWith('#KODIPROP:')) {
			const kv = line.substring(line.indexOf(':') + 1);
			const eq = kv.indexOf('=');
			const key = eq >= 0 ? kv.substring(0, eq).trim() : kv.trim();
			const value = eq >= 0 ? kv.substring(eq + 1).trim() : '';
			if (currentInfo) {
				if (!currentInfo.attributes) currentInfo.attributes = {};
				currentInfo.attributes[key] = value;
			}
			continue;
		}
		if (line.startsWith('#')) {
			continue;
		}
		if (currentInfo) {
			entries.push({ ...currentInfo, url: line });
			currentInfo = null;
		} else {
			entries.push({ name: '', duration: null, attributes: {}, rawExtinf: null, url: line });
		}
	}
	return entries;
}

export function toJSON(entries, overrides = {}) {
	return entries.map(e => {
		const attributes = e.attributes || {};
		const link = e.url;
		let origin = null;
		if (Object.prototype.hasOwnProperty.call(overrides, 'origin')) {
			origin = overrides.origin;
		} else {
			try {
				if (link) origin = new URL(link).origin;
			} catch (_) {}
		}
		let referer = null;
		if (Object.prototype.hasOwnProperty.call(overrides, 'referer')) {
			referer = overrides.referer;
		} else {
			referer = attributes['http-referrer'] || attributes['referer'] || attributes['referrer'] || attributes['http-referer'] || null;
		}
		const slugId = (e.name || '')
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^a-z0-9]+/g, '')
			.trim();
		return {
			name: e.name || '',
			id: slugId || null,
			logo: attributes['tvg-logo'] || null,
			link,
			referer,
			origin
		};
	});
}

