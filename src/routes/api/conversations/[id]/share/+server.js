import crypto from 'crypto';
import { json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { getDb } from '$lib/server/db/mongodb.js';

/**
 * Toggle or generate secure share token
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ params, request, locals, url }) {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const convId = params.id;
	if (!convId || !ObjectId.isValid(convId)) {
		return json({ success: false, error: 'Invalid conversation ID' }, { status: 400 });
	}

	let body;
	try {
		body = await request.json();
	} catch (e) {
		body = {};
	}

	const enable = body.enable !== false; // Default true if toggling
	const db = await getDb();
	const userObjId = new ObjectId(locals.user.id);
	const convObjId = new ObjectId(convId);

	const conversation = await db.collection('conversations').findOne({
		_id: convObjId,
		userId: userObjId
	});

	if (!conversation) {
		return json({ success: false, error: 'Conversation not found' }, { status: 404 });
	}

	if (!enable) {
		await db.collection('conversations').updateOne(
			{ _id: convObjId, userId: userObjId },
			{ $set: { shareEnabled: false, shareTokenHash: null } }
		);
		return json({ success: true, shareEnabled: false });
	}

	const rawToken = crypto.randomBytes(24).toString('base64url');
	const shareTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

	await db.collection('conversations').updateOne(
		{ _id: convObjId, userId: userObjId },
		{ $set: { shareEnabled: true, shareTokenHash } }
	);

	const sharePath = `/share/${rawToken}`;
	return json({
		success: true,
		shareEnabled: true,
		shareToken: rawToken,
		sharePath,
		shareUrl: `${url.origin}${sharePath}`
	});
}

/**
 * Access shared conversation with public share token
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ params, url }) {
	const convId = params.id;
	const token = url.searchParams.get('token');

	if (!convId || !ObjectId.isValid(convId) || !token) {
		return json({ success: false, error: 'Missing or invalid share token.' }, { status: 400 });
	}

	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	const db = await getDb();
	const convObjId = new ObjectId(convId);

	const conversation = await db.collection('conversations').findOne({
		_id: convObjId,
		shareEnabled: true,
		shareTokenHash: tokenHash
	});

	if (!conversation) {
		return json({ success: false, error: 'Shared conversation not found or link has expired.' }, { status: 404 });
	}

	const messages = await db.collection('messages')
		.find({ conversationId: convObjId })
		.sort({ createdAt: 1 })
		.toArray();

	return json({
		success: true,
		shared: true,
		conversation: {
			id: conversation._id.toString(),
			title: conversation.title,
			provider: conversation.provider,
			model: conversation.model,
			explanationStyle: conversation.explanationStyle,
			hasImage: Boolean(conversation.imageId),
			imageUrl: conversation.imageId ? `/api/images/${conversation.imageId.toString()}?shared=true` : null,
			createdAt: conversation.createdAt,
			messages: messages.map((m) => ({
				id: m._id.toString(),
				role: m.role,
				content: m.content,
				model: m.model,
				provider: m.provider,
				createdAt: m.createdAt
			}))
		}
	});
}
