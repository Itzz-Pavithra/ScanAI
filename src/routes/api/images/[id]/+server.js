import { ObjectId } from 'mongodb';
import { getImageStream } from '$lib/server/db/images.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals, url }) {
	const imageId = params.id;
	if (!imageId || !ObjectId.isValid(imageId)) {
		return new Response(JSON.stringify({ success: false, error: 'Invalid image ID.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const isShareContext = url.searchParams.get('shared') === 'true';
		const { stream, metadata } = await getImageStream(
			imageId,
			locals.user ? locals.user.id : null,
			{ allowShared: isShareContext }
		);

		// Convert Node.js GridFS read stream to web ReadableStream
		const webStream = new ReadableStream({
			start(controller) {
				stream.on('data', (chunk) => controller.enqueue(chunk));
				stream.on('end', () => controller.close());
				stream.on('error', (err) => controller.error(err));
			},
			cancel() {
				stream.destroy();
			}
		});

		return new Response(webStream, {
			headers: {
				'Content-Type': metadata.mimeType || 'image/jpeg',
				'Content-Length': String(metadata.size),
				'Cache-Control': 'private, max-age=86400',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (err) {
		if (err.message === 'IMAGE_NOT_FOUND') {
			return new Response(JSON.stringify({ success: false, error: 'Image not found.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		if (err.message === 'IMAGE_UNAUTHORIZED') {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized to access this image.' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		return new Response(JSON.stringify({ success: false, error: 'Failed to retrieve image.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
