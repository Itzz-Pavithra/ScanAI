import crypto from 'crypto';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/mongodb.js';

/**
 * Public lookup of a shared conversation via unguessable share token
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url }) {
	const token = url.searchParams.get('token');
	if (!token || typeof token !== 'string' || token.length < 10) {
		return json({ success: false, error: 'Invalid share token.' }, { status: 400 });
	}

	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	const db = await getDb();

	const conversation = await db.collection('conversations').findOne({
		shareEnabled: true,
		shareTokenHash: tokenHash
	});

	if (!conversation) {
		return json({ success: false, error: 'This shared link does not exist or has been revoked by the owner.' }, { status: 404 });
	}

	const messages = await db.collection('messages')
		.find({ conversationId: conversation._id })
		.sort({ createdAt: 1 })
		.toArray();

	return json({
		success: true,
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
	}, {
		headers: {
			'Cache-Control': 'public, max-age=300'
		}
	});
}
