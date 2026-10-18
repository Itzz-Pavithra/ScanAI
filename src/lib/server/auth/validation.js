/**
 * Validates and normalizes email address
 * @param {string} email
 * @returns {{ valid: boolean, error?: string, normalizedEmail: string }}
 */
export function validateEmail(email) {
	if (!email || typeof email !== 'string') {
		return { valid: false, error: 'Email address is required.', normalizedEmail: '' };
	}
	const normalizedEmail = email.trim().toLowerCase();
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
		return { valid: false, error: 'Please enter a valid email address.', normalizedEmail };
	}
	return { valid: true, normalizedEmail };
}

/**
 * Validates password strength
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePassword(password) {
	if (!password || typeof password !== 'string') {
		return { valid: false, error: 'Password is required.' };
	}
	if (password.length < 8) {
		return { valid: false, error: 'Password must be at least 8 characters long.' };
	}
	if (password.length > 128) {
		return { valid: false, error: 'Password must not exceed 128 characters.' };
	}
	if (!/[a-z]/.test(password)) {
		return { valid: false, error: 'Password must contain at least one lowercase letter.' };
	}
	if (!/[A-Z]/.test(password)) {
		return { valid: false, error: 'Password must contain at least one uppercase letter.' };
	}
	if (!/[0-9]/.test(password)) {
		return { valid: false, error: 'Password must contain at least one number.' };
	}
	return { valid: true };
}

/**
 * Validates user display name
 * @param {string} name
 * @returns {{ valid: boolean, error?: string, cleanName: string }}
 */
export function validateDisplayName(name) {
	if (!name || typeof name !== 'string') {
		return { valid: false, error: 'Display name is required.', cleanName: '' };
	}
	const cleanName = name.trim().replace(/\s+/g, ' ');
	if (cleanName.length < 2) {
		return { valid: false, error: 'Display name must be at least 2 characters.', cleanName };
	}
	if (cleanName.length > 50) {
		return { valid: false, error: 'Display name cannot exceed 50 characters.', cleanName };
	}
	return { valid: true, cleanName };
}
