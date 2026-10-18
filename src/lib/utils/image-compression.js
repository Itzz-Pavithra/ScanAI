/**
 * Client-side safe image compression & preprocessing using browser Canvas API
 *
 * @param {File} file
 * @param {object} [options]
 * @param {number} [options.maxDimension=2048]
 * @param {number} [options.quality=0.88]
 * @param {number} [options.thresholdBytes=1.5*1024*1024] - Only compress if exceeds 1.5 MB
 * @returns {Promise<{ file: File, wasCompressed: boolean, originalSize: number, compressedSize: number }>}
 */
export async function compressImageIfBeneficial(file, options = {}) {
	const {
		maxDimension = 2048,
		quality = 0.88,
		thresholdBytes = 1.5 * 1024 * 1024
	} = options;

	if (!file || typeof window === 'undefined') {
		return { file, wasCompressed: false, originalSize: file?.size || 0, compressedSize: file?.size || 0 };
	}

	const originalSize = file.size;

	// If file is already small (under threshold), no need to compress
	if (originalSize <= thresholdBytes) {
		return { file, wasCompressed: false, originalSize, compressedSize: originalSize };
	}

	try {
		const bitmapOrImg = await createImageSource(file);
		const { width, height } = bitmapOrImg;

		// Calculate scaled dimensions
		let targetWidth = width;
		let targetHeight = height;

		if (width > maxDimension || height > maxDimension) {
			if (width > height) {
				targetWidth = maxDimension;
				targetHeight = Math.round((height * maxDimension) / width);
			} else {
				targetHeight = maxDimension;
				targetWidth = Math.round((width * maxDimension) / height);
			}
		} else if (originalSize <= thresholdBytes) {
			// Below threshold and already within bounds
			cleanupSource(bitmapOrImg);
			return { file, wasCompressed: false, originalSize, compressedSize: originalSize };
		}

		// Draw to OffscreenCanvas or standard canvas
		const canvas = document.createElement('canvas');
		canvas.width = targetWidth;
		canvas.height = targetHeight;
		const ctx = canvas.getContext('2d', { alpha: file.type === 'image/png' });

		if (!ctx) {
			cleanupSource(bitmapOrImg);
			return { file, wasCompressed: false, originalSize, compressedSize: originalSize };
		}

		// Enable high-quality image smoothing
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';

		ctx.drawImage(bitmapOrImg, 0, 0, targetWidth, targetHeight);
		cleanupSource(bitmapOrImg);

		// Determine target format
		// Keep PNG as PNG to retain transparency; otherwise use webp or jpeg
		const targetMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

		const blob = await new Promise((resolve) => {
			canvas.toBlob(resolve, targetMime, quality);
		});

		if (!blob || blob.size >= originalSize) {
			// If compression didn't save bytes, keep original
			return { file, wasCompressed: false, originalSize, compressedSize: originalSize };
		}

		const compressedFile = new File([blob], file.name, {
			type: targetMime,
			lastModified: Date.now()
		});

		return {
			file: compressedFile,
			wasCompressed: true,
			originalSize,
			compressedSize: blob.size
		};
	} catch (err) {
		console.warn('Safe image compression fallback to original file:', err);
		return { file, wasCompressed: false, originalSize, compressedSize: originalSize };
	}
}

/**
 * Creates image source handling ImageBitmap or HTMLImageElement
 * @param {File} file
 * @returns {Promise<{ width: number, height: number, source: any }>}
 */
async function createImageSource(file) {
	if (typeof createImageBitmap === 'function') {
		try {
			const bitmap = await createImageBitmap(file);
			return bitmap;
		} catch (e) {
			// Fallback to Image element
		}
	}

	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			resolve(img);
			URL.revokeObjectURL(url);
		};
		img.onerror = (e) => {
			URL.revokeObjectURL(url);
			reject(e);
		};
		img.src = url;
	});
}

function cleanupSource(source) {
	if (source && typeof source.close === 'function') {
		source.close(); // ImageBitmap cleanup
	}
}
