/**
 * Formats byte size into human readable string
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 1) {
	if (!bytes || bytes === 0) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Reads image dimensions asynchronously
 * @param {string} url
 * @returns {Promise<{ width: number, height: number }>}
 */
export function getImageDimensions(url) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			resolve({ width: 0, height: 0 });
		};
		img.src = url;
	});
}

/**
 * Converts a dataURL string to a Blob
 * @param {string} dataUrl
 * @returns {Blob}
 */
export function dataURLToBlob(dataUrl) {
	const parts = dataUrl.split(';base64,');
	const contentType = parts[0].split(':')[1];
	const raw = window.atob(parts[1]);
	const rawLength = raw.length;
	const uInt8Array = new Uint8Array(rawLength);
	for (let i = 0; i < rawLength; ++i) {
		uInt8Array[i] = raw.charCodeAt(i);
	}
	return new Blob([uInt8Array], { type: contentType });
}
