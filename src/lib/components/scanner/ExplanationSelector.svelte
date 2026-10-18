<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { EXPLANATION_STYLES } from '$lib/config/providers.js';
	import { Sparkles, ListOrdered, BookOpen, Languages, SlidersHorizontal } from '@lucide/svelte';

	const icons = {
		Sparkles,
		ListOrdered,
		BookOpen,
		Languages
	};

	function selectStyle(id) {
		appState.setStyle(id);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<label class="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
			<SlidersHorizontal class="w-4 h-4 text-[var(--accent-primary)]" />
			<span>Explanation Depth & Language Style</span>
		</label>
		<span class="text-xs text-[var(--text-muted)]">Adapts response architecture</span>
	</div>

	<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Select explanation style">
		{#each EXPLANATION_STYLES as style}
			{@const isSelected = appState.selectedStyle === style.id}
			{@const IconComponent = icons[style.icon] || Sparkles}
			<button
				type="button"
				role="radio"
				aria-checked={isSelected}
				onclick={() => selectStyle(style.id)}
				class="flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] {isSelected
					? 'bg-[var(--bg-surface-elevated)] border-[var(--accent-primary)] shadow-sm'
					: 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
			>
				<div class="flex items-center justify-between w-full mb-1.5">
					<div
						class="flex items-center justify-center w-7 h-7 rounded-xl transition-colors {isSelected
							? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]'
							: 'bg-[var(--badge-bg)] text-[var(--accent-primary)]'}"
					>
						<IconComponent class="w-3.5 h-3.5" />
					</div>
					{#if isSelected}
						<div class="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
					{/if}
				</div>

				<p class="text-xs font-bold text-[var(--text-primary)] mb-0.5">{style.label}</p>
				<p class="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">{style.desc}</p>
			</button>
		{/each}
	</div>
</div>
