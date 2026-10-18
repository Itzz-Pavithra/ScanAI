<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import MarkdownRenderer from '$lib/components/shared/MarkdownRenderer.svelte';
	import { AI_PROVIDERS } from '$lib/config/providers.js';
	import { Share2, Sparkles, MessageSquare, AlertCircle, ArrowLeft, Calendar, Cpu } from '@lucide/svelte';

	let loading = $state(true);
	let error = $state(null);
	let conversation = $state(null);

	let currentProvider = $derived(
		AI_PROVIDERS.find((p) => p.id === conversation?.provider) || AI_PROVIDERS[0]
	);

	onMount(async () => {
		const token = page.params.token;
		try {
			// Find conversation by token
			const res = await fetch(`/api/conversations/lookup?token=${encodeURIComponent(token)}`);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || 'This shared conversation link is invalid or has expired.');
			}
			const data = await res.json();
			conversation = data.conversation;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{conversation ? `${conversation.title} — Shared ScanAI` : 'Shared Visual Scan — ScanAI'}</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-8">
	<!-- Top Bar -->
	<div class="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)]">
		<a
			href="/"
			class="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
		>
			<ArrowLeft class="w-4 h-4" />
			<span>Open ScanAI</span>
		</a>
		<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]">
			<Share2 class="w-3.5 h-3.5" />
			<span>Shared Visual Scan</span>
		</span>
	</div>

	{#if loading}
		<div class="py-24 text-center space-y-4">
			<div class="w-8 h-8 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
			<p class="text-sm text-[var(--text-secondary)]">Loading shared scan conversation...</p>
		</div>
	{:else if error}
		<div class="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center space-y-4 max-w-md mx-auto">
			<div class="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
				<AlertCircle class="w-6 h-6" />
			</div>
			<h2 class="text-lg font-bold text-[var(--text-primary)]">Conversation Unavailable</h2>
			<p class="text-xs text-[var(--text-secondary)]">{error}</p>
			<a
				href="/"
				class="inline-block px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] text-xs font-semibold shadow-md hover:opacity-95"
			>
				Create New Scan
			</a>
		</div>
	{:else if conversation}
		<div class="space-y-6">
			<!-- Title and Metadata -->
			<div class="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<span
							class="w-3 h-3 rounded-full"
							style="background-color: {currentProvider.accentColor};"
						></span>
						<span class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
							{currentProvider.name} • {conversation.model}
						</span>
					</div>
					<span class="text-xs text-[var(--text-muted)] flex items-center gap-1">
						<Calendar class="w-3.5 h-3.5" />
						<span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
					</span>
				</div>
				<h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
					{conversation.title}
				</h1>
			</div>

			<!-- Original Image if present -->
			{#if conversation.imageUrl}
				<div class="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] max-w-md mx-auto overflow-hidden">
					<img
						src={conversation.imageUrl}
						alt="Scanned specimen"
						class="w-full h-auto max-h-96 object-contain rounded-2xl mx-auto bg-black/5"
					/>
				</div>
			{/if}

			<!-- Messages Timeline -->
			<div class="space-y-4">
				{#each conversation.messages as message}
					{#if message.role === 'user'}
						<div class="flex justify-end">
							<div class="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-tr-sm bg-[var(--accent-primary)] text-[var(--accent-primary-text)] p-4 sm:p-5 shadow-sm">
								<p class="text-xs font-semibold opacity-75 mb-1">User Query</p>
								<p class="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
							</div>
						</div>
					{:else}
						<div class="flex justify-start">
							<div class="max-w-[95%] sm:max-w-[85%] rounded-3xl rounded-tl-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 shadow-sm space-y-3">
								<div class="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2">
									<Sparkles class="w-3.5 h-3.5 text-[var(--accent-primary)]" />
									<span>{currentProvider.name} Response</span>
								</div>
								<div class="text-[var(--text-primary)] leading-relaxed">
									<MarkdownRenderer content={message.content} />
								</div>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>
