export const ALLOWED_IMAGE_TYPES = [
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/webp'
];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Validates an image file for supported types and size bounds
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file) {
	if (!file) {
		return { valid: false, error: 'No file provided.' };
	}

	if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
		return {
			valid: false,
			error: `Unsupported file format (${file.type || 'unknown'}). Please upload a PNG, JPG, JPEG, or WEBP image.`
		};
	}

	if (file.size > MAX_FILE_SIZE_BYTES) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return {
			valid: false,
			error: `File is too large (${sizeMB} MB). Maximum allowed size is 15 MB.`
		};
	}

	return { valid: true };
}
