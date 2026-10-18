<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { AI_PROVIDERS } from '$lib/config/providers.js';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { goto } from '$app/navigation';
	import {
		History,
		Search,
		Filter,
		Trash2,
		ExternalLink,
		Calendar,
		ArrowRight,
		Sparkles,
		Bookmark,
		BookmarkCheck,
		Edit3,
		Download,
		Share2,
		X,
		LogIn,
		Cloud
	} from '@lucide/svelte';

	let searchQuery = $state('');
	let providerFilter = $state('all');
	let onlyBookmarked = $state(false);
	let renameModalItem = $state(null);
	let newTitleInput = $state('');
	let deleteConfirmId = $state(null);

	let filteredHistory = $derived(
		appState.history.filter((item) => {
			const matchesSearch =
				!searchQuery.trim() ||
				item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.summary?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesProvider =
				providerFilter === 'all' || item.provider === providerFilter || item.providerId === providerFilter;

			const matchesBookmark = !onlyBookmarked || Boolean(item.isBookmarked);

			return matchesSearch && matchesProvider && matchesBookmark;
		})
	);

	async function handleLoad(item) {
		if (appState.isAuthenticated && item.id && !item.isMock) {
			const result = await appState.loadPersistentConversation(item.id);
			if (result.success) {
				goto('/');
			}
		} else {
			// Legacy/mock item restore
			appState.setProvider(item.providerId || item.provider || 'chatgpt');
			appState.setStyle(item.styleId || item.explanationStyle || 'step-by-step');
			appState.setQuestion(item.question || item.title);
			if (item.imageUrl) {
				appState.setImage({
					file: null,
					previewUrl: item.imageUrl,
					name: item.title,
					size: 1024 * 500,
					type: 'image/jpeg'
				});
			}
			goto('/');
		}
	}

	function startRename(item, e) {
		e.stopPropagation();
		renameModalItem = item;
		newTitleInput = item.title;
	}

	async function confirmRename() {
		if (renameModalItem && newTitleInput.trim()) {
			await appState.renameConversation(renameModalItem.id, newTitleInput.trim());
			renameModalItem = null;
		}
	}

	async function handleToggleBookmark(item, e) {
		e.stopPropagation();
		await appState.toggleBookmark(item.id);
	}

	async function handleExport(item, e) {
		e.stopPropagation();
		window.open(`/api/conversations/${item.id}/export`, '_blank');
	}

	async function handleShare(item, e) {
		e.stopPropagation();
		try {
			const res = await fetch(`/api/conversations/${item.id}/share`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enable: true })
			});
			const data = await res.json();
			if (data.success && data.shareUrl) {
				await navigator.clipboard.writeText(data.shareUrl);
				appState.showToast('Share link copied to clipboard!', 'success');
			}
		} catch (err) {
			appState.showToast('Failed to create share link', 'error');
		}
	}

	async function confirmDelete(id) {
		await appState.deleteConversation(id);
		deleteConfirmId = null;
	}
</script>

<svelte:head>
	<title>Scan History — ScanAI</title>
</svelte:head>

