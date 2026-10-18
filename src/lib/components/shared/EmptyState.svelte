<script>
	let {
		title = 'No scans found',
		description = 'Upload an image or adjust your search filters to explore results.',
		actionText = '',
		onaction
	} = $props();
</script>

<div class="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] my-6">
	<div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--badge-bg)] border border-[var(--badge-border)] text-[var(--accent-primary)] mb-4">
		<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
		</svg>
	</div>

	<h3 class="text-lg font-semibold text-[var(--text-primary)] font-heading mb-1.5">
		{title}
	</h3>
	<p class="text-sm text-[var(--text-secondary)] max-w-md mb-5 leading-relaxed">
		{description}
	</p>

	{#if actionText && onaction}
		<button
			type="button"
			onclick={onaction}
			class="px-5 py-2.5 rounded-xl font-medium text-sm bg-[var(--accent-primary)] text-[var(--accent-primary-text)] hover:opacity-90 transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
		>
			{actionText}
		</button>
	{/if}
</div>
