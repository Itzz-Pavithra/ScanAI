import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/mongodb.js';
import { hashPassword } from '$lib/server/auth/passwords.js';
import { createSession, setSessionCookie } from '$lib/server/auth/sessions.js';
import { validateDisplayName, validateEmail, validatePassword } from '$lib/server/auth/validation.js';
import { authRateLimiter } from '$lib/server/auth/rate-limit.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, getClientAddress, cookies }) {
	const clientIp = getClientAddress() || '127.0.0.1';
	const rateCheck = authRateLimiter.check(`register:${clientIp}`, 10, 15 * 60 * 1000);
	if (!rateCheck.allowed) {
		return json(
			{
				success: false,
				error: {
					code: 'RATE_LIMIT_EXCEEDED',
					message: `Too many registration attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`
				}
			},
			{ status: 429 }
		);
	}

	let body;
	try {
		body = await request.json();
	} catch (e) {
		return json(
			{ success: false, error: { code: 'INVALID_REQUEST', message: 'Malformed JSON payload.' } },
			{ status: 400 }
		);
	}

	const { displayName, email, password } = body || {};

	// Validate inputs
	const nameCheck = validateDisplayName(displayName);
	if (!nameCheck.valid) {
		return json({ success: false, error: { code: 'VALIDATION_ERROR', message: nameCheck.error } }, { status: 400 });
	}

	const emailCheck = validateEmail(email);
	if (!emailCheck.valid) {
		return json({ success: false, error: { code: 'VALIDATION_ERROR', message: emailCheck.error } }, { status: 400 });
	}

	const passwordCheck = validatePassword(password);
	if (!passwordCheck.valid) {
		return json({ success: false, error: { code: 'VALIDATION_ERROR', message: passwordCheck.error } }, { status: 400 });
	}

	const db = await getDb();

	// Check for existing user
	const existingUser = await db.collection('users').findOne({ email: emailCheck.normalizedEmail });
	if (existingUser) {
		return json(
			{
				success: false,
				error: {
					code: 'EMAIL_ALREADY_EXISTS',
					message: 'An account with this email address already exists. Please log in instead.'
				}
			},
			{ status: 400 }
		);
	}

	const passwordHash = await hashPassword(password);
	const now = new Date();

	const newUserDoc = {
		email: emailCheck.normalizedEmail,
		displayName: nameCheck.cleanName,
		passwordHash,
		status: 'active',
		verified: true,
		preferences: {
			defaultProvider: 'chatgpt',
			defaultStyle: 'step-by-step',
			animationLevel: 'full'
		},
		createdAt: now,
		updatedAt: now
	};

	const insertResult = await db.collection('users').insertOne(newUserDoc);
	const userId = insertResult.insertedId;

	// Create session
	const userAgent = request.headers.get('user-agent') || 'Unknown';
	const { token, expiresAt } = await createSession(userId, { userAgent, ip: clientIp });
	setSessionCookie(cookies, token, expiresAt);

	return json(
		{
			success: true,
			user: {
				id: userId.toString(),
				email: newUserDoc.email,
				displayName: newUserDoc.displayName,
				preferences: newUserDoc.preferences,
				createdAt: newUserDoc.createdAt
			}
		},
		{ status: 201 }
	);
}