<div class="space-y-8 max-w-5xl mx-auto py-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
		<div class="flex items-center gap-3">
			<div class="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--badge-border)] shadow-md">
				<History class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
					Scan & Chat History
				</h1>
				<p class="text-xs sm:text-sm text-[var(--text-secondary)]">
					{appState.isAuthenticated
						? 'Your visual scans and conversations persistently saved in MongoDB Atlas'
						: 'Local temporary scans. Sign in to sync across devices.'}
				</p>
			</div>
		</div>

		{#if !appState.isAuthenticated}
			<a
				href="/login"
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] text-xs font-semibold shadow-md hover:shadow-lg transition-all"
			>
				<Cloud class="w-4 h-4" />
				<span>Sign In to Enable Cloud Sync</span>
			</a>
		{/if}
	</div>

	<!-- Controls: Search, Provider Filter & Bookmarks -->
	<div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
		<!-- Search input -->
		<div class="relative flex-1">
			<Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search scans by title or question..."
				class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
			/>
		</div>

		<!-- Filters -->
		<div class="flex items-center gap-2 flex-wrap">
			<!-- Bookmarks Toggle -->
			<button
				type="button"
				onclick={() => (onlyBookmarked = !onlyBookmarked)}
				class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold border transition-all cursor-pointer {onlyBookmarked
					? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] border-transparent shadow-sm'
					: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'}"
			>
				<Bookmark class="w-3.5 h-3.5" />
				<span>Bookmarked</span>
			</button>

			<!-- Provider Filter -->
			<div class="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-2xl border border-[var(--border-subtle)]">
				<button
					type="button"
					onclick={() => (providerFilter = 'all')}
					class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {providerFilter === 'all'
						? 'bg-[var(--badge-bg)] text-[var(--text-primary)] shadow-sm'
						: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
				>
					All
				</button>
				{#each AI_PROVIDERS as prov}
					<button
						type="button"
						onclick={() => (providerFilter = prov.id)}
						class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {providerFilter === prov.id
							? 'bg-[var(--badge-bg)] text-[var(--text-primary)] shadow-sm'
							: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
					>
						{prov.name}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- History Cards Grid -->
	{#if filteredHistory.length === 0}
		<EmptyState
			icon={History}
			title={searchQuery || onlyBookmarked || providerFilter !== 'all' ? 'No matching scans found' : 'No scans yet'}
			description={searchQuery || onlyBookmarked || providerFilter !== 'all'
				? 'Try clearing your search query or filters to find what you are looking for.'
				: 'Upload or capture an image to analyze it with ChatGPT, Claude, or Gemini.'}
		>
			<a
				href="/"
				class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] text-xs font-semibold shadow-md hover:opacity-95"
			>
				<span>Open Scanner</span>
				<ArrowRight class="w-3.5 h-3.5" />
			</a>
		</EmptyState>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
			{#each filteredHistory as item (item.id)}
				{@const providerMeta = AI_PROVIDERS.find((p) => p.id === (item.provider || item.providerId)) || AI_PROVIDERS[0]}
				<div
					class="group relative rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
				>
					<!-- Top Row: Provider badge, date, bookmark -->
					<div>
						<div class="flex items-center justify-between gap-2 mb-3">
							<div class="flex items-center gap-2">
								<span
									class="w-2.5 h-2.5 rounded-full"
									style="background-color: {providerMeta.accentColor};"
								></span>
								<span class="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
									{providerMeta.name}
								</span>
							</div>

							<div class="flex items-center gap-1">
								<button
									type="button"
									onclick={(e) => handleToggleBookmark(item, e)}
									aria-label={item.isBookmarked ? 'Remove bookmark' : 'Bookmark scan'}
									class="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
								>
									{#if item.isBookmarked}
										<BookmarkCheck class="w-4 h-4 text-[var(--accent-primary)]" />
									{:else}
										<Bookmark class="w-4 h-4" />
									{/if}
								</button>
								<button
									type="button"
									onclick={(e) => startRename(item, e)}
									aria-label="Rename conversation"
									class="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
								>
									<Edit3 class="w-3.5 h-3.5" />
								</button>
							</div>
						</div>

						<!-- Image Thumbnail if available -->
						{#if item.imageUrl}
							<div class="w-full h-36 rounded-2xl overflow-hidden bg-black/5 mb-3 border border-[var(--border-subtle)]">
								<img
									src={item.imageUrl}
									alt={item.title}
									class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
								/>
							</div>
						{/if}

						<!-- Title & Summary -->
						<h2 class="text-base font-bold font-heading text-[var(--text-primary)] line-clamp-2 mb-1.5">
							{item.title}
						</h2>
						{#if item.summary}
							<p class="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed mb-4">
								{item.summary}
							</p>
						{/if}
					</div>

					<!-- Bottom Action Row -->
					<div class="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
						<span class="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
							<Calendar class="w-3 h-3" />
							<span>{item.formattedDate || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Saved')}</span>
						</span>

						<div class="flex items-center gap-1">
							{#if item.id && !item.isMock}
								<button
									type="button"
									onclick={(e) => handleShare(item, e)}
									aria-label="Share scan"
									class="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] cursor-pointer"
								>
									<Share2 class="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onclick={(e) => handleExport(item, e)}
									aria-label="Export Markdown"
									class="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] cursor-pointer"
								>
									<Download class="w-3.5 h-3.5" />
								</button>
							{/if}
							<button
								type="button"
								onclick={() => (deleteConfirmId = item.id)}
								aria-label="Delete scan"
								class="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
							>
								<Trash2 class="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onclick={() => handleLoad(item)}
								class="px-2.5 py-1 rounded-xl bg-[var(--badge-bg)] text-[var(--accent-primary)] font-semibold hover:bg-[var(--accent-primary)] hover:text-[var(--accent-primary-text)] transition-all cursor-pointer flex items-center gap-1"
							>
								<span>Open</span>
								<ArrowRight class="w-3 h-3" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Rename Modal -->
{#if renameModalItem}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="w-full max-w-sm rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] p-6 space-y-4 shadow-2xl">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-bold text-[var(--text-primary)] font-heading">Rename Scan</h3>
				<button type="button" onclick={() => (renameModalItem = null)} class="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
					<X class="w-4 h-4" />
				</button>
			</div>
			<input
				type="text"
				bind:value={newTitleInput}
				class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
				placeholder="New title..."
			/>
			<div class="flex justify-end gap-2 pt-2">
				<button
					type="button"
					onclick={() => (renameModalItem = null)}
					class="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--badge-bg)]"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmRename}
					class="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-primary-text)] shadow-sm hover:opacity-95"
				>
					Save Title
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteConfirmId}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="w-full max-w-sm rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] p-6 space-y-4 shadow-2xl text-center">
			<div class="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
				<Trash2 class="w-6 h-6" />
			</div>
			<h3 class="text-base font-bold text-[var(--text-primary)] font-heading">Delete Scan Conversation?</h3>
			<p class="text-xs text-[var(--text-secondary)] leading-relaxed">
				This will permanently remove this conversation and any stored images. This action cannot be undone.
			</p>
			<div class="flex items-center justify-center gap-3 pt-2">
				<button
					type="button"
					onclick={() => (deleteConfirmId = null)}
					class="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--badge-bg)] cursor-pointer"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={() => confirmDelete(deleteConfirmId)}
					class="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white shadow-md hover:bg-red-700 cursor-pointer"
				>
					Yes, Delete
				</button>
			</div>
		</div>
	</div>
{/if}
