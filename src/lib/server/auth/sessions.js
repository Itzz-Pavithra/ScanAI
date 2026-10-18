import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/mongodb.js';

export const SESSION_COOKIE_NAME = 'scanai_session';
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Generates a SHA-256 hash of a session token for secure database storage
 * @param {string} token
 * @returns {string}
 */
export function hashToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new session in MongoDB and returns the raw token to set in the cookie
 * @param {ObjectId | string} userId
 * @param {object} [metadata]
 * @param {string} [metadata.userAgent]
 * @param {string} [metadata.ip]
 * @returns {Promise<{ token: string, expiresAt: Date }>}
 */
export async function createSession(userId, metadata = {}) {
	const rawToken = crypto.randomBytes(32).toString('hex');
	const tokenHash = hashToken(rawToken);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
	const db = await getDb();

	await db.collection('sessions').insertOne({
		userId: userObjId,
		tokenHash,
		expiresAt,
		createdAt: new Date(),
		userAgent: metadata.userAgent?.slice(0, 255) || 'Unknown',
		ip: metadata.ip || 'Unknown'
	});

	return { token: rawToken, expiresAt };
}

/**
 * Validates a session token and returns the corresponding user and session
 * @param {string} token
 * @returns {Promise<{ user: object, session: object } | null>}
 */
export async function validateSession(token) {
	if (!token || typeof token !== 'string') return null;

	const tokenHash = hashToken(token);
	const db = await getDb();

	const session = await db.collection('sessions').findOne({ tokenHash });
	if (!session) return null;

	// Check expiration
	if (new Date() > new Date(session.expiresAt)) {
		await db.collection('sessions').deleteOne({ _id: session._id });
		return null;
	}

	// Fetch User
	const user = await db.collection('users').findOne({ _id: session.userId });
	if (!user || user.status === 'suspended') {
		await db.collection('sessions').deleteOne({ _id: session._id });
		return null;
	}

	// Sliding expiration: if halfway through lifespan, renew
	const remainingTime = new Date(session.expiresAt).getTime() - Date.now();
	if (remainingTime < SESSION_DURATION_MS / 2) {
		const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		await db.collection('sessions').updateOne(
			{ _id: session._id },
			{ $set: { expiresAt: newExpiresAt } }
		);
		session.expiresAt = newExpiresAt;
	}

	return {
		session: {
			id: session._id.toString(),
			userId: session.userId.toString(),
			expiresAt: session.expiresAt
		},
		user: {
			id: user._id.toString(),
			email: user.email,
			displayName: user.displayName,
			verified: Boolean(user.verified),
			preferences: user.preferences || {
				defaultProvider: 'chatgpt',
				defaultStyle: 'step-by-step',
				animationLevel: 'full'
			},
			createdAt: user.createdAt
		}
	};
}

/**
 * Invalidates a single session by token
 * @param {string} token
 */
export async function invalidateSession(token) {
	if (!token) return;
	const tokenHash = hashToken(token);
	const db = await getDb();
	await db.collection('sessions').deleteOne({ tokenHash });
}

/**
 * Invalidates all active sessions for a user (e.g. on account deletion or password change)
 * @param {ObjectId | string} userId
 */
export async function invalidateAllUserSessions(userId) {
	const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
	const db = await getDb();
	await db.collection('sessions').deleteMany({ userId: userObjId });
}

/**
 * Sets session cookie with strict security flags
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} token
 * @param {Date} expiresAt
 */
export function setSessionCookie(cookies, token, expiresAt) {
	cookies.set(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt
	});
}

/**
 * Clears session cookie
 * @param {import('@sveltejs/kit').Cookies} cookies
 */
export function clearSessionCookie(cookies) {
	cookies.delete(SESSION_COOKIE_NAME, {
		path: '/'
	});
}
