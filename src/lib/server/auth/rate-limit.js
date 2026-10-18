/**
 * In-memory sliding-window rate limiter for sensitive authentication endpoints
 */
class RateLimiter {
	constructor() {
		/** @type {Map<string, { count: number, resetAt: number }>} */
		this.limits = new Map();
		// Periodic cleanup every 5 minutes
		if (typeof setInterval !== 'undefined') {
			setInterval(() => this.cleanup(), 5 * 60 * 1000).unref?.();
		}
	}

	/**
	 * Checks and increments attempt count
	 * @param {string} key Identifier (IP or IP+email)
	 * @param {number} maxAttempts Max allowed attempts within window
	 * @param {number} windowMs Window duration in milliseconds
	 * @returns {{ allowed: boolean, remaining: number, resetInSeconds: number }}
	 */
	check(key, maxAttempts = 10, windowMs = 15 * 60 * 1000) {
		const now = Date.now();
		const record = this.limits.get(key);

		if (!record || now > record.resetAt) {
			this.limits.set(key, { count: 1, resetAt: now + windowMs });
			return { allowed: true, remaining: maxAttempts - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
		}

		if (record.count >= maxAttempts) {
			const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
			return { allowed: false, remaining: 0, resetInSeconds };
		}

		record.count += 1;
		return {
			allowed: true,
			remaining: maxAttempts - record.count,
			resetInSeconds: Math.ceil((record.resetAt - now) / 1000)
		};
	}

	/**
	 * Resets rate limit for a key upon successful login
	 * @param {string} key
	 */
	reset(key) {
		this.limits.delete(key);
	}

	cleanup() {
		const now = Date.now();
		for (const [key, val] of this.limits.entries()) {
			if (now > val.resetAt) {
				this.limits.delete(key);
			}
		}
	}
}

export const authRateLimiter = new RateLimiter();
