<script>
	import './layout.css';
	import { onMount } from 'svelte';
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { pwaStore } from '$lib/stores/pwa.svelte.js';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import AnimatedBackground from '$lib/components/background/AnimatedBackground.svelte';
	import PwaManager from '$lib/components/pwa/PwaManager.svelte';
	import { CheckCircle2, AlertCircle, Info, X } from '@lucide/svelte';

	let { children } = $props();

	onMount(() => {
		appState.init();
		pwaStore.init();
	});

	// Keep DOM theme attribute in sync whenever selectedProvider updates
	$effect(() => {
		const current = appState.selectedProvider;
		if (typeof document !== 'undefined' && document.documentElement) {
			if (document.documentElement.dataset.theme !== current) {
				document.documentElement.dataset.theme = current;
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/favicon.png" />
	<link rel="apple-touch-icon" href="/logo.png" />
	<title>ScanAI — Premium AI Visual Assistant</title>
	<meta name="description" content="Visual scanning assistant powered by ChatGPT, Claude, and Gemini. See it. Scan it. Understand it." />
	<meta property="og:image" content="/logo.png" />
	<meta name="twitter:image" content="/logo.png" />
</svelte:head>

<!-- Ambient Theme-aware animated background -->
<AnimatedBackground />

<!-- Application Layout -->
<div class="min-h-screen flex flex-col relative z-0 selection:bg-[var(--accent-glow)] selection:text-[var(--text-primary)]">
	<AppHeader />

	<main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="w-full border-t border-[var(--border-subtle)]/70 py-8 mt-16 backdrop-blur-sm bg-[var(--bg-app)]/50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
			<div class="flex items-center gap-2">
				<span class="font-bold text-[var(--text-primary)] font-heading">ScanAI</span>
				<span>•</span>
				<span>Multimodal Visual Intelligence</span>
			</div>
			<div class="flex items-center gap-6">
				<a href="/" class="hover:text-[var(--text-primary)] transition-colors">Scanner</a>
				<a href="/history" class="hover:text-[var(--text-primary)] transition-colors">History</a>
				<a href="/settings" class="hover:text-[var(--text-primary)] transition-colors">Settings</a>
				<span class="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
					{appState.selectedProvider.toUpperCase()} ACTIVE
				</span>
			</div>
		</div>
	</footer>

	<!-- PWA Install & Offline Management -->
	<PwaManager />

	<!-- Global Toast Notifications -->
	{#if appState.toast}
		<div class="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
			<div
				class="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-md {appState.toast.type === 'error'
					? 'bg-red-950/90 border-red-500/40 text-red-200'
					: appState.toast.type === 'success'
						? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
						: 'bg-[var(--bg-surface-elevated)]/95 border-[var(--border-strong)] text-[var(--text-primary)]'}"
			>
				{#if appState.toast.type === 'error'}
					<AlertCircle class="w-4 h-4 text-red-400 flex-shrink-0" />
				{:else if appState.toast.type === 'success'}
					<CheckCircle2 class="w-4 h-4 text-emerald-400 flex-shrink-0" />
				{:else}
					<Info class="w-4 h-4 text-[var(--accent-primary)] flex-shrink-0" />
				{/if}
				<p class="text-xs font-medium leading-snug">{appState.toast.message}</p>
				<button
					type="button"
					aria-label="Dismiss message"
					onclick={() => (appState.toast = null)}
					class="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer ml-auto"
				>
					<X class="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	{/if}
</div>
