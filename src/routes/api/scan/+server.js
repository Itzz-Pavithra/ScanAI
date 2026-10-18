import { json } from '@sveltejs/kit';
import { scanImage, normalizeProvider } from '$lib/server/ai/index.js';
import { validateImageBuffer } from '$lib/server/ai/image-validator.js';
import { AIProviderError, ERROR_CODES } from '$lib/server/ai/errors.js';

const MAX_QUESTION_LENGTH = 4000;

/**
 * Handles image scan requests via multipart/form-data
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request }) {
	const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

	try {
		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('multipart/form-data')) {
			return json(
				{
					success: false,
					error: {
						code: ERROR_CODES.INVALID_REQUEST_ERROR,
						message: 'Invalid Content-Type. Request must be multipart/form-data.'
					},
					requestId
				},
				{ status: 400 }
			);
		}

		let formData;
		try {
			formData = await request.formData();
		} catch (err) {
			return json(
				{
					success: false,
					error: {
						code: ERROR_CODES.INVALID_REQUEST_ERROR,
						message: 'Failed to parse form-data payload.'
					},
					requestId
				},
				{ status: 400 }
			);
		}

		// 1. Extract and validate provider
		const rawProvider = formData.get('provider')?.toString()?.trim();
		if (!rawProvider) {
			return json(
				{
					success: false,
					error: {
						code: ERROR_CODES.INVALID_REQUEST_ERROR,
						message: 'Missing "provider" field in request. Choose chatgpt, claude, or gemini.'
					},
					requestId
				},
				{ status: 400 }
			);
		}

		let provider;
		try {
			provider = normalizeProvider(rawProvider);
		} catch (err) {
			return json(
				{
					success: false,
					error: {
						code: ERROR_CODES.INVALID_REQUEST_ERROR,
						message: err.message
					},
					requestId
				},
				{ status: 400 }
			);
		}

		// 2. Extract and validate image
		const imageEntry = formData.get('image');
		if (!imageEntry || typeof imageEntry === 'string') {
			return json(
				{
					success: false,
					error: {
						code: ERROR_CODES.INVALID_REQUEST_ERROR,
						message: 'Missing "image" file in request.'
					},
					requestId
				},
				{ status: 400 }
			);
		}

		const fileBlob = /** @type {File} */ (imageEntry);
		const arrayBuffer = await fileBlob.arrayBuffer();
		const imageBuffer = Buffer.from(arrayBuffer);

		// Validate magic bytes and format
		const validatedImage = validateImageBuffer(imageBuffer, fileBlob.type);

		// 3. Extract and validate question & explanation style
		const rawQuestion = formData.get('question')?.toString()?.trim() || '';
		if (rawQuestion.length > MAX_QUESTION_LENGTH) {
			return json(
				{
					success: false,
					error: {
						code: ERROR_CODES.INVALID_REQUEST_ERROR,
						message: `Question text is too long (${rawQuestion.length} chars). Maximum allowed is ${MAX_QUESTION_LENGTH} characters.`
					},
					requestId
				},
				{ status: 400 }
			);
		}

		const explanationStyle = formData.get('explanationStyle')?.toString()?.trim() || 'step-by-step';

		// 4. Execute scan with provider adapter
		const scanResult = await scanImage({
			provider,
			imageBuffer,
			mimeType: validatedImage.mimeType,
			question: rawQuestion,
			explanationStyle,
			signal: request.signal
		});

		return json({
			...scanResult,
			requestId
		});
	} catch (err) {
		const isProviderError = err instanceof AIProviderError;
		const status = isProviderError ? err.status : 500;
		const code = isProviderError ? err.code : ERROR_CODES.UNKNOWN_ERROR;
		const message = err?.message || 'An unexpected server error occurred while scanning the image.';

		return json(
			{
				success: false,
				error: {
					code,
					message
				},
				requestId
			},
			{ status }
		);
	}
}
