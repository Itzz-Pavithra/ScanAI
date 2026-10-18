// Load .env automatically in Node 20+ environments if present
if (typeof process.loadEnvFile === 'function') {
	try {
		process.loadEnvFile();
	} catch {
		// Ignore if .env does not exist or has already been loaded
	}
}

let sveltePrivateEnv = {};
try {
	const mod = await import('$env/dynamic/private').catch(() => null);
	if (mod?.env) sveltePrivateEnv = mod.env;
} catch {
	sveltePrivateEnv = {};
}

/**
 * Safely retrieves server-side environment variable.
 * Checks process.env first (for Node, tests, or process.loadEnvFile),
 * then falls back to SvelteKit's $env/dynamic/private.
 * @param {string} key
 * @returns {string}
 */
export function getEnv(key) {
	const val = process.env[key] !== undefined && process.env[key] !== ''
		? process.env[key]
		: sveltePrivateEnv[key];
	return val ? String(val).trim() : '';
}
