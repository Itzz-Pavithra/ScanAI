import { json } from '@sveltejs/kit';
import { getProviderConfigStatus } from '$lib/server/ai/index.js';

/**
 * Returns configuration availability of AI providers without exposing API keys
 * @type {import('./$types').RequestHandler}
 */
export async function GET() {
	const status = getProviderConfigStatus();
	return json({
		success: true,
		providers: status
	});
}
