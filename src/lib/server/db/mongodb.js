import { MongoClient, GridFSBucket } from 'mongodb';
import { getEnv } from '../ai/env.js';

/** @type {MongoClient | null} */
let clientInstance = null;
/** @type {Promise<MongoClient> | null} */
let clientPromise = null;
let indexesEnsured = false;

/**
 * Retrieves or initializes the shared MongoDB client instance
 * @returns {Promise<MongoClient>}
 */
export async function getMongoClient() {
	if (clientInstance) {
		return clientInstance;
	}

	if (!clientPromise) {
		const uri = getEnv('MONGODB_URI') || 'mongodb://127.0.0.1:27017';
		const client = new MongoClient(uri, {
			maxPoolSize: 20,
			minPoolSize: 2,
			serverSelectionTimeoutMS: 5000,
			connectTimeoutMS: 10000
		});

		clientPromise = client.connect().then(async (connectedClient) => {
			clientInstance = connectedClient;
			try {
				await ensureIndexes(connectedClient);
			} catch (err) {
				console.warn('[MongoDB] Index creation notice:', err.message);
			}
			return connectedClient;
		}).catch(async (err) => {
			clientPromise = null;
			if (!uri.includes('127.0.0.1') && !uri.includes('localhost')) {
				console.warn(`[MongoDB] Primary connection failed (${err.message}). Attempting fallback to local instance...`);
				try {
					const localClient = new MongoClient('mongodb://127.0.0.1:27017', {
						maxPoolSize: 20,
						serverSelectionTimeoutMS: 3000
					});
					const connectedLocal = await localClient.connect();
					clientInstance = connectedLocal;
					try {
						await ensureIndexes(connectedLocal);
					} catch (e) {}
					return connectedLocal;
				} catch (localErr) {
					// Fall through to throw original error
				}
			}
			throw new Error(`Failed to connect to MongoDB: ${err.message}`);
		});
	}

	return clientPromise;
}

/**
 * Retrieves the application database instance
 * @param {string} [customDbName]
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb(customDbName) {
	const client = await getMongoClient();
	const dbName = customDbName || getEnv('MONGODB_DB_NAME') || 'scanai';
	return client.db(dbName);
}

/**
 * Retrieves the GridFS bucket for secure image storage
 * @returns {Promise<GridFSBucket>}
 */
export async function getGridFSBucket() {
	const db = await getDb();
	return new GridFSBucket(db, { bucketName: 'scan_images' });
}

/**
 * Ensures optimal performance and uniqueness indexes
 * @param {MongoClient} client
 */
export async function ensureIndexes(client) {
	if (indexesEnsured) return;
	const db = client.db(getEnv('MONGODB_DB_NAME') || 'scanai');

	// Users: unique email index
	await db.collection('users').createIndex(
		{ email: 1 },
		{ unique: true, background: true }
	);

	// Sessions: lookup by token hash, and TTL for expired sessions
	await db.collection('sessions').createIndex(
		{ tokenHash: 1 },
		{ unique: true, background: true }
	);
	await db.collection('sessions').createIndex(
		{ expiresAt: 1 },
		{ expireAfterSeconds: 0, background: true }
	);
	await db.collection('sessions').createIndex(
		{ userId: 1 },
		{ background: true }
	);

	// Conversations: owner query, sorting, bookmarks, and sharing
	await db.collection('conversations').createIndex(
		{ userId: 1, updatedAt: -1 },
		{ background: true }
	);
	await db.collection('conversations').createIndex(
		{ userId: 1, isBookmarked: 1 },
		{ background: true }
	);
	await db.collection('conversations').createIndex(
		{ shareTokenHash: 1 },
		{ sparse: true, background: true }
	);

	// Messages: conversation timeline ordered
	await db.collection('messages').createIndex(
		{ conversationId: 1, createdAt: 1 },
		{ background: true }
	);
	await db.collection('messages').createIndex(
		{ userId: 1 },
		{ background: true }
	);

	// Usage tracking: user limit queries and unique requests
	await db.collection('usage').createIndex(
		{ userId: 1, timestamp: -1 },
		{ background: true }
	);
	await db.collection('usage').createIndex(
		{ requestId: 1 },
		{ unique: true, sparse: true, background: true }
	);

	indexesEnsured = true;
}

/**
 * Closes the MongoDB connection (useful for tests or graceful shutdown)
 */
export async function closeDbConnection() {
	if (clientInstance) {
		await clientInstance.close();
		clientInstance = null;
		clientPromise = null;
		indexesEnsured = false;
	}
}
