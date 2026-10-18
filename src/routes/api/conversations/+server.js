import { json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { getDb } from '$lib/server/db/mongodb.js';

/**
 * List conversations with pagination, search, and filtering
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url, locals }) {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const userObjId = new ObjectId(locals.user.id);
	const db = await getDb();

	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
	const skip = (page - 1) * limit;

	const searchQuery = url.searchParams.get('q')?.trim() || '';
	const provider = url.searchParams.get('provider')?.trim() || '';
	const bookmarked = url.searchParams.get('bookmarked') === 'true';

	/** @type {any} */
	const filter = { userId: userObjId };

	if (provider && ['chatgpt', 'claude', 'gemini'].includes(provider)) {
		filter.provider = provider;
	}

	if (bookmarked) {
		filter.isBookmarked = true;
	}

	if (searchQuery) {
		// Safe regex search for title
		const safeRegex = new RegExp(searchQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
		filter.$or = [
			{ title: safeRegex },
			{ 'imageMetadata.filename': safeRegex }
		];
	}

	const [conversations, totalCount] = await Promise.all([
		db.collection('conversations')
			.find(filter)
			.sort({ updatedAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray(),
		db.collection('conversations').countDocuments(filter)
	]);

	const formatted = conversations.map((c) => ({
		id: c._id.toString(),
		title: c.title,
		provider: c.provider,
		model: c.model,
		explanationStyle: c.explanationStyle,
		isBookmarked: Boolean(c.isBookmarked),
		hasImage: Boolean(c.imageId),
		imageUrl: c.imageId ? `/api/images/${c.imageId.toString()}` : null,
		imageMetadata: c.imageMetadata || null,
		tags: c.tags || [],
		shareEnabled: Boolean(c.shareEnabled),
		createdAt: c.createdAt,
		updatedAt: c.updatedAt
	}));

	return json({
		success: true,
		conversations: formatted,
		pagination: {
			page,
			limit,
			totalCount,
			totalPages: Math.ceil(totalCount / limit)
		}
	}, {
		headers: {
			'Cache-Control': 'no-store, private'
		}
	});
}

/**
 * Creates a new conversation
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	let body;
	try {
		body = await request.json();
	} catch (e) {
		body = {};
	}

	const { title, provider = 'chatgpt', model = 'gpt-4o-mini', explanationStyle = 'step-by-step' } = body;
	const userObjId = new ObjectId(locals.user.id);
	const db = await getDb();
	const now = new Date();

	const newConv = {
		userId: userObjId,
		title: (title || 'New Visual Scan').slice(0, 100),
		provider,
		model,
		explanationStyle,
		imageId: null,
		imageMetadata: null,
		isBookmarked: false,
		tags: [],
		shareEnabled: false,
		shareTokenHash: null,
		createdAt: now,
		updatedAt: now,
		lastActivityAt: now
	};

	const result = await db.collection('conversations').insertOne(newConv);

	return json({
		success: true,
		conversation: {
			id: result.insertedId.toString(),
			...newConv,
			_id: undefined,
			userId: undefined
		}
	}, { status: 201 });
}
