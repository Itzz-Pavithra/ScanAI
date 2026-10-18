<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { EXAMPLE_PROMPTS } from '$lib/config/providers.js';
	import { HelpCircle, Sparkles, X, CornerDownLeft } from '@lucide/svelte';

	let { onsubmit } = $props();

	function handleChipClick(promptText) {
		appState.setQuestion(promptText);
	}

	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (onsubmit && appState.uploadedImage && !appState.isAnalyzing) {
				onsubmit();
			}
		}
	}
</script>

<div class="space-y-3">
	<!-- Label & Prompt Clear -->
	<div class="flex items-center justify-between">
		<label for="question-textarea" class="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
			<HelpCircle class="w-4 h-4 text-[var(--accent-primary)]" />
			<span>Your Question or Instructions (Optional)</span>
		</label>
		{#if appState.question}
			<button
				type="button"
				onclick={() => appState.setQuestion('')}
				class="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
			>
				<X class="w-3.5 h-3.5" />
				<span>Clear</span>
			</button>
		{/if}
	</div>

	<!-- Textarea Box -->
	<div class="relative">
		<textarea
			id="question-textarea"
			rows="3"
			value={appState.question}
			oninput={(e) => appState.setQuestion(e.currentTarget.value)}
			onkeydown={handleKeydown}
			placeholder="What would you like to understand about this image? (e.g. solve, transcribe, explain components, translate...)"
			class="w-full p-4 pr-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] resize-none"
		></textarea>

		{#if appState.uploadedImage && !appState.isAnalyzing}
			<div class="absolute bottom-3 right-3 text-[10px] text-[var(--text-muted)] hidden sm:flex items-center gap-1">
				<span>Press</span>
				<kbd class="px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] font-mono text-[9px]">Enter ↵</kbd>
				<span>to scan</span>
			</div>
		{/if}
	</div>

	<!-- Example Prompt Chips -->
	<div class="space-y-1.5">
		<p class="text-xs text-[var(--text-muted)] flex items-center gap-1">
			<Sparkles class="w-3.5 h-3.5 text-[var(--accent-primary)]" />
			<span>Quick suggestions:</span>
		</p>
		<div class="flex flex-wrap gap-2">
			{#each EXAMPLE_PROMPTS as prompt}
				<button
					type="button"
					onclick={() => handleChipClick(prompt)}
					class="text-xs px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer text-left active:scale-95"
				>
					{prompt}
				</button>
			{/each}
		</div>
	</div>
</div>
