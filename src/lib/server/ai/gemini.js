import { GoogleGenAI } from '@google/genai';
import { AIProviderError, ERROR_CODES, mapProviderError } from './errors.js';
import { buildVisionPrompt } from './prompts.js';
import { getEnv } from './env.js';

/**
 * Analyzes an image using the official Google Gemini SDK (Non-Streaming)
 * @param {object} params
 * @param {Buffer | Uint8Array} params.imageBuffer
 * @param {string} params.mimeType
 * @param {string} [params.question]
 * @param {string} [params.explanationStyle]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ answer: string, model: string }>}
 */
export async function scanWithGemini({
	imageBuffer,
	mimeType,
	question,
	explanationStyle,
	signal
}) {
	const apiKey = getEnv('GEMINI_API_KEY');
	if (!apiKey) {
		throw new AIProviderError(
			ERROR_CODES.PROVIDER_CONFIGURATION_ERROR,
			'Google Gemini API key is not configured. Please set GEMINI_API_KEY in your server environment or .env file (https://aistudio.google.com/app/apikey).',
			503
		);
	}

	const model = getEnv('GEMINI_VISION_MODEL') || 'gemini-3.8-flash';
	const base64Data = Buffer.from(imageBuffer).toString('base64');
	const { systemInstruction, prompt } = buildVisionPrompt(question, explanationStyle);

	let normalizedMimeType = mimeType;
	if (normalizedMimeType === 'image/jpg') normalizedMimeType = 'image/jpeg';

	const ai = new GoogleGenAI({ apiKey });

	try {
		const response = await ai.models.generateContent({
			model,
			contents: [
				{
					role: 'user',
					parts: [
						{
							inlineData: {
								mimeType: normalizedMimeType,
								data: base64Data
							}
						},
						{ text: prompt }
					]
				}
			],
			config: {
				systemInstruction,
				temperature: 0.2
			}
		});

		const answer = response?.text?.trim();
		if (!answer) {
			throw new AIProviderError(
				ERROR_CODES.PROVIDER_API_ERROR,
				'Gemini returned an empty response for this image.',
				502
			);
		}

		return {
			answer,
			model
		};
	} catch (err) {
		throw mapProviderError(err, 'Google Gemini');
	}
}

/**
 * Streams visual analysis & multi-turn conversations via official @google/genai SDK
 * @param {object} params
 * @param {Buffer | Uint8Array} [params.imageBuffer]
 * @param {string} [params.mimeType]
 * @param {string} params.question
 * @param {string} [params.explanationStyle]
 * @param {Array<{ role: 'user' | 'assistant', content: string }>} [params.previousTurns]
 * @param {(delta: string) => void} params.onDelta
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ fullAnswer: string, model: string }>}
 */
export async function scanWithGeminiStream({
	imageBuffer,
	mimeType,
	question,
	explanationStyle,
	previousTurns = [],
	onDelta,
	signal
}) {
	const apiKey = getEnv('GEMINI_API_KEY');
	if (!apiKey) {
		throw new AIProviderError(
			ERROR_CODES.PROVIDER_CONFIGURATION_ERROR,
			'Google Gemini API key is not configured. Please set GEMINI_API_KEY in your server environment or .env file (https://aistudio.google.com/app/apikey).',
			503
		);
	}

	const model = getEnv('GEMINI_VISION_MODEL') || 'gemini-3.8-flash';
	const { systemInstruction, prompt } = buildVisionPrompt(question, explanationStyle);

	let normalizedMimeType = mimeType || 'image/jpeg';
	if (normalizedMimeType === 'image/jpg') normalizedMimeType = 'image/jpeg';

	const base64Data = imageBuffer ? Buffer.from(imageBuffer).toString('base64') : null;
	const contents = [];

	if (previousTurns && previousTurns.length > 0) {
		for (let i = 0; i < previousTurns.length; i++) {
			const turn = previousTurns[i];
			if (i === 0 && turn.role === 'user') {
				const parts = [];
				if (base64Data) {
					parts.push({
						inlineData: {
							mimeType: normalizedMimeType,
							data: base64Data
						}
					});
				}
				parts.push({ text: turn.content });
				contents.push({ role: 'user', parts });
			} else {
				contents.push({
					role: turn.role === 'assistant' ? 'model' : 'user',
					parts: [{ text: turn.content }]
				});
			}
		}
		contents.push({ role: 'user', parts: [{ text: prompt }] });
	} else {
		const parts = [];
		if (base64Data) {
			parts.push({
				inlineData: {
					mimeType: normalizedMimeType,
					data: base64Data
				}
			});
		}
		parts.push({ text: prompt });
		contents.push({ role: 'user', parts });
	}

	const ai = new GoogleGenAI({ apiKey });

	try {
		const responseStream = await ai.models.generateContentStream({
			model,
			contents,
			config: {
				systemInstruction,
				temperature: 0.2
			}
		});

		let fullAnswer = '';
		for await (const chunk of responseStream) {
			if (signal?.aborted) break;
			const delta = chunk.text;
			if (delta) {
				fullAnswer += delta;
				if (onDelta) onDelta(delta);
			}
		}

		return {
			fullAnswer,
			model
		};
	} catch (err) {
		throw mapProviderError(err, 'Google Gemini');
	}
}
