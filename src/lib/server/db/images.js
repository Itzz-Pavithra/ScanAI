import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { getGridFSBucket, getDb } from './mongodb.js';

/**
 * Stores an image binary safely into MongoDB GridFS
 * @param {Buffer | Uint8Array} buffer
 * @param {object} meta
 * @param {ObjectId | string} meta.userId
 * @param {ObjectId | string} [meta.conversationId]
 * @param {string} meta.mimeType
 * @param {string} [meta.filename]
 * @returns {Promise<ObjectId>} imageId
 */
export async function saveImage(buffer, { userId, conversationId, mimeType, filename }) {
	const bucket = await getGridFSBucket();
	const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
	const convObjId = conversationId
		? typeof conversationId === 'string'
			? new ObjectId(conversationId)
			: conversationId
		: null;

	const safeFilename = filename || `scan_${Date.now()}.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`;

	return new Promise((resolve, reject) => {
		const uploadStream = bucket.openUploadStream(safeFilename, {
			metadata: {
				userId: userObjId,
				conversationId: convObjId,
				mimeType: mimeType || 'image/jpeg',
				size: buffer.length,
				createdAt: new Date()
			}
		});

		uploadStream.on('error', (err) => reject(err));
		uploadStream.on('finish', () => resolve(uploadStream.id));

		const readable = Readable.from(Buffer.from(buffer));
		readable.pipe(uploadStream);
	});
}

/**
 * Retrieves an image stream with owner or share authorization check
 * @param {string | ObjectId} imageId
 * @param {string | ObjectId | null} requestingUserId
 * @param {{ allowShared?: boolean, conversationId?: string | ObjectId }} [options]
 * @returns {Promise<{ stream: import('mongodb').GridFSBucketReadStream, metadata: object }>}
 */
export async function getImageStream(imageId, requestingUserId, options = {}) {
	const bucket = await getGridFSBucket();
	const db = await getDb();
	const objId = typeof imageId === 'string' ? new ObjectId(imageId) : imageId;

	const fileDoc = await db.collection('scan_images.files').findOne({ _id: objId });
	if (!fileDoc) {
		throw new Error('IMAGE_NOT_FOUND');
	}

	// Authorization Check: Must be the owner, or if allowShared, check if conversation has active share
	const fileOwnerId = fileDoc.metadata?.userId?.toString();
	const currentUserId = requestingUserId ? requestingUserId.toString() : null;

	let authorized = currentUserId && fileOwnerId === currentUserId;

	if (!authorized && options.allowShared && fileDoc.metadata?.conversationId) {
		const conv = await db.collection('conversations').findOne({
			_id: fileDoc.metadata.conversationId,
			shareEnabled: true
		});
		if (conv) {
			authorized = true;
		}
	}

	if (!authorized) {
		throw new Error('IMAGE_UNAUTHORIZED');
	}

	const stream = bucket.openDownloadStream(objId);
	return {
		stream,
		metadata: {
			filename: fileDoc.filename,
			mimeType: fileDoc.metadata?.mimeType || 'image/jpeg',
			size: fileDoc.metadata?.size || fileDoc.length,
			createdAt: fileDoc.uploadDate
		}
	};
}

/**
 * Deletes an image from GridFS with strict owner check
 * @param {string | ObjectId} imageId
 * @param {string | ObjectId} userId
 */
export async function deleteImage(imageId, userId) {
	const bucket = await getGridFSBucket();
	const db = await getDb();
	const objId = typeof imageId === 'string' ? new ObjectId(imageId) : imageId;
	const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;

	const fileDoc = await db.collection('scan_images.files').findOne({
		_id: objId,
		'metadata.userId': userObjId
	});

	if (fileDoc) {
		await bucket.delete(objId);
	}
}

/**
 * Deletes all images associated with a conversation
 * @param {string | ObjectId} conversationId
 * @param {string | ObjectId} userId
 */
export async function deleteImagesForConversation(conversationId, userId) {
	const bucket = await getGridFSBucket();
	const db = await getDb();
	const convObjId = typeof conversationId === 'string' ? new ObjectId(conversationId) : conversationId;
	const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;

	const files = await db.collection('scan_images.files').find({
		'metadata.conversationId': convObjId,
		'metadata.userId': userObjId
	}).toArray();

	for (const file of files) {
		try {
			await bucket.delete(file._id);
		} catch (e) {
			console.warn('[GridFS] Failed to delete image chunk:', file._id, e.message);
		}
	}
}
