<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { AI_PROVIDERS } from '$lib/config/providers.js';
	import { Sparkles, Check, Zap, Layers } from '@lucide/svelte';

	function handleSelect(id) {
		appState.setProvider(id);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<label class="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
			<Layers class="w-4 h-4 text-[var(--accent-primary)]" />
			<span>Select AI Intelligence & Vision Engine</span>
		</label>
		<span class="text-xs text-[var(--text-muted)]">Changes theme & reasoning style</span>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-3.5" role="radiogroup" aria-label="Select AI Provider">
		{#each AI_PROVIDERS as provider}
			{@const isSelected = appState.selectedProvider === provider.id}
			<button
				type="button"
				role="radio"
				aria-checked={isSelected}
				onclick={() => handleSelect(provider.id)}
				onkeydown={(e) => {
					if (e.key === ' ' || e.key === 'Enter') {
						e.preventDefault();
						handleSelect(provider.id);
					}
				}}
				class="relative flex flex-col justify-between p-4.5 rounded-3xl text-left border transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] {isSelected
					? 'bg-[var(--bg-surface-elevated)] border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-glow)] scale-[1.01]'
					: 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] hover:bg-[var(--bg-surface-elevated)]/60 opacity-80 hover:opacity-100'}"
			>
				<!-- Top row: Indicator dot, name, badge -->
				<div class="flex items-start justify-between gap-2 mb-2.5">
					<div class="flex items-center gap-2.5">
						<div
							class="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform duration-300 {isSelected ? 'scale-125' : ''}"
							style="background-color: {provider.accentColor};"
						></div>
						<div>
							<h3 class="text-base font-bold font-heading text-[var(--text-primary)] leading-tight">
								{provider.name}
							</h3>
							<p class="text-[11px] text-[var(--text-muted)] font-mono">{provider.modelName}</p>
						</div>
					</div>

					<div class="flex items-center gap-1.5">
						<span
							class="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors {isSelected
								? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] border-transparent'
								: 'bg-[var(--badge-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}"
						>
							{provider.badge}
						</span>
						{#if isSelected}
							<div class="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-text)] flex items-center justify-center">
								<Check class="w-3.5 h-3.5" />
							</div>
						{/if}
					</div>
				</div>

				<!-- Description -->
				<p class="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
					{provider.description}
				</p>

				<!-- Highlights tags -->
				<div class="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border-subtle)] mt-auto">
					{#each provider.highlights.slice(0, 2) as hl}
						<span class="text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)]">
							{hl}
						</span>
					{/each}
				</div>
			</button>
		{/each}
	</div>
</div>
