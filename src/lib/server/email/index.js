import { getEnv } from '../ai/env.js';

/**
 * Sends a transactional email using the official Resend HTTP API
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} [params.text]
 * @returns {Promise<{ sent: boolean, id?: string, reason?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text }) {
	const apiKey = getEnv('RESEND_API_KEY');
	const from = getEnv('EMAIL_FROM') || 'ScanAI <onboarding@resend.dev>';

	if (!apiKey) {
		return {
			sent: false,
			reason: 'EMAIL_SERVICE_NOT_CONFIGURED',
			error: 'Transactional email provider is not configured. Set RESEND_API_KEY in server environment.'
		};
	}

	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from,
				to: [to],
				subject,
				html,
				text
			})
		});

		if (!res.ok) {
			const errorData = await res.json().catch(() => ({}));
			return {
				sent: false,
				reason: 'PROVIDER_ERROR',
				error: errorData.message || `Resend returned HTTP ${res.status}`
			};
		}

		const data = await res.json();
		return {
			sent: true,
			id: data.id
		};
	} catch (err) {
		return {
			sent: false,
			reason: 'NETWORK_ERROR',
			error: err.message
		};
	}
}

/**
 * Checks if transactional email service is configured
 * @returns {boolean}
 */
export function isEmailConfigured() {
	return Boolean(getEnv('RESEND_API_KEY'));
}
