<script>
	import { WifiOff, RefreshCw, Home, ShieldAlert } from 'lucide-svelte';

	let checking = $state(false);

	function checkConnection() {
		checking = true;
		if (navigator.onLine) {
			window.location.href = '/';
		} else {
			setTimeout(() => {
				checking = false;
			}, 600);
		}
	}
</script>

<svelte:head>
	<title>Offline — ScanAI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-app)] text-[var(--text-primary)]">
	<div class="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl backdrop-blur-md">
		<div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
			<WifiOff class="w-8 h-8" />
		</div>

		<div class="space-y-2">
			<h1 class="text-2xl font-bold tracking-tight font-heading">You are offline</h1>
			<p class="text-sm text-[var(--text-secondary)] leading-relaxed">
				ScanAI visual analysis, multimodal reasoning, and chat synchronization require an active internet connection to communicate with our AI models.
			</p>
		</div>

		<div class="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-left text-[var(--text-secondary)] flex items-start gap-3">
			<ShieldAlert class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
			<span>
				For your privacy, your private conversation history and encrypted credentials are never exposed in public offline caches.
			</span>
		</div>

		<div class="flex flex-col sm:flex-row gap-3 pt-2">
			<button
				onclick={checkConnection}
				disabled={checking}
				class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-medium text-sm hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
			>
				<RefreshCw class="w-4 h-4 {checking ? 'animate-spin' : ''}" />
				<span>{checking ? 'Checking...' : 'Try Again'}</span>
			</button>

			<a
				href="/"
				class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium text-sm transition-all cursor-pointer"
			>
				<Home class="w-4 h-4" />
				<span>Home</span>
			</a>
		</div>
	</div>
</div>
