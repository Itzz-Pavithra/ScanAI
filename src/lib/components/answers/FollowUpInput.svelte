<script>
	import { Send, CornerDownLeft } from '@lucide/svelte';

	let { onsubmit } = $props();
	let query = $state('');

	function handleSubmit(e) {
		if (e) e.preventDefault();
		if (!query.trim()) return;
		if (onsubmit) {
			onsubmit(query);
			query = '';
		}
	}
</script>

<form onsubmit={handleSubmit} class="relative flex items-center">
	<input
		type="text"
		bind:value={query}
		placeholder="Ask a follow-up question about this scan..."
		class="w-full pl-5 pr-14 py-3.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
	/>
	<button
		type="submit"
		disabled={!query.trim()}
		aria-label="Send follow-up question"
		class="absolute right-2 p-2 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] hover:opacity-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-95"
	>
		<Send class="w-4 h-4" />
	</button>
</form>
