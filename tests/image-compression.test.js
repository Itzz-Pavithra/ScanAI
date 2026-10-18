import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compressImageIfBeneficial } from '../src/lib/utils/image-compression.js';

describe('Image Preprocessing & Compression Policy', () => {
	it('bypasses compression when file is below size threshold', async () => {
		const smallFile = {
			name: 'small.jpg',
			size: 500 * 1024, // 500 KB < 1.5 MB threshold
			type: 'image/jpeg'
		};

		const result = await compressImageIfBeneficial(smallFile);
		assert.equal(result.wasCompressed, false);
		assert.equal(result.originalSize, 500 * 1024);
	});

	it('returns original file safely when canvas API is unavailable (Node environment)', async () => {
		const largeFile = {
			name: 'large.png',
			size: 4 * 1024 * 1024,
			type: 'image/png'
		};

		const result = await compressImageIfBeneficial(largeFile);
		assert.equal(result.file, largeFile);
		assert.equal(result.wasCompressed, false);
	});
});
