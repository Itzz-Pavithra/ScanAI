import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeSSE, createSSEResponse } from '../src/lib/server/ai/streaming-protocol.js';

describe('Streaming SSE Protocol', () => {
	it('encodes start, delta, complete, and error events according to SSE specification', () => {
		const startEvent = encodeSSE('start', { requestId: 'req_123', provider: 'gemini' });
		assert.equal(startEvent, 'event: start\ndata: {"requestId":"req_123","provider":"gemini"}\n\n');

		const deltaEvent = encodeSSE('delta', { text: 'Analyzing diagram...' });
		assert.equal(deltaEvent, 'event: delta\ndata: {"text":"Analyzing diagram..."}\n\n');

		const completeEvent = encodeSSE('complete', { conversationId: 'conv_1', model: 'gemini-2.5-flash' });
		assert.equal(completeEvent, 'event: complete\ndata: {"conversationId":"conv_1","model":"gemini-2.5-flash"}\n\n');

		const errorEvent = encodeSSE('error', { code: 'PROVIDER_RATE_LIMIT', message: 'Rate limit' });
		assert.equal(errorEvent, 'event: error\ndata: {"code":"PROVIDER_RATE_LIMIT","message":"Rate limit"}\n\n');
	});

	it('creates SSE Response with correct headers and Content-Type', () => {
		const res = createSSEResponse(async (emit) => {
			emit('delta', { text: 'hello' });
		});

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/event-stream; charset=utf-8');
		assert.equal(res.headers.get('Cache-Control'), 'no-cache, no-transform');
		assert.equal(res.headers.get('Connection'), 'keep-alive');
	});

	it('handles stream errors by emitting error event', async () => {
		const res = createSSEResponse(async () => {
			const err = new Error('Upstream failed');
			err.code = 'UPSTREAM_FAIL';
			throw err;
		});

		const text = await res.text();
		assert.ok(text.includes('event: error'));
		assert.ok(text.includes('Upstream failed'));
	});
});
