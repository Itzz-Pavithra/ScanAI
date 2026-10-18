import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/mongodb.js';
import { verifyPassword } from '$lib/server/auth/passwords.js';
import { createSession, setSessionCookie } from '$lib/server/auth/sessions.js';
import { validateEmail } from '$lib/server/auth/validation.js';
import { authRateLimiter } from '$lib/server/auth/rate-limit.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, getClientAddress, cookies }) {
	const clientIp = getClientAddress() || '127.0.0.1';

	let body;
	try {
		body = await request.json();
	} catch (e) {
		return json(
			{ success: false, error: { code: 'INVALID_REQUEST', message: 'Malformed JSON payload.' } },
			{ status: 400 }
		);
	}

	const { email, password } = body || {};
	const emailCheck = validateEmail(email);
	if (!emailCheck.valid || !password) {
		return json(
			{
				success: false,
				error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
			},
			{ status: 401 }
		);
	}

	const rateKey = `login:${clientIp}:${emailCheck.normalizedEmail}`;
	const rateCheck = authRateLimiter.check(rateKey, 5, 15 * 60 * 1000);
	if (!rateCheck.allowed) {
		return json(
			{
				success: false,
				error: {
					code: 'RATE_LIMIT_EXCEEDED',
					message: `Too many failed login attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`
				}
			},
			{ status: 429 }
		);
	}

	const db = await getDb();
	const user = await db.collection('users').findOne({ email: emailCheck.normalizedEmail });

	if (!user || user.status === 'suspended') {
		return json(
			{
				success: false,
				error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
			},
			{ status: 401 }
		);
	}

	const isValidPassword = await verifyPassword(user.passwordHash, password);
	if (!isValidPassword) {
		return json(
			{
				success: false,
				error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
			},
			{ status: 401 }
		);
	}

	// Successful login: reset rate limit for this user
	authRateLimiter.reset(rateKey);

	// Create session and set cookie
	const userAgent = request.headers.get('user-agent') || 'Unknown';
	const { token, expiresAt } = await createSession(user._id, { userAgent, ip: clientIp });
	setSessionCookie(cookies, token, expiresAt);

	return json({
		success: true,
		user: {
			id: user._id.toString(),
			email: user.email,
			displayName: user.displayName,
			preferences: user.preferences || {
				defaultProvider: 'chatgpt',
				defaultStyle: 'step-by-step',
				animationLevel: 'full'
			},
			createdAt: user.createdAt
		}
	});
}
