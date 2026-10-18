import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProvider } from '../src/lib/server/ai/index.js';
import { AIProviderError } from '../src/lib/server/ai/errors.js';

describe('Provider Validation & Normalization', () => {
	it('normalizes chatgpt and openai to chatgpt', () => {
		assert.equal(normalizeProvider('chatgpt'), 'chatgpt');
		assert.equal(normalizeProvider('ChatGPT'), 'chatgpt');
		assert.equal(normalizeProvider('openai'), 'chatgpt');
		assert.equal(normalizeProvider('OpenAI'), 'chatgpt');
	});

	it('normalizes claude and anthropic to claude', () => {
		assert.equal(normalizeProvider('claude'), 'claude');
		assert.equal(normalizeProvider('Claude'), 'claude');
		assert.equal(normalizeProvider('anthropic'), 'claude');
	});

	it('normalizes gemini and google to gemini', () => {
		assert.equal(normalizeProvider('gemini'), 'gemini');
		assert.equal(normalizeProvider('Gemini'), 'gemini');
		assert.equal(normalizeProvider('google'), 'gemini');
	});

	it('throws AIProviderError for unsupported providers', () => {
		assert.throws(() => normalizeProvider('deepseek'), AIProviderError);
		assert.throws(() => normalizeProvider(''), AIProviderError);
		assert.throws(() => normalizeProvider(null), AIProviderError);
	});
});
