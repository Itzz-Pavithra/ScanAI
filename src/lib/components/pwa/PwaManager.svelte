<script>
	import { pwaStore } from '$lib/stores/pwa.svelte.js';
	import {
		Download,
		RefreshCw,
		WifiOff,
		X,
		Sparkles,
		Share,
		PlusSquare,
		MoreVertical,
		Monitor,
		CheckCircle2,
		Smartphone,
		HelpCircle
	} from '@lucide/svelte';

	let isInstalling = $state(false);

	async function handleInstallClick() {
		if (isInstalling) return;
		isInstalling = true;
		try {
			await pwaStore.install();
		} finally {
			isInstalling = false;
		}
	}
</script>

<!-- Offline Warning Banner -->
{#if pwaStore.isOffline}
	<div class="fixed top-18 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
		<div class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/95 text-black text-xs font-semibold shadow-xl border border-amber-400 backdrop-blur-md">
			<WifiOff class="w-4 h-4 shrink-0" />
			<span class="flex-1">Offline mode. Reconnect to resume cloud AI scanning.</span>
		</div>
	</div>
{/if}

<!-- Update Notification Banner -->
{#if pwaStore.hasUpdate}
	<div class="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
		<div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] shadow-2xl backdrop-blur-xl">
			<div class="w-8 h-8 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
				<Sparkles class="w-4 h-4" />
			</div>
			<div>
				<p class="text-xs font-semibold">New version available</p>
				<p class="text-[11px] text-[var(--text-secondary)]">Update now to get the latest features.</p>
			</div>
			<button
				type="button"
				onclick={() => pwaStore.triggerUpdate()}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-medium text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer ml-2"
			>
				<RefreshCw class="w-3.5 h-3.5" />
				<span>Update</span>
			</button>
		</div>
	</div>
{/if}

<!-- PWA Install Banner (When native prompt ready and not dismissed/installed) -->
{#if pwaStore.canInstall && !pwaStore.isDismissed && !pwaStore.isInstalled}
	<div class="fixed bottom-6 left-6 z-40 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
		<div class="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] shadow-2xl backdrop-blur-xl flex items-start gap-3">
			<div class="w-10 h-10 rounded-xl bg-[var(--badge-bg)] border border-[var(--badge-border)] flex items-center justify-center shrink-0 text-[var(--accent-primary)]">
				<Download class="w-5 h-5" />
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex items-center justify-between">
					<h3 class="text-xs font-bold font-heading">Install ScanAI</h3>
					<button
						type="button"
						onclick={() => pwaStore.dismissBanner()}
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
						disabled={isInstalling || pwaStore.isPrompting}
						onclick={handleInstallClick}
						class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
					>
						<Download class="w-3.5 h-3.5 {isInstalling ? 'animate-bounce' : ''}" />
						<span>{isInstalling ? 'Opening...' : 'Install App'}</span>
					</button>
					<button
						type="button"
						onclick={() => pwaStore.dismissBanner()}
						class="px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] cursor-pointer"
					>
						Later
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Platform-specific Installation Instructions Modal (When native prompt cannot trigger directly) -->
{#if pwaStore.showInstructionsModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
		<div class="w-full max-w-md rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] p-6 sm:p-7 shadow-2xl space-y-5 text-left text-[var(--text-primary)]">
			<!-- Modal Header -->
			<div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-[var(--badge-bg)] border border-[var(--badge-border)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
						<Download class="w-5 h-5" />
					</div>
					<div>
						<h2 class="text-base font-bold font-heading">Install ScanAI</h2>
						<p class="text-xs text-[var(--text-muted)]">Standalone Web Application</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (pwaStore.showInstructionsModal = false)}
					aria-label="Close modal"
					class="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] cursor-pointer transition-colors"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Platform Specific Content -->
			{#if pwaStore.platform === 'ios'}
				<div class="space-y-4">
					<p class="text-xs text-[var(--text-secondary)] leading-relaxed">
						Apple Safari requires adding apps to your Home Screen using the browser menu:
					</p>

					<div class="space-y-2.5 text-xs text-[var(--text-primary)]">
						<div class="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-3">
							<div class="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
								<Share class="w-4 h-4" />
							</div>
							<div>
								<span class="font-bold">Step 1:</span> Tap the <strong>Share</strong> button in Safari's bottom toolbar.
							</div>
						</div>

						<div class="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-3">
							<div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
								<PlusSquare class="w-4 h-4" />
							</div>
							<div>
								<span class="font-bold">Step 2:</span> Scroll down and tap <strong>Add to Home Screen</strong>.
							</div>
						</div>

						<div class="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-3">
							<div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
								<CheckCircle2 class="w-4 h-4" />
							</div>
							<div>
								<span class="font-bold">Step 3:</span> Tap <strong>Add</strong> in the top-right corner to install.
							</div>
						</div>
					</div>
				</div>
			{:else if pwaStore.platform === 'android'}
				<div class="space-y-4">
					<p class="text-xs text-[var(--text-secondary)] leading-relaxed">
						To install ScanAI on Android through your browser:
					</p>

					<div class="space-y-2.5 text-xs text-[var(--text-primary)]">
						<div class="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-3">
							<div class="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
								<MoreVertical class="w-4 h-4" />
							</div>
							<div>
								<span class="font-bold">Step 1:</span> Tap the menu icon <strong>⋮</strong> in the top right.
							</div>
						</div>

						<div class="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-3">
							<div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
								<Download class="w-4 h-4" />
							</div>
							<div>
								<span class="font-bold">Step 2:</span> Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<p class="text-xs text-[var(--text-secondary)] leading-relaxed">
						To install ScanAI as a standalone desktop app on Chrome or Edge:
					</p>

					<div class="space-y-2.5 text-xs text-[var(--text-primary)]">
						<div class="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-3">
							<div class="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
								<Monitor class="w-4 h-4" />
							</div>
							<div>
								<span class="font-bold">Method 1:</span> Look at the right side of the address bar at the top of your browser and click the <strong>Install</strong> icon.
							</div>
						</div>

						<div class="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-3">
							<div class="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
								<MoreVertical class="w-4 h-4" />
							</div>
							<div>
								<span class="font-bold">Method 2:</span> Open browser menu <strong>⋮ > Save and share > Install ScanAI</strong>.
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Modal Footer -->
			<div class="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
				<button
					type="button"
					onclick={() => (pwaStore.showInstructionsModal = false)}
					class="px-5 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
				>
					Got it
				</button>
			</div>
		</div>
	</div>
{/if}
