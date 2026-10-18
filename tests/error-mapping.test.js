import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapProviderError, ERROR_CODES, AIProviderError } from '../src/lib/server/ai/errors.js';

describe('Error Mapping & Normalization', () => {
	it('maps 401 unauthorized to PROVIDER_AUTH_ERROR', () => {
		const err = { status: 401, message: 'Invalid API key provided' };
		const mapped = mapProviderError(err, 'OpenAI');
		assert.equal(mapped.code, ERROR_CODES.PROVIDER_AUTH_ERROR);
		assert.equal(mapped.status, 401);
		assert.ok(mapped.message.includes('Invalid API key for OpenAI'));
	});

	it('maps 429 quota/rate limit to PROVIDER_RATE_LIMIT', () => {
		const err = { status: 429, message: 'Rate limit reached' };
		const mapped = mapProviderError(err, 'Claude');
		assert.equal(mapped.code, ERROR_CODES.PROVIDER_RATE_LIMIT);
		assert.equal(mapped.status, 429);
		assert.ok(mapped.message.includes('quota or rate limit exceeded'));
	});

	it('maps AbortError to REQUEST_CANCELLED', () => {
		const err = { name: 'AbortError', message: 'The user aborted a request' };
		const mapped = mapProviderError(err, 'Gemini');
		assert.equal(mapped.code, ERROR_CODES.REQUEST_CANCELLED);
		assert.equal(mapped.status, 499);
	});

	it('maps timeout errors to PROVIDER_TIMEOUT', () => {
		const err = { status: 504, message: 'Gateway timeout' };
		const mapped = mapProviderError(err, 'OpenAI');
		assert.equal(mapped.code, ERROR_CODES.PROVIDER_TIMEOUT);
		assert.equal(mapped.status, 504);
	});

	it('returns original AIProviderError if already typed', () => {
		const custom = new AIProviderError(ERROR_CODES.PROVIDER_CONFIGURATION_ERROR, 'Config issue', 503);
		const mapped = mapProviderError(custom, 'Gemini');
		assert.equal(mapped, custom);
	});
});
