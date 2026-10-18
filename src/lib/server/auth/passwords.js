import { hash, verify } from '@node-rs/argon2';

/**
 * Hashes a plaintext password using Argon2id with production parameters
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
	return hash(password, {
		memoryCost: 19456, // 19 MB
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});
}

/**
 * Verifies a plaintext password against an Argon2id hash
 * @param {string} passwordHash
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(passwordHash, password) {
	try {
		return await verify(passwordHash, password);
	} catch (e) {
		return false;
	}
}
