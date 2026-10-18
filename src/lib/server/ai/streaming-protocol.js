/**
 * Encodes an SSE event and payload
 * @param {string} event
 * @param {any} data
 * @returns {string}
 */
export function encodeSSE(event, data) {
	const json = typeof data === 'string' ? data : JSON.stringify(data);
	return `event: ${event}\ndata: ${json}\n\n`;
}

/**
 * Creates a standard SSE Response from an async generator or stream executor
 * @param {(emit: (event: string, data: any) => Promise<void> | void, signal: AbortSignal) => Promise<void>} executor
 * @param {AbortSignal} [signal]
 * @returns {Response}
 */
export function createSSEResponse(executor, signal) {
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			/**
			 * @param {string} event
			 * @param {any} data
			 */
			const emit = (event, data) => {
				if (signal?.aborted) return;
				try {
					controller.enqueue(encoder.encode(encodeSSE(event, data)));
				} catch (err) {
					// Controller already closed or cancelled
				}
			};

			try {
				await executor(emit, signal);
			} catch (err) {
				const errorPayload = {
					code: err?.code || 'STREAM_ERROR',
					message: err?.message || 'An unexpected error occurred during streaming.'
				};
				emit('error', errorPayload);
			} finally {
				try {
					controller.close();
				} catch (e) {
					// Already closed
				}
			}
		},
		cancel() {
			// Browser disconnected
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}
