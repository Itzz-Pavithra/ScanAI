import { validateSession, SESSION_COOKIE_NAME, clearSessionCookie } from '$lib/server/auth/sessions.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		try {
			const authResult = await validateSession(sessionToken);
			if (authResult) {
				event.locals.user = authResult.user;
				event.locals.session = authResult.session;
			} else {
				event.locals.user = null;
				event.locals.session = null;
				clearSessionCookie(event.cookies);
			}
		} catch (err) {
			console.error('[Auth Hook Error]:', err.message);
			event.locals.user = null;
			event.locals.session = null;
		}
	}

	const pathname = event.url.pathname;
	const method = event.request.method;

	// 1. CSRF Protection for state-changing API requests
	if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method) && pathname.startsWith('/api/')) {
		const origin = event.request.headers.get('origin');
		if (origin && origin !== event.url.origin) {
			// Allow local dev origins or check matching origin
			const isAllowedLocal =
				origin.startsWith('http://localhost:') ||
				origin.startsWith('http://127.0.0.1:');
			if (!isAllowedLocal) {
				return new Response(
					JSON.stringify({
						success: false,
						error: {
							code: 'FORBIDDEN_ORIGIN',
							message: 'Cross-origin state-changing request blocked.'
						}
					}),
					{
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}
		}
	}

	// 2. Server-side route authorization for private API endpoints
	// Note: /api/conversations/lookup is a public share route and must remain accessible
	const isPrivateApi =
		(pathname.startsWith('/api/conversations') && !pathname.startsWith('/api/conversations/lookup')) ||
		pathname.startsWith('/api/user');

	if (isPrivateApi && !event.locals.user) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'You must be signed in to perform this operation.'
				}
			}),
			{
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-store, private'
				}
			}
		);
	}

	const response = await resolve(event);

	// 3. Security Hardening Headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

	// Content Security Policy
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: blob: https://images.unsplash.com",
		"connect-src 'self' https:",
		"frame-ancestors 'none'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	return response;
}
