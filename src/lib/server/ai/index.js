import { scanWithOpenAI, scanWithOpenAIStream } from './openai.js';
import { scanWithAnthropic, scanWithAnthropicStream } from './anthropic.js';
import { scanWithGemini, scanWithGeminiStream } from './gemini.js';
import { AIProviderError, ERROR_CODES } from './errors.js';

export const SUPPORTED_PROVIDERS = ['chatgpt', 'openai', 'claude', 'anthropic', 'gemini', 'google'];

/**
 * Normalizes provider identifier
 * @param {string} provider
 * @returns {'chatgpt' | 'claude' | 'gemini'}
 */
export function normalizeProvider(provider) {
	const p = provider?.toLowerCase()?.trim();
	if (p === 'chatgpt' || p === 'openai') return 'chatgpt';
	if (p === 'claude' || p === 'anthropic') return 'claude';
	if (p === 'gemini' || p === 'google') return 'gemini';

	throw new AIProviderError(
		ERROR_CODES.INVALID_REQUEST_ERROR,
		`Unsupported AI provider "${provider}". Supported providers are: chatgpt, claude, gemini.`,
		400
	);
}

/**
 * Executes image scan using the appropriate provider adapter (Non-Streaming)
 * @param {object} params
 * @param {string} params.provider
 * @param {Buffer | Uint8Array} params.imageBuffer
 * @param {string} params.mimeType
 * @param {string} [params.question]
 * @param {string} [params.explanationStyle]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{
 *   success: true,
 *   provider: string,
 *   model: string,
 *   answer: string,
 *   explanationStyle: string,
 *   requestId: string,
 *   timestamp: string
 * }>}
 */
export async function scanImage({
	provider,
	imageBuffer,
	mimeType,
	question,
	explanationStyle = 'step-by-step',
	signal
}) {
	const normalizedProvider = normalizeProvider(provider);
	const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

	let result;
	if (normalizedProvider === 'chatgpt') {
		result = await scanWithOpenAI({
			imageBuffer,
			mimeType,
			question,
			explanationStyle,
			signal
		});
	} else if (normalizedProvider === 'claude') {
		result = await scanWithAnthropic({
			imageBuffer,
			mimeType,
			question,
			explanationStyle,
			signal
		});
	} else {
		result = await scanWithGemini({
			imageBuffer,
			mimeType,
			question,
			explanationStyle,
			signal
		});
	}

	return {
		success: true,
		provider: normalizedProvider,
		model: result.model,
		answer: result.answer,
		explanationStyle,
		requestId,
		timestamp: new Date().toISOString()
	};
}

/**
 * Streams image scan & multi-turn visual conversations
 * @param {object} params
 * @param {string} params.provider
 * @param {Buffer | Uint8Array} [params.imageBuffer]
 * @param {string} [params.mimeType]
 * @param {string} params.question
 * @param {string} [params.explanationStyle]
 * @param {Array<{ role: 'user' | 'assistant', content: string }>} [params.previousTurns]
 * @param {(delta: string) => void} params.onDelta
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{
 *   fullAnswer: string,
 *   model: string,
 *   provider: string,
 *   requestId: string
 * }>}
 */
export async function scanImageStream({
	provider,
	imageBuffer,
	mimeType,
	question,
	explanationStyle = 'step-by-step',
	previousTurns = [],
	onDelta,
	signal
}) {
	const normalizedProvider = normalizeProvider(provider);
	const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

	let result;
	if (normalizedProvider === 'chatgpt') {
		result = await scanWithOpenAIStream({
			imageBuffer,
			mimeType,
			question,
			explanationStyle,
			previousTurns,
			onDelta,
			signal
		});
	} else if (normalizedProvider === 'claude') {
		result = await scanWithAnthropicStream({
			imageBuffer,
			mimeType,
			question,
			explanationStyle,
			previousTurns,
			onDelta,
			signal
		});
	} else {
		result = await scanWithGeminiStream({
			imageBuffer,
			mimeType,
			question,
			explanationStyle,
			previousTurns,
			onDelta,
			signal
		});
	}

	return {
		fullAnswer: result.fullAnswer,
		model: result.model,
		provider: normalizedProvider,
		requestId
	};
}

import { getEnv } from './env.js';

/**
 * Returns configuration status for providers without exposing secrets
 * @returns {{
 *   chatgpt: { configured: boolean, model: string },
 *   claude: { configured: boolean, model: string },
 *   gemini: { configured: boolean, model: string }
 * }}
 */
export function getProviderConfigStatus() {
	return {
		chatgpt: {
			configured: Boolean(getEnv('OPENAI_API_KEY')),
			model: getEnv('OPENAI_VISION_MODEL') || 'gpt-4o-mini'
		},
		claude: {
			configured: Boolean(getEnv('ANTHROPIC_API_KEY')),
			model: getEnv('ANTHROPIC_VISION_MODEL') || 'claude-3-5-sonnet-20241022'
		},
		gemini: {
			configured: Boolean(getEnv('GEMINI_API_KEY')),
			model: getEnv('GEMINI_VISION_MODEL') || 'gemini-3.8-flash'
		}
	};
}
