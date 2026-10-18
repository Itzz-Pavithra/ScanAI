import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { scanWithOpenAI } from '../src/lib/server/ai/openai.js';
import { scanWithAnthropic } from '../src/lib/server/ai/anthropic.js';
import { scanWithGemini } from '../src/lib/server/ai/gemini.js';
import { ERROR_CODES, AIProviderError } from '../src/lib/server/ai/errors.js';

describe('Missing API Key Detection', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		delete process.env.OPENAI_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.GEMINI_API_KEY;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it('throws PROVIDER_CONFIGURATION_ERROR for OpenAI when OPENAI_API_KEY is missing', async () => {
		await assert.rejects(
			async () => {
				await scanWithOpenAI({
					imageBuffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
					mimeType: 'image/png'
				});
			},
			(err) => {
				assert.equal(err.code, ERROR_CODES.PROVIDER_CONFIGURATION_ERROR);
				assert.equal(err.status, 503);
				return true;
			}
		);
	});

	it('throws PROVIDER_CONFIGURATION_ERROR for Anthropic when ANTHROPIC_API_KEY is missing', async () => {
		await assert.rejects(
			async () => {
				await scanWithAnthropic({
					imageBuffer: Buffer.from([0xff, 0xd8, 0xff]),
					mimeType: 'image/jpeg'
				});
			},
			(err) => {
				assert.equal(err.code, ERROR_CODES.PROVIDER_CONFIGURATION_ERROR);
				assert.equal(err.status, 503);
				return true;
			}
		);
	});

	it('throws PROVIDER_CONFIGURATION_ERROR for Gemini when GEMINI_API_KEY is missing', async () => {
		await assert.rejects(
			async () => {
				await scanWithGemini({
					imageBuffer: Buffer.from([0x52, 0x49, 0x46, 0x46]),
					mimeType: 'image/webp'
				});
			},
			(err) => {
				assert.equal(err.code, ERROR_CODES.PROVIDER_CONFIGURATION_ERROR);
				assert.equal(err.status, 503);
				return true;
			}
		);
	});
});
