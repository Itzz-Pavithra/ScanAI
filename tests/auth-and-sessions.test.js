import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/lib/server/auth/passwords.js';
import { validateEmail, validatePassword, validateDisplayName } from '../src/lib/server/auth/validation.js';
import { hashToken } from '../src/lib/server/auth/sessions.js';
import { authRateLimiter } from '../src/lib/server/auth/rate-limit.js';

describe('Authentication & Password Security', () => {
	it('hashes passwords using Argon2id and verifies valid passwords', async () => {
		const password = 'SuperSecret123!';
		const hash = await hashPassword(password);

		assert.ok(hash.startsWith('$argon2id$'), 'Must use Argon2id variant');
		assert.notEqual(hash, password, 'Hash must not equal plaintext');

		const isValid = await verifyPassword(hash, password);
		assert.equal(isValid, true, 'Correct password must verify');

		const isInvalid = await verifyPassword(hash, 'WrongPassword123!');
		assert.equal(isInvalid, false, 'Incorrect password must be rejected');
	});

	it('validates and normalizes email formats correctly', () => {
		const valid = validateEmail('  Alice.Smith@Example.COM  ');
		assert.equal(valid.valid, true);
		assert.equal(valid.normalizedEmail, 'alice.smith@example.com');

		assert.equal(validateEmail('').valid, false);
		assert.equal(validateEmail('not-an-email').valid, false);
		assert.equal(validateEmail('missing@domain').valid, false);
		assert.equal(validateEmail('@missinguser.com').valid, false);
	});

	it('enforces password strength requirements (8+ chars, uppercase, lowercase, number)', () => {
		assert.equal(validatePassword('short').valid, false, 'Must be at least 8 chars');
		assert.equal(validatePassword('alllowercase1').valid, false, 'Must contain uppercase');
		assert.equal(validatePassword('ALLUPPERCASE1').valid, false, 'Must contain lowercase');
		assert.equal(validatePassword('NoNumbersHere!').valid, false, 'Must contain number');
		assert.equal(validatePassword('ValidPass123').valid, true, 'Valid password passes');
	});

	it('validates user display name bounds', () => {
		assert.equal(validateDisplayName('   ').valid, false);
		assert.equal(validateDisplayName('A').valid, false);
		assert.equal(validateDisplayName('Valid Name').valid, true);
		assert.equal(validateDisplayName('Valid Name').cleanName, 'Valid Name');
	});

	it('hashes session tokens with SHA-256 for secure database storage', () => {
		const rawToken = '7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a';
		const hash1 = hashToken(rawToken);
		const hash2 = hashToken(rawToken);

		assert.equal(hash1, hash2, 'Hash must be deterministic');
		assert.equal(hash1.length, 64, 'SHA-256 produces 64 hex characters');
		assert.notEqual(hash1, rawToken, 'Hash must differ from raw token');
	});

	it('rate limits repeated authentication attempts within time window', () => {
		const testKey = `test-ip-${Date.now()}`;

		// First 3 attempts should be allowed
		for (let i = 0; i < 3; i++) {
			const check = authRateLimiter.check(testKey, 3, 60000);
			assert.equal(check.allowed, true);
		}

		// 4th attempt should be blocked
		const blocked = authRateLimiter.check(testKey, 3, 60000);
		assert.equal(blocked.allowed, false);
		assert.equal(blocked.remaining, 0);
		assert.ok(blocked.resetInSeconds > 0);

		// Reset clears the limiter
		authRateLimiter.reset(testKey);
		const afterReset = authRateLimiter.check(testKey, 3, 60000);
		assert.equal(afterReset.allowed, true);
	});
});
