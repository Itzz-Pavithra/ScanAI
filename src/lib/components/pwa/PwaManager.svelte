<script>
	import { onMount } from 'svelte';
	import { Download, RefreshCw, WifiOff, X, Sparkles } from '@lucide/svelte';

	let deferredPrompt = $state(null);
	let canInstall = $state(false);
	let isDismissed = $state(false);
	let hasUpdate = $state(false);
	let waitingWorker = $state(null);
	let isOffline = $state(false);

	onMount(() => {
		// Online / offline status detection
		isOffline = !navigator.onLine;
		const handleOnline = () => { isOffline = false; };
		const handleOffline = () => { isOffline = true; };
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Install prompt capture
		const handleBeforeInstall = (e) => {
			e.preventDefault();
			deferredPrompt = e;
			// Only show if not previously dismissed in this session
			if (!sessionStorage.getItem('scanai_install_dismissed')) {
				canInstall = true;
			}
		};
		window.addEventListener('beforeinstallprompt', handleBeforeInstall);

		window.addEventListener('appinstalled', () => {
			canInstall = false;
			deferredPrompt = null;
		});

		// Service Worker registration & update listener
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').then((reg) => {
				// Check if there is already a waiting worker
				if (reg.waiting) {
					waitingWorker = reg.waiting;
					hasUpdate = true;
				}

				reg.addEventListener('updatefound', () => {
					const newWorker = reg.installing;
					if (!newWorker) return;

					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							waitingWorker = newWorker;
							hasUpdate = true;
						}
					});
				});
			}).catch((err) => {
				console.debug('[SW] Service worker registration note:', err?.message);
			});

			// Controller change listener
			let refreshing = false;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (!refreshing) {
					refreshing = true;
					window.location.reload();
				}
			});
		}

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
		};
	});

	async function installApp() {
		if (!deferredPrompt) return;
		canInstall = false;
		deferredPrompt.prompt();
		const choice = await deferredPrompt.userChoice;
		if (choice.outcome === 'accepted') {
			deferredPrompt = null;
		}
	}

	function dismissInstall() {
		canInstall = false;
		isDismissed = true;
		try {
			sessionStorage.setItem('scanai_install_dismissed', '1');
		} catch (e) {}
	}

	function triggerUpdate() {
		if (waitingWorker) {
			waitingWorker.postMessage({ type: 'SKIP_WAITING' });
		} else {
			window.location.reload();
		}
	}
</script>

<!-- Offline Warning Banner -->
{#if isOffline}
	<div class="fixed top-18 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
		<div class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/95 text-black text-xs font-semibold shadow-xl border border-amber-400 backdrop-blur-md">
			<WifiOff class="w-4 h-4 shrink-0" />
			<span class="flex-1">Offline mode. Reconnect to resume cloud AI scanning.</span>
		</div>
	</div>
{/if}

<!-- Update Notification Banner -->
{#if hasUpdate}
	<div class="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
		<div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-primary)] shadow-2xl backdrop-blur-xl">
			<div class="w-8 h-8 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
				<Sparkles class="w-4 h-4" />
			</div>
			<div>
				<p class="text-xs font-semibold">New version available</p>
				<p class="text-[11px] text-[var(--text-secondary)]">Update now to get the latest features.</p>
			</div>
			<button
				type="button"
				onclick={triggerUpdate}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-medium text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer ml-2"
			>
				<RefreshCw class="w-3.5 h-3.5" />
				<span>Update</span>
			</button>
		</div>
	</div>
{/if}

<!-- PWA Install Banner -->
{#if canInstall && !isDismissed}
	<div class="fixed bottom-6 left-6 z-40 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
		<div class="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-primary)] shadow-2xl backdrop-blur-xl flex items-start gap-3">
			<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
				<Download class="w-5 h-5" />
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex items-center justify-between">
					<h3 class="text-xs font-bold font-heading">Install ScanAI</h3>
					<button
						type="button"
						onclick={dismissInstall}
						class="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md cursor-pointer -mr-1"
						aria-label="Dismiss installation"
					>
						<X class="w-3.5 h-3.5" />
					</button>
				</div>
				<p class="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
					Install as a standalone app for fast, instant vision scanning on your device.
				</p>
				<div class="mt-3 flex gap-2">
					<button
						type="button"
						onclick={installApp}
						class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
					>
						<Download class="w-3.5 h-3.5" />
						<span>Install App</span>
					</button>
					<button
						type="button"
						onclick={dismissInstall}
						class="px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] cursor-pointer"
					>
						Later
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
