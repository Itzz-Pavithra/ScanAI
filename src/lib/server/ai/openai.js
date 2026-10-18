import OpenAI from 'openai';
import { AIProviderError, ERROR_CODES, mapProviderError } from './errors.js';
import { buildVisionPrompt } from './prompts.js';
import { getEnv } from './env.js';

/**
 * Analyzes an image using the official OpenAI API (Non-Streaming)
 * @param {object} params
 * @param {Buffer | Uint8Array} params.imageBuffer
 * @param {string} params.mimeType
 * @param {string} [params.question]
 * @param {string} [params.explanationStyle]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ answer: string, model: string }>}
 */
export async function scanWithOpenAI({
	imageBuffer,
	mimeType,
	question,
	explanationStyle,
	signal
}) {
	const apiKey = getEnv('OPENAI_API_KEY');
	if (!apiKey) {
		throw new AIProviderError(
			ERROR_CODES.PROVIDER_CONFIGURATION_ERROR,
			'OpenAI API key is not configured. Please set OPENAI_API_KEY in your server environment or .env file (https://platform.openai.com/api-keys).',
			503
		);
	}

	const model = getEnv('OPENAI_VISION_MODEL') || 'gpt-4o-mini';
	const base64Image = Buffer.from(imageBuffer).toString('base64');
	const dataUrl = `data:${mimeType};base64,${base64Image}`;
	const { systemInstruction, prompt } = buildVisionPrompt(question, explanationStyle);

	const client = new OpenAI({ apiKey });

	try {
		const response = await client.chat.completions.create(
			{
				model,
				messages: [
					{
						role: 'system',
						content: systemInstruction
					},
					{
						role: 'user',
						content: [
							{ type: 'text', text: prompt },
							{
								type: 'image_url',
								image_url: {
									url: dataUrl,
									detail: 'auto'
								}
							}
						]
					}
				],
				max_tokens: 2048,
				temperature: 0.2
			},
			{ signal }
		);

		const answer = response.choices?.[0]?.message?.content?.trim();
		if (!answer) {
			throw new AIProviderError(
				ERROR_CODES.PROVIDER_API_ERROR,
				'OpenAI returned an empty response for this image.',
				502
			);
		}

		return {
			answer,
			model: response.model || model
		};
	} catch (err) {
		throw mapProviderError(err, 'OpenAI');
	}
}

/**
 * Streams visual analysis & multi-turn follow-ups via official OpenAI SDK
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
export async function scanWithOpenAIStream({
	imageBuffer,
	mimeType,
	question,
	explanationStyle,
	previousTurns = [],
	onDelta,
	signal
}) {
	const apiKey = getEnv('OPENAI_API_KEY');
	if (!apiKey) {
		throw new AIProviderError(
			ERROR_CODES.PROVIDER_CONFIGURATION_ERROR,
			'OpenAI API key is not configured. Please set OPENAI_API_KEY in your server environment or .env file (https://platform.openai.com/api-keys).',
			503
		);
	}

	const model = getEnv('OPENAI_VISION_MODEL') || 'gpt-4o-mini';
	const { systemInstruction, prompt } = buildVisionPrompt(question, explanationStyle);
	const dataUrl = imageBuffer ? `data:${mimeType || 'image/jpeg'};base64,${Buffer.from(imageBuffer).toString('base64')}` : null;

	const messages = [{ role: 'system', content: systemInstruction }];

	if (previousTurns && previousTurns.length > 0) {
		for (let i = 0; i < previousTurns.length; i++) {
			const turn = previousTurns[i];
			if (i === 0 && turn.role === 'user') {
				messages.push({
					role: 'user',
					content: [
						{ type: 'text', text: turn.content },
						...(dataUrl ? [{ type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } }] : [])
					]
				});
			} else {
				messages.push({
					role: turn.role === 'assistant' ? 'assistant' : 'user',
					content: turn.content
				});
			}
		}
		messages.push({ role: 'user', content: prompt });
	} else {
		messages.push({
			role: 'user',
			content: [
				{ type: 'text', text: prompt },
				...(dataUrl ? [{ type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } }] : [])
			]
		});
	}

	const client = new OpenAI({ apiKey });

	try {
		const stream = await client.chat.completions.create(
			{
				model,
				messages,
				stream: true,
				max_tokens: 2048,
				temperature: 0.2
			},
			{ signal }
		);

		let fullAnswer = '';
		for await (const chunk of stream) {
			if (signal?.aborted) break;
			const delta = chunk.choices?.[0]?.delta?.content || '';
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
		throw mapProviderError(err, 'OpenAI');
	}
}
