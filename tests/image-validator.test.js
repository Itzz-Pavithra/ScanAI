import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateImageBuffer, MAX_IMAGE_BYTES } from '../src/lib/server/ai/image-validator.js';
import { AIProviderError } from '../src/lib/server/ai/errors.js';

describe('Image Binary Validation', () => {
	it('identifies valid PNG magic bytes', () => {
		const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
		const result = validateImageBuffer(pngHeader, 'image/png');
		assert.equal(result.valid, true);
		assert.equal(result.mimeType, 'image/png');
	});

	it('identifies valid JPEG magic bytes', () => {
		const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
		const result = validateImageBuffer(jpegHeader, 'image/jpeg');
		assert.equal(result.valid, true);
		assert.equal(result.mimeType, 'image/jpeg');
	});

	it('identifies valid WEBP magic bytes', () => {
		const webpHeader = Buffer.from([
			0x52, 0x49, 0x46, 0x46, // RIFF
			0x20, 0x00, 0x00, 0x00, // size
			0x57, 0x45, 0x42, 0x50  // WEBP
		]);
		const result = validateImageBuffer(webpHeader, 'image/webp');
		assert.equal(result.valid, true);
		assert.equal(result.mimeType, 'image/webp');
	});

	it('throws error for empty or missing buffer', () => {
		assert.throws(() => validateImageBuffer(null), AIProviderError);
		assert.throws(() => validateImageBuffer(Buffer.from([])), AIProviderError);
	});

	it('throws error for oversized buffers', () => {
		const oversized = Buffer.alloc(MAX_IMAGE_BYTES + 100);
		assert.throws(() => validateImageBuffer(oversized, 'image/png'), AIProviderError);
	});

	it('rejects unsupported file formats', () => {
		const textFile = Buffer.from('This is a text file not an image');
		assert.throws(() => validateImageBuffer(textFile, 'text/plain'), AIProviderError);
	});
});
