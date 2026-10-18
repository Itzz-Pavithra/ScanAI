import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/mongodb.js';
import { getProviderConfigStatus } from '$lib/server/ai/index.js';

const startTime = Date.now();

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	let dbStatus = 'disconnected';
	try {
		const db = await getDb();
		await db.command({ ping: 1 });
		dbStatus = 'connected';
	} catch (err) {
		dbStatus = 'unavailable';
	}

	const providers = getProviderConfigStatus();

	const isHealthy = dbStatus === 'connected';

	return json(
		{
			status: isHealthy ? 'healthy' : 'degraded',
			version: '1.0.0',
			uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
			timestamp: new Date().toISOString(),
			services: {
				database: dbStatus,
				providers: {
					chatgpt: providers.chatgpt.configured,
					claude: providers.claude.configured,
					gemini: providers.gemini.configured
				}
			}
		},
		{
			status: isHealthy ? 200 : 503,
			headers: {
				'Cache-Control': 'no-store, private'
			}
		}
	);
}
