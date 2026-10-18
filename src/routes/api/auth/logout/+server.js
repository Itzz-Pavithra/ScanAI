import { json } from '@sveltejs/kit';
import { invalidateSession, clearSessionCookie, SESSION_COOKIE_NAME } from '$lib/server/auth/sessions.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ cookies }) {
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (token) {
		await invalidateSession(token);
	}
	clearSessionCookie(cookies);

	return json({
		success: true,
		message: 'Logged out successfully.'
	});
}
