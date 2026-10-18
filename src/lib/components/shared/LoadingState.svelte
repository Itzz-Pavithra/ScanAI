<script>
	let { message = 'Analyzing visual markers...', submessage = 'Synthesizing multimodal features across neural channels' } = $props();
</script>

<div class="flex flex-col items-center justify-center p-12 text-center" role="status" aria-live="polite">
	<!-- Animated visual scanning emitter -->
	<div class="relative flex items-center justify-center w-24 h-24 mb-6">
		<div class="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)] opacity-20 animate-ping"></div>
		<div class="absolute inset-2 rounded-full border border-[var(--accent-secondary)] opacity-40 animate-pulse-subtle"></div>
		<div class="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] shadow-lg shadow-[var(--accent-glow)]">
			<div class="w-6 h-6 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin"></div>
		</div>
	</div>

	<h3 class="text-lg font-semibold text-[var(--text-primary)] font-heading tracking-wide mb-2">
		{message}
	</h3>
	<p class="text-sm text-[var(--text-secondary)] max-w-sm">
		{submessage}
	</p>
</div>
