import { ObjectId } from 'mongodb';
import { getDb } from '$lib/server/db/mongodb.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const convId = params.id;
	if (!convId || !ObjectId.isValid(convId)) {
		return new Response('Invalid conversation ID', { status: 400 });
	}

	const db = await getDb();
	const userObjId = new ObjectId(locals.user.id);
	const convObjId = new ObjectId(convId);

	const conversation = await db.collection('conversations').findOne({
		_id: convObjId,
		userId: userObjId
	});

	if (!conversation) {
		return new Response('Conversation not found', { status: 404 });
	}

	const messages = await db.collection('messages')
		.find({ conversationId: convObjId })
		.sort({ createdAt: 1 })
		.toArray();

	let markdown = `# ${conversation.title}\n\n`;
	markdown += `> **ScanAI Visual Analysis Report**\n`;
	markdown += `> Provider: **${conversation.provider.toUpperCase()}** (${conversation.model})\n`;
	markdown += `> Date: ${new Date(conversation.createdAt).toLocaleString()}\n`;
	if (conversation.imageMetadata?.filename) {
		markdown += `> Original Image: \`${conversation.imageMetadata.filename}\`\n`;
	}
	markdown += `\n---\n\n`;

	for (const msg of messages) {
		if (msg.role === 'user') {
			markdown += `### 👤 User Query\n\n${msg.content}\n\n`;
		} else {
			markdown += `### 🤖 ${conversation.provider.toUpperCase()} Assistant\n\n${msg.content}\n\n`;
			if (msg.interrupted) {
				markdown += `*(Note: Response stream was interrupted)*\n\n`;
			}
		}
		markdown += `---\n\n`;
	}

	markdown += `*Exported from ScanAI on ${new Date().toISOString()}*\n`;

	const safeFilename = `${conversation.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_export.md`;

	return new Response(markdown, {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Content-Disposition': `attachment; filename="${safeFilename}"`,
			'Cache-Control': 'no-store, private'
		}
	});
}
