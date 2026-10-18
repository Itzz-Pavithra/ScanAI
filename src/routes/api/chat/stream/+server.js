import { ObjectId } from 'mongodb';
import { scanImageStream, normalizeProvider } from '$lib/server/ai/index.js';
import { validateImageBuffer } from '$lib/server/ai/image-validator.js';
import { AIProviderError, ERROR_CODES } from '$lib/server/ai/errors.js';
import { createSSEResponse } from '$lib/server/ai/streaming-protocol.js';
import { parseAIResponse } from '$lib/utils/response-parser.js';
import { getDb } from '$lib/server/db/mongodb.js';
import { saveImage } from '$lib/server/db/images.js';

const MAX_QUESTION_LENGTH = 4000;
const MAX_PREVIOUS_TURNS = 20;
const DAILY_SCAN_LIMIT = 50;

/**
 * Handles streaming visual chat and follow-ups via SSE with persistent storage
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals }) {
	const contentType = request.headers.get('content-type') || '';
	if (!contentType.includes('multipart/form-data')) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: ERROR_CODES.INVALID_REQUEST_ERROR,
					message: 'Invalid Content-Type. Request must be multipart/form-data.'
				}
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	let formData;
	try {
		formData = await request.formData();
	} catch (err) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: ERROR_CODES.INVALID_REQUEST_ERROR,
					message: 'Failed to parse form-data payload.'
				}
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	// 1. Validate Provider
	const rawProvider = formData.get('provider')?.toString()?.trim();
	if (!rawProvider) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: ERROR_CODES.INVALID_REQUEST_ERROR,
					message: 'Missing "provider" field in request. Choose chatgpt, claude, or gemini.'
				}
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	let provider;
	try {
		provider = normalizeProvider(rawProvider);
	} catch (err) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: ERROR_CODES.INVALID_REQUEST_ERROR,
					message: err.message
				}
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	// 2. Enforce Daily Usage Limit for Authenticated Users
	let userObjId = null;
	let db = null;

	if (locals.user) {
		userObjId = new ObjectId(locals.user.id);
		try {
			db = await getDb();
			const startOfDay = new Date();
			startOfDay.setHours(0, 0, 0, 0);

			const todayScans = await db.collection('usage').countDocuments({
				userId: userObjId,
				timestamp: { $gte: startOfDay }
			});

			if (todayScans >= DAILY_SCAN_LIMIT) {
				return new Response(
					JSON.stringify({
						success: false,
						error: {
							code: 'USAGE_LIMIT_EXCEEDED',
							message: `Daily scan allowance reached (${DAILY_SCAN_LIMIT} scans/day). Please try again tomorrow.`
						}
					}),
					{ status: 429, headers: { 'Content-Type': 'application/json' } }
				);
			}
		} catch (e) {
			console.warn('[Usage Check Warning]:', e.message);
		}
	}

	// 3. Validate Question
	const rawQuestion = formData.get('question')?.toString()?.trim() || '';
	if (rawQuestion.length > MAX_QUESTION_LENGTH) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: ERROR_CODES.INVALID_REQUEST_ERROR,
					message: `Question text is too long (${rawQuestion.length} chars). Max allowed is ${MAX_QUESTION_LENGTH}.`
				}
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const explanationStyle = formData.get('explanationStyle')?.toString()?.trim() || 'step-by-step';
	const rawConversationId = formData.get('conversationId')?.toString()?.trim();

	// 4. Parse previous turns
	let previousTurns = [];
	const rawPreviousTurns = formData.get('previousTurns')?.toString()?.trim();
	if (rawPreviousTurns) {
		try {
			const parsed = JSON.parse(rawPreviousTurns);
			if (Array.isArray(parsed)) {
				previousTurns = parsed
					.slice(-MAX_PREVIOUS_TURNS)
					.filter(
						(turn) =>
							turn &&
							(turn.role === 'user' || turn.role === 'assistant') &&
							typeof turn.content === 'string' &&
							turn.content.trim().length > 0
					)
					.map((turn) => ({
						role: turn.role,
						content: turn.content.slice(0, MAX_QUESTION_LENGTH)
					}));
			}
		} catch (e) {
			previousTurns = [];
		}
	}

	// 5. Validate Image if provided
	let imageBuffer = null;
	let mimeType = 'image/jpeg';
	let fileBlobName = 'scan.jpg';
	const imageEntry = formData.get('image');

	if (imageEntry && typeof imageEntry !== 'string') {
		const fileBlob = /** @type {File} */ (imageEntry);
		fileBlobName = fileBlob.name || 'scan.jpg';
		const arrayBuffer = await fileBlob.arrayBuffer();
		imageBuffer = Buffer.from(arrayBuffer);
		const validated = validateImageBuffer(imageBuffer, fileBlob.type);
		mimeType = validated.mimeType;
	} else if (previousTurns.length === 0) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: ERROR_CODES.INVALID_REQUEST_ERROR,
					message: 'An image is required to initiate a visual scanning conversation.'
				}
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	// 6. Manage Persistent Conversation if Authenticated
	let persistentConvId = null;
	if (userObjId && db) {
		try {
			if (rawConversationId && ObjectId.isValid(rawConversationId)) {
				const existing = await db.collection('conversations').findOne({
					_id: new ObjectId(rawConversationId),
					userId: userObjId
				});
				if (existing) {
					persistentConvId = existing._id;
				}
			}

			if (!persistentConvId) {
				const autoTitle = (rawQuestion || 'Visual Scan').slice(0, 60);
				const now = new Date();
				const insertRes = await db.collection('conversations').insertOne({
					userId: userObjId,
					title: autoTitle,
					provider,
					model: 'auto',
					explanationStyle,
					imageId: null,
					imageMetadata: null,
					isBookmarked: false,
					tags: [],
					shareEnabled: false,
					shareTokenHash: null,
					createdAt: now,
					updatedAt: now,
					lastActivityAt: now
				});
				persistentConvId = insertRes.insertedId;
			}

			// Store image into GridFS if this request contains an image
			if (imageBuffer) {
				try {
					const gridFsImageId = await saveImage(imageBuffer, {
						userId: userObjId,
						conversationId: persistentConvId,
						mimeType,
						filename: fileBlobName
					});

					await db.collection('conversations').updateOne(
						{ _id: persistentConvId },
						{
							$set: {
								imageId: gridFsImageId,
								imageMetadata: {
									filename: fileBlobName,
									mimeType,
									size: imageBuffer.length
								}
							}
						}
					);
				} catch (imgErr) {
					console.warn('[GridFS Save Warning]:', imgErr.message);
				}
			}

			// Save the user question into messages
			await db.collection('messages').insertOne({
				conversationId: persistentConvId,
				userId: userObjId,
				role: 'user',
				content: rawQuestion,
				createdAt: new Date()
			});
		} catch (dbErr) {
			console.warn('[Persistence Init Warning]:', dbErr.message);
		}
	}

	const activeConvId = persistentConvId ? persistentConvId.toString() : rawConversationId || `conv_${Date.now()}`;

	// 7. Return SSE Stream
	return createSSEResponse(async (emit, signal) => {
		const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
		let accumulatedAnswer = '';

		emit('start', {
			requestId,
			conversationId: activeConvId,
			provider,
			explanationStyle
		});

		try {
			const result = await scanImageStream({
				provider,
				imageBuffer,
				mimeType,
				question: rawQuestion,
				explanationStyle,
				previousTurns,
				onDelta: (delta) => {
					accumulatedAnswer += delta;
					emit('delta', { text: delta });
				},
				signal
			});

			const parsed = parseAIResponse(result.fullAnswer);

			// Persist assistant message and usage on success
			if (userObjId && db && persistentConvId) {
				try {
					await db.collection('messages').insertOne({
						conversationId: persistentConvId,
						userId: userObjId,
						role: 'assistant',
						content: result.fullAnswer,
						model: result.model,
						provider: result.provider,
						interrupted: false,
						requestId,
						createdAt: new Date()
					});

					await db.collection('conversations').updateOne(
						{ _id: persistentConvId },
						{
							$set: {
								model: result.model,
								updatedAt: new Date(),
								lastActivityAt: new Date()
							}
						}
					);

					await db.collection('usage').insertOne({
						userId: userObjId,
						provider: result.provider,
						model: result.model,
						requestId,
						timestamp: new Date(),
						outcome: 'success',
						tokenReporting: 'unavailable'
					});
				} catch (persistErr) {
					console.warn('[Persistence Save Warning]:', persistErr.message);
				}
			}

			emit('complete', {
				requestId,
				conversationId: activeConvId,
				provider: result.provider,
				model: result.model,
				fullAnswer: result.fullAnswer,
				summary: parsed.summary,
				steps: parsed.steps,
				insights: parsed.insights,
				codeOrFormula: parsed.codeOrFormula
			});
		} catch (streamErr) {
			// On partial stream or error, save interrupted state and failed usage
			if (userObjId && db && persistentConvId) {
				try {
					if (accumulatedAnswer.trim()) {
						await db.collection('messages').insertOne({
							conversationId: persistentConvId,
							userId: userObjId,
							role: 'assistant',
							content: accumulatedAnswer,
							model: 'unknown',
							provider,
							interrupted: true,
							requestId,
							createdAt: new Date()
						});
					}

					await db.collection('usage').insertOne({
						userId: userObjId,
						provider,
						model: 'unknown',
						requestId,
						timestamp: new Date(),
						outcome: signal?.aborted ? 'cancelled' : 'failed',
						tokenReporting: 'unavailable'
					});
				} catch (e) {}
			}
			throw streamErr;
		}
	}, request.signal);
}
