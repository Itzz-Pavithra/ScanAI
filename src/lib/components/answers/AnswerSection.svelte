<script>
	let { title, icon, children } = $props();
</script>

<div class="p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
	{#if title}
		<div class="flex items-center gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
			{#if icon}
				<div class="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
			{/if}
			<h4 class="text-sm font-bold font-heading text-[var(--text-primary)] uppercase tracking-wider">
				{title}
			</h4>
		</div>
	{/if}

	<div class="text-sm text-[var(--text-secondary)] leading-relaxed">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
