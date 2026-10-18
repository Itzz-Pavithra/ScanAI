import { json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { getDb, getGridFSBucket } from '$lib/server/db/mongodb.js';
import { clearSessionCookie } from '$lib/server/auth/sessions.js';

/**
 * Permanently delete user account and all associated data
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ locals, cookies }) {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const db = await getDb();
	const bucket = await getGridFSBucket();
	const userObjId = new ObjectId(locals.user.id);

	try {
		// 1. Delete all GridFS images owned by user
		const userFiles = await db.collection('scan_images.files').find({
			'metadata.userId': userObjId
		}).toArray();

		for (const file of userFiles) {
			try {
				await bucket.delete(file._id);
			} catch (e) {
				console.warn('[Account Deletion] Failed to delete image file:', file._id, e.message);
			}
		}

		// 2. Delete all messages
		await db.collection('messages').deleteMany({ userId: userObjId });

		// 3. Delete all conversations
		await db.collection('conversations').deleteMany({ userId: userObjId });

		// 4. Delete usage records
		await db.collection('usage').deleteMany({ userId: userObjId });

		// 5. Invalidate and delete all sessions
		await db.collection('sessions').deleteMany({ userId: userObjId });

		// 6. Delete user account document
		await db.collection('users').deleteOne({ _id: userObjId });

		// 7. Clear cookie
		clearSessionCookie(cookies);

		return json({
			success: true,
			message: 'Your account and all associated scan data have been permanently deleted.'
		});
	} catch (err) {
		console.error('[Account Deletion Error]:', err);
		return json({
			success: false,
			error: 'Failed to complete full account deletion. Please try again.'
		}, { status: 500 });
	}
}
