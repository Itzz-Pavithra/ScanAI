/**
 * Asynchronously iterates over Server-Sent Events from a ReadableStream
 * @param {ReadableStream<Uint8Array>} stream
 * @returns {AsyncGenerator<{ event: string, data: any }, void, unknown>}
 */
export async function* iterateSSEStream(stream) {
	const reader = stream.getReader();
	const decoder = new TextDecoder('utf-8');
	let buffer = '';

	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// Messages are separated by double newlines
			const parts = buffer.split('\n\n');
			// Keep incomplete remainder in buffer
			buffer = parts.pop() || '';

			for (const block of parts) {
				if (!block.trim()) continue;

				let eventType = 'message';
				let dataText = '';

				const lines = block.split('\n');
				for (const line of lines) {
					if (line.startsWith('event:')) {
						eventType = line.slice(6).trim();
					} else if (line.startsWith('data:')) {
						dataText = line.slice(5).trim();
					}
				}

				if (dataText) {
					try {
						const parsed = JSON.parse(dataText);
						yield { event: eventType, data: parsed };
					} catch (e) {
						yield { event: eventType, data: dataText };
					}
				}
			}
		}

		// Flush trailing buffer
		if (buffer.trim()) {
			let eventType = 'message';
			let dataText = '';
			const lines = buffer.split('\n');
			for (const line of lines) {
				if (line.startsWith('event:')) eventType = line.slice(6).trim();
				else if (line.startsWith('data:')) dataText = line.slice(5).trim();
			}
			if (dataText) {
				try {
					yield { event: eventType, data: JSON.parse(dataText) };
				} catch (e) {
					yield { event: eventType, data: dataText };
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}
