import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { getDb, closeDbConnection } from '../src/lib/server/db/mongodb.js';
import { saveImage, getImageStream, deleteImagesForConversation } from '../src/lib/server/db/images.js';

describe('MongoDB Persistence & Cross-User Authorization', () => {
	let db;
	const userAId = new ObjectId();
	const userBId = new ObjectId();
	const emailA = `test-user-a-${Date.now()}@scanai.test`;
	const emailB = `test-user-b-${Date.now()}@scanai.test`;

	before(async () => {
		db = await getDb();
		// Clean up any test artifacts
		await db.collection('users').deleteMany({ email: { $in: [emailA, emailB] } });
	});

	after(async () => {
		// Clean up test data
		if (db) {
			await db.collection('users').deleteMany({ _id: { $in: [userAId, userBId] } });
			await db.collection('conversations').deleteMany({ userId: { $in: [userAId, userBId] } });
			await db.collection('messages').deleteMany({ userId: { $in: [userAId, userBId] } });
			await db.collection('usage').deleteMany({ userId: { $in: [userAId, userBId] } });
		}
		await closeDbConnection();
	});

	it('creates distinct user records and enforces unique email constraint', async () => {
		await db.collection('users').insertOne({
			_id: userAId,
			email: emailA,
			displayName: 'User A',
			passwordHash: '$argon2id$mockhashA',
			status: 'active',
			createdAt: new Date()
		});

		await db.collection('users').insertOne({
			_id: userBId,
			email: emailB,
			displayName: 'User B',
			passwordHash: '$argon2id$mockhashB',
			status: 'active',
			createdAt: new Date()
		});

		// Attempting duplicate insert must throw E11000 duplicate key error
		await assert.rejects(
			async () => {
				await db.collection('users').insertOne({
					_id: new ObjectId(),
					email: emailA,
					displayName: 'Duplicate User',
					passwordHash: '$argon2id$mockhashDup',
					createdAt: new Date()
				});
			},
			(err) => {
				assert.ok(err.code === 11000 || err.message.includes('duplicate'));
				return true;
			}
		);
	});

	it('isolates conversation access: User B cannot retrieve User A conversation', async () => {
		const convId = new ObjectId();
		await db.collection('conversations').insertOne({
			_id: convId,
			userId: userAId,
			title: 'Quantum Physics Diagram',
			provider: 'chatgpt',
			model: 'gpt-4o-mini',
			explanationStyle: 'detailed',
			isBookmarked: false,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// User A query returns the conversation
		const foundByA = await db.collection('conversations').findOne({
			_id: convId,
			userId: userAId
		});
		assert.ok(foundByA);
		assert.equal(foundByA.title, 'Quantum Physics Diagram');

		// User B query returns null
		const foundByB = await db.collection('conversations').findOne({
			_id: convId,
			userId: userBId
		});
		assert.equal(foundByB, null, 'User B must not see User A conversation');
	});

	it('preserves chronological message timeline and isolation', async () => {
		const convId = new ObjectId();
		await db.collection('conversations').insertOne({
			_id: convId,
			userId: userAId,
			title: 'Calculus Step 1',
			createdAt: new Date()
		});

		const t1 = new Date(Date.now() - 2000);
		const t2 = new Date(Date.now() - 1000);

		await db.collection('messages').insertMany([
			{ conversationId: convId, userId: userAId, role: 'user', content: 'Solve x^2 = 4', createdAt: t1 },
			{ conversationId: convId, userId: userAId, role: 'assistant', content: 'x = 2 or x = -2', createdAt: t2 }
		]);

		const messages = await db.collection('messages')
			.find({ conversationId: convId, userId: userAId })
			.sort({ createdAt: 1 })
			.toArray();

		assert.equal(messages.length, 2);
		assert.equal(messages[0].role, 'user');
		assert.equal(messages[1].role, 'assistant');

		// User B cannot query messages for this conversation
		const unauthorizedMessages = await db.collection('messages')
			.find({ conversationId: convId, userId: userBId })
			.toArray();
		assert.equal(unauthorizedMessages.length, 0);
	});

	it('stores image in GridFS and prevents unauthorized cross-user download', async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
		const convId = new ObjectId();

		const imageId = await saveImage(fakePng, {
			userId: userAId,
			conversationId: convId,
			mimeType: 'image/png',
			filename: 'secret_document.png'
		});

		assert.ok(imageId);

		// User A is authorized to stream image
		const accessA = await getImageStream(imageId, userAId);
		assert.ok(accessA.stream);
		assert.equal(accessA.metadata.filename, 'secret_document.png');
		accessA.stream.destroy();

		// User B is rejected with IMAGE_UNAUTHORIZED
		await assert.rejects(
			async () => {
				await getImageStream(imageId, userBId);
			},
			(err) => {
				assert.equal(err.message, 'IMAGE_UNAUTHORIZED');
				return true;
			}
		);

		// Clean up GridFS images for this conversation
		await deleteImagesForConversation(convId, userAId);
		await assert.rejects(
			async () => {
				await getImageStream(imageId, userAId);
			},
			(err) => {
				assert.equal(err.message, 'IMAGE_NOT_FOUND');
				return true;
			}
		);
	});
});
