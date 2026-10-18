import Anthropic from '@anthropic-ai/sdk';
import { AIProviderError, ERROR_CODES, mapProviderError } from './errors.js';
import { buildVisionPrompt } from './prompts.js';
import { getEnv } from './env.js';

/**
 * Analyzes an image using the official Anthropic Claude API (Non-Streaming)
 * @param {object} params
 * @param {Buffer | Uint8Array} params.imageBuffer
 * @param {string} params.mimeType
 * @param {string} [params.question]
 * @param {string} [params.explanationStyle]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ answer: string, model: string }>}
 */
export async function scanWithAnthropic({
	imageBuffer,
	mimeType,
	question,
	explanationStyle,
	signal
}) {
	const apiKey = getEnv('ANTHROPIC_API_KEY');
	if (!apiKey) {
		throw new AIProviderError(
			ERROR_CODES.PROVIDER_CONFIGURATION_ERROR,
			'Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your server environment or .env file (https://console.anthropic.com/settings/keys).',
			503
		);
	}

	const model = getEnv('ANTHROPIC_VISION_MODEL') || 'claude-3-5-sonnet-20241022';
	const base64Data = Buffer.from(imageBuffer).toString('base64');
	const { systemInstruction, prompt } = buildVisionPrompt(question, explanationStyle);

	let mediaType = mimeType;
	if (mediaType === 'image/jpg') mediaType = 'image/jpeg';

	const client = new Anthropic({ apiKey });

	try {
		const message = await client.messages.create(
			{
				model,
				max_tokens: 2048,
				system: systemInstruction,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image',
								source: {
									type: 'base64',
									media_type: mediaType,
									data: base64Data
								}
							},
							{
								type: 'text',
								text: prompt
							}
						]
					}
				]
			},
			{ signal }
		);

		const textBlock = message.content?.find((block) => block.type === 'text');
		const answer = textBlock?.text?.trim();

		if (!answer) {
			throw new AIProviderError(
				ERROR_CODES.PROVIDER_API_ERROR,
				'Claude returned an empty response for this image.',
				502
			);
		}

		return {
			answer,
			model: message.model || model
		};
	} catch (err) {
		throw mapProviderError(err, 'Anthropic Claude');
	}
}

/**
 * Streams visual analysis & multi-turn conversations via official Anthropic SDK
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
export async function scanWithAnthropicStream({
	imageBuffer,
	mimeType,
	question,
	explanationStyle,
	previousTurns = [],
	onDelta,
	signal
}) {
	const apiKey = getEnv('ANTHROPIC_API_KEY');
	if (!apiKey) {
		throw new AIProviderError(
			ERROR_CODES.PROVIDER_CONFIGURATION_ERROR,
			'Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your server environment or .env file (https://console.anthropic.com/settings/keys).',
			503
		);
	}

	const model = getEnv('ANTHROPIC_VISION_MODEL') || 'claude-3-5-sonnet-20241022';
	const { systemInstruction, prompt } = buildVisionPrompt(question, explanationStyle);

	let mediaType = mimeType || 'image/jpeg';
	if (mediaType === 'image/jpg') mediaType = 'image/jpeg';

	const base64Data = imageBuffer ? Buffer.from(imageBuffer).toString('base64') : null;
	const messages = [];

	if (previousTurns && previousTurns.length > 0) {
		for (let i = 0; i < previousTurns.length; i++) {
			const turn = previousTurns[i];
			if (i === 0 && turn.role === 'user') {
				messages.push({
					role: 'user',
					content: [
						...(base64Data
							? [
									{
										type: 'image',
										source: {
											type: 'base64',
											media_type: mediaType,
											data: base64Data
										}
									}
								]
							: []),
						{ type: 'text', text: turn.content }
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
				...(base64Data
					? [
							{
								type: 'image',
								source: {
									type: 'base64',
									media_type: mediaType,
									data: base64Data
								}
							}
						]
					: []),
				{ type: 'text', text: prompt }
			]
		});
	}

	const client = new Anthropic({ apiKey });

	try {
		const stream = await client.messages.stream(
			{
				model,
				max_tokens: 2048,
				system: systemInstruction,
				messages
			},
			{ signal }
		);

		let fullAnswer = '';
		for await (const event of stream) {
			if (signal?.aborted) break;
			if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
				const delta = event.delta.text;
				fullAnswer += delta;
				if (onDelta) onDelta(delta);
			}
		}

		return {
			fullAnswer,
			model
		};
	} catch (err) {
		throw mapProviderError(err, 'Anthropic Claude');
	}
}
