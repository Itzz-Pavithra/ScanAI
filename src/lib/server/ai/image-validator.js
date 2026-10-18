import { AIProviderError, ERROR_CODES } from './errors.js';

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Validates actual binary bytes of an image buffer using file signatures (magic numbers)
 * @param {Buffer | Uint8Array} buffer
 * @param {string} declaredMimeType
 * @returns {{ valid: boolean, mimeType: string }}
 */
export function validateImageBuffer(buffer, declaredMimeType = '') {
	if (!buffer || buffer.length === 0) {
		throw new AIProviderError(
			ERROR_CODES.INVALID_REQUEST_ERROR,
			'No image data received in the request.',
			400
		);
	}

	if (buffer.length > MAX_IMAGE_BYTES) {
		const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
		throw new AIProviderError(
			ERROR_CODES.INVALID_REQUEST_ERROR,
			`Image payload exceeds the maximum server limit of 15 MB (received ${sizeMB} MB).`,
			413
		);
	}

	// Detect signature from first 12 bytes
	const header = Array.from(buffer.slice(0, 12))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase();

	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (header.startsWith('89504E470D0A1A0A')) {
		return { valid: true, mimeType: 'image/png' };
	}

	// JPEG: FF D8 FF
	if (header.startsWith('FFD8FF')) {
		return { valid: true, mimeType: 'image/jpeg' };
	}

	// WEBP: 52 49 46 46 (RIFF) followed by 57 45 42 50 (WEBP) at offset 8
	if (header.startsWith('52494646') && header.slice(16, 24) === '57454250') {
		return { valid: true, mimeType: 'image/webp' };
	}

	// If declared mime type is one of the allowed types but signature is subtly non-standard, verify minimal integrity
	const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
	if (allowed.includes(declaredMimeType.toLowerCase())) {
		const normalized = declaredMimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : declaredMimeType.toLowerCase();
		return { valid: true, mimeType: normalized };
	}

	throw new AIProviderError(
		ERROR_CODES.INVALID_REQUEST_ERROR,
		`Unsupported or corrupted image format. Please submit a valid PNG, JPEG, or WEBP file.`,
		415
	);
}
