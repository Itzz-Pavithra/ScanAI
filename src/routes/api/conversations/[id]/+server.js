import { json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { getDb } from '$lib/server/db/mongodb.js';
import { deleteImagesForConversation } from '$lib/server/db/images.js';

/**
 * Get full conversation details and ordered message timeline
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ params, locals }) {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const convId = params.id;
	if (!convId || !ObjectId.isValid(convId)) {
		return json({ success: false, error: 'Invalid conversation ID' }, { status: 400 });
	}

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

	const messages = await db.collection('messages')
		.find({ conversationId: convObjId })
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
			isBookmarked: Boolean(conversation.isBookmarked),
			hasImage: Boolean(conversation.imageId),
			imageUrl: conversation.imageId ? `/api/images/${conversation.imageId.toString()}` : null,
			imageMetadata: conversation.imageMetadata || null,
			tags: conversation.tags || [],
			shareEnabled: Boolean(conversation.shareEnabled),
			createdAt: conversation.createdAt,
			updatedAt: conversation.updatedAt,
			messages: messages.map((m) => ({
				id: m._id.toString(),
				role: m.role,
				content: m.content,
				interrupted: Boolean(m.interrupted),
				model: m.model,
				provider: m.provider,
				createdAt: m.createdAt
			}))
		}
	}, {
		headers: {
			'Cache-Control': 'no-store, private'
		}
	});
}

/**
 * Update conversation title, bookmark status, or tags
 * @type {import('./$types').RequestHandler}
 */
export async function PATCH({ params, request, locals }) {
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
		return json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
	}

	const db = await getDb();
	const userObjId = new ObjectId(locals.user.id);
	const convObjId = new ObjectId(convId);

	const updateFields = { updatedAt: new Date() };

	if (typeof body.title === 'string' && body.title.trim().length > 0) {
		updateFields.title = body.title.trim().slice(0, 100);
	}

	if (typeof body.isBookmarked === 'boolean') {
		updateFields.isBookmarked = body.isBookmarked;
	}

	if (Array.isArray(body.tags)) {
		updateFields.tags = body.tags.slice(0, 10).map((t) => String(t).slice(0, 30));
	}

	const result = await db.collection('conversations').findOneAndUpdate(
		{ _id: convObjId, userId: userObjId },
		{ $set: updateFields },
		{ returnDocument: 'after' }
	);

	if (!result) {
		return json({ success: false, error: 'Conversation not found' }, { status: 404 });
	}

	return json({
		success: true,
		conversation: {
			id: result._id.toString(),
			title: result.title,
			isBookmarked: Boolean(result.isBookmarked),
			tags: result.tags || [],
			updatedAt: result.updatedAt
		}
	});
}

/**
 * Permanently delete conversation, its messages, and its stored images
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ params, locals }) {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const convId = params.id;
	if (!convId || !ObjectId.isValid(convId)) {
		return json({ success: false, error: 'Invalid conversation ID' }, { status: 400 });
	}

	const db = await getDb();
	const userObjId = new ObjectId(locals.user.id);
	const convObjId = new ObjectId(convId);

	// Verify ownership before deleting
	const conversation = await db.collection('conversations').findOne({
		_id: convObjId,
		userId: userObjId
	});

	if (!conversation) {
		return json({ success: false, error: 'Conversation not found' }, { status: 404 });
	}

	// Clean up associated GridFS image(s)
	await deleteImagesForConversation(convObjId, userObjId);

	// Delete all associated messages
	await db.collection('messages').deleteMany({ conversationId: convObjId });

	// Delete the conversation document
	await db.collection('conversations').deleteOne({ _id: convObjId, userId: userObjId });

	return json({
		success: true,
		message: 'Conversation and associated images permanently deleted.'
	});
}
