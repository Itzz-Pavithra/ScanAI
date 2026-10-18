import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
	return json({
		success: true,
		authenticated: Boolean(locals.user),
		user: locals.user || null
	}, {
		headers: {
			'Cache-Control': 'no-store, private'
		}
	});
}
