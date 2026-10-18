import crypto from 'crypto';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/mongodb.js';
import { hashPassword } from '$lib/server/auth/passwords.js';
import { invalidateAllUserSessions } from '$lib/server/auth/sessions.js';
import { validateEmail, validatePassword } from '$lib/server/auth/validation.js';
import { authRateLimiter } from '$lib/server/auth/rate-limit.js';
import { sendEmail, isEmailConfigured } from '$lib/server/email/index.js';
import { getEnv } from '$lib/server/ai/env.js';

/**
 * Password reset request and confirmation handler
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, getClientAddress, url }) {
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

	const { action = 'request' } = body || {};

	if (action === 'request') {
		const { email } = body || {};
		const emailCheck = validateEmail(email);
		if (!emailCheck.valid) {
			return json(
				{ success: false, error: { code: 'INVALID_EMAIL', message: emailCheck.error } },
				{ status: 400 }
			);
		}

		// Rate limiting: 3 reset requests per 15 min per IP/email
		const rateKey = `reset:${clientIp}:${emailCheck.normalizedEmail}`;
		const rateCheck = authRateLimiter.check(rateKey, 3, 15 * 60 * 1000);
		if (!rateCheck.allowed) {
			return json(
				{
					success: false,
					error: {
						code: 'RATE_LIMIT_EXCEEDED',
						message: `Too many password reset requests. Please try again in ${rateCheck.resetInSeconds} seconds.`
					}
				},
				{ status: 429 }
			);
		}

		// Verify email service configuration - do NOT falsely present as working if not configured
		if (!isEmailConfigured()) {
			return json(
				{
					success: false,
					configured: false,
					error: {
						code: 'EMAIL_SERVICE_NOT_CONFIGURED',
						message:
							'Transactional email delivery is not configured on this server. Set RESEND_API_KEY to enable password resets.'
					}
				},
				{ status: 503 }
			);
		}

		const db = await getDb();
		const user = await db.collection('users').findOne({ email: emailCheck.normalizedEmail });

		if (user && user.status !== 'suspended') {
			const rawToken = crypto.randomBytes(32).toString('hex');
			const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
			const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

			await db.collection('password_resets').insertOne({
				userId: user._id,
				tokenHash,
				expiresAt,
				used: false,
				createdAt: new Date()
			});

			const origin = url.origin || getEnv('PUBLIC_APP_URL') || 'http://localhost:5173';
			const resetLink = `${origin}/reset-password?token=${rawToken}`;

			await sendEmail({
				to: user.email,
				subject: 'ScanAI — Reset Your Password',
				html: `
					<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
						<h2 style="color: #111827;">Reset Your ScanAI Password</h2>
						<p style="color: #4b5563; font-size: 15px; line-height: 1.5;">
							We received a request to reset your password for your ScanAI account.
							Click the button below to choose a new password. This link is valid for 1 hour.
						</p>
						<p style="margin: 28px 0;">
							<a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
								Reset Password
							</a>
						</p>
						<p style="color: #6b7280; font-size: 13px;">
							If you did not request a password reset, you can safely ignore this email.
						</p>
					</div>
				`,
				text: `Reset your ScanAI password by visiting: ${resetLink} (Link expires in 1 hour)`
			});
		}

		// Always return neutral response to prevent email enumeration
		return json({
			success: true,
			configured: true,
			message: 'If an account exists with that email address, a password reset link has been sent.'
		});
	}

	if (action === 'confirm') {
		const { token, newPassword } = body || {};

		if (!token || typeof token !== 'string') {
			return json(
				{ success: false, error: { code: 'INVALID_TOKEN', message: 'Reset token is required.' } },
				{ status: 400 }
			);
		}

		const passwordCheck = validatePassword(newPassword);
		if (!passwordCheck.valid) {
			return json(
				{ success: false, error: { code: 'WEAK_PASSWORD', message: passwordCheck.error } },
				{ status: 400 }
			);
		}

		const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
		const db = await getDb();

		const resetDoc = await db.collection('password_resets').findOne({
			tokenHash,
			used: false,
			expiresAt: { $gt: new Date() }
		});

		if (!resetDoc) {
			return json(
				{
					success: false,
					error: {
						code: 'INVALID_OR_EXPIRED_TOKEN',
						message: 'This password reset link is invalid or has expired.'
					}
				},
				{ status: 400 }
			);
		}

		const passwordHash = await hashPassword(newPassword);

		// Update user password and updatedAt
		await db.collection('users').updateOne(
			{ _id: resetDoc.userId },
			{
				$set: {
					passwordHash,
					updatedAt: new Date()
				}
			}
		);

		// Invalidate all active sessions for security
		await invalidateAllUserSessions(resetDoc.userId);

		// Mark reset token as used
		await db.collection('password_resets').updateOne(
			{ _id: resetDoc._id },
			{
				$set: {
					used: true,
					usedAt: new Date()
				}
			}
		);

		return json({
			success: true,
			message: 'Your password has been successfully reset. Please log in with your new credentials.'
		});
	}

	return json(
		{ success: false, error: { code: 'UNKNOWN_ACTION', message: 'Action must be "request" or "confirm".' } },
		{ status: 400 }
	);
}
