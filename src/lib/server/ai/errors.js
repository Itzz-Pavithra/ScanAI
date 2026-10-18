export class AIProviderError extends Error {
	/**
	 * @param {string} code
	 * @param {string} message
	 * @param {number} status
	 * @param {any} [details]
	 */
	constructor(code, message, status = 500, details = null) {
		super(message);
		this.name = 'AIProviderError';
		this.code = code;
		this.status = status;
		this.details = details;
	}

	toJSON() {
		return {
			code: this.code,
			message: this.message,
			status: this.status
		};
	}
}

export const ERROR_CODES = {
	PROVIDER_CONFIGURATION_ERROR: 'PROVIDER_CONFIGURATION_ERROR',
	PROVIDER_AUTH_ERROR: 'PROVIDER_AUTH_ERROR',
	PROVIDER_RATE_LIMIT: 'PROVIDER_RATE_LIMIT',
	PROVIDER_QUOTA_EXCEEDED: 'PROVIDER_QUOTA_EXCEEDED',
	PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
	PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
	INVALID_REQUEST_ERROR: 'INVALID_REQUEST_ERROR',
	REQUEST_CANCELLED: 'REQUEST_CANCELLED',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Normalizes an unknown exception from an AI SDK into an AIProviderError
 * @param {unknown} err
 * @param {string} providerName
 * @returns {AIProviderError}
 */
export function mapProviderError(err, providerName) {
	if (err instanceof AIProviderError) {
		return err;
	}

	// Request cancellation
	if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
		return new AIProviderError(
			ERROR_CODES.REQUEST_CANCELLED,
			`The scan request to ${providerName} was cancelled.`,
			499
		);
	}

	const message = err?.message || String(err);
	const status = err?.status || err?.statusCode || 500;

	// Authentication / Key error
	if (status === 401 || message.includes('API key') || message.includes('unauthorized') || message.includes('Incorrect API key')) {
		return new AIProviderError(
			ERROR_CODES.PROVIDER_AUTH_ERROR,
			`Invalid API key for ${providerName}. Please check your credentials in the server environment.`,
			401
		);
	}

	// Rate limit / Quota
	if (status === 429 || message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('quota')) {
		return new AIProviderError(
			ERROR_CODES.PROVIDER_RATE_LIMIT,
			`${providerName} quota or rate limit exceeded. Please check your account usage limits.`,
			429
		);
	}

	// Model not found
	if (status === 404 || message.includes('model') && (message.includes('not found') || message.includes('does not exist'))) {
		return new AIProviderError(
			ERROR_CODES.PROVIDER_CONFIGURATION_ERROR,
			`The configured vision model for ${providerName} was not found or is unavailable: ${message}`,
			404
		);
	}

	// Upstream Timeout
	if (status === 408 || status === 504 || message.includes('timeout') || message.includes('ETIMEDOUT')) {
		return new AIProviderError(
			ERROR_CODES.PROVIDER_TIMEOUT,
			`Request to ${providerName} timed out. Please try again.`,
			504
		);
	}

	// Provider Service Unavailable
	if (status === 503 || status === 502 || message.includes('overloaded') || message.includes('Service Unavailable')) {
		return new AIProviderError(
			ERROR_CODES.PROVIDER_UNAVAILABLE,
			`${providerName} service is currently unavailable or overloaded. Please retry in a few moments.`,
			503
		);
	}

	return new AIProviderError(
		ERROR_CODES.UNKNOWN_ERROR,
		`Error communicating with ${providerName}: ${message}`,
		status >= 400 && status < 600 ? status : 500
	);
}
