import { json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { getDb } from '$lib/server/db/mongodb.js';
import { validateDisplayName } from '$lib/server/auth/validation.js';

const DAILY_SCAN_LIMIT = 50;

/**
 * Get profile and usage statistics
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ locals }) {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const db = await getDb();
	const userObjId = new ObjectId(locals.user.id);

	// Get usage stats: today's count and all-time count
	const startOfDay = new Date();
	startOfDay.setHours(0, 0, 0, 0);

	const [todayScans, totalScans, userDoc] = await Promise.all([
		db.collection('usage').countDocuments({
			userId: userObjId,
			timestamp: { $gte: startOfDay }
		}),
		db.collection('usage').countDocuments({
			userId: userObjId
		}),
		db.collection('users').findOne({ _id: userObjId })
	]);

	return json({
		success: true,
		user: {
			id: locals.user.id,
			email: userDoc?.email || locals.user.email,
			displayName: userDoc?.displayName || locals.user.displayName,
			verified: Boolean(userDoc?.verified),
			preferences: userDoc?.preferences || {
				defaultProvider: 'chatgpt',
				defaultStyle: 'step-by-step',
				animationLevel: 'full'
			},
			createdAt: userDoc?.createdAt || locals.user.createdAt
		},
		usage: {
			todayScans,
			dailyLimit: DAILY_SCAN_LIMIT,
			remainingToday: Math.max(0, DAILY_SCAN_LIMIT - todayScans),
			totalScans
		}
	}, {
		headers: {
			'Cache-Control': 'no-store, private'
		}
	});
}

/**
 * Update user display name or preferences
 * @type {import('./$types').RequestHandler}
 */
export async function PATCH({ request, locals }) {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	let body;
	try {
		body = await request.json();
	} catch (e) {
		return json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
	}

	const db = await getDb();
	const userObjId = new ObjectId(locals.user.id);
	const updateFields = { updatedAt: new Date() };

	if (body.displayName) {
		const nameCheck = validateDisplayName(body.displayName);
		if (!nameCheck.valid) {
			return json({ success: false, error: nameCheck.error }, { status: 400 });
		}
		updateFields.displayName = nameCheck.cleanName;
	}

	if (body.preferences && typeof body.preferences === 'object') {
		const { defaultProvider, defaultStyle, animationLevel } = body.preferences;

		if (defaultProvider && ['chatgpt', 'claude', 'gemini'].includes(defaultProvider)) {
			updateFields['preferences.defaultProvider'] = defaultProvider;
		}

		if (defaultStyle && ['step-by-step', 'concise', 'detailed', 'tamil'].includes(defaultStyle)) {
			updateFields['preferences.defaultStyle'] = defaultStyle;
		}

		if (animationLevel && ['full', 'subtle', 'none'].includes(animationLevel)) {
			updateFields['preferences.animationLevel'] = animationLevel;
		}
	}

	const updated = await db.collection('users').findOneAndUpdate(
		{ _id: userObjId },
		{ $set: updateFields },
		{ returnDocument: 'after' }
	);

	return json({
		success: true,
		user: {
			id: locals.user.id,
			email: updated.email,
			displayName: updated.displayName,
			preferences: updated.preferences,
			updatedAt: updated.updatedAt
		}
	});
}
