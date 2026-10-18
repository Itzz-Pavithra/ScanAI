<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { pwaStore } from '$lib/stores/pwa.svelte.js';
	import { AI_PROVIDERS } from '$lib/config/providers.js';
	import { X, Scan, History, Settings, Sparkles, User, LogIn, LogOut, ShieldCheck, Download } from '@lucide/svelte';

	let { isOpen = false, onclose } = $props();

	function handleSelectProvider(id) {
		appState.setProvider(id);
		if (onclose) onclose();
	}

	async function handleLogout() {
		if (onclose) onclose();
		await appState.logout();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 md:hidden">
		<!-- Backdrop -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
			onclick={onclose}
		></div>

		<!-- Drawer -->
		<div
			class="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-[var(--bg-surface-elevated)] border-l border-[var(--border-subtle)] p-6 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto"
		>
			<div class="space-y-6">
				<!-- Header in Drawer -->
				<div class="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
					<div class="flex items-center gap-2.5">
						<div class="flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden border border-[var(--badge-border)] shadow-sm">
							<img src="/logo.png" alt="ScanAI Logo" class="w-full h-full object-cover" />
						</div>
						<span class="font-bold text-lg font-heading tracking-tight text-[var(--text-primary)]">ScanAI</span>
					</div>
					<button
						type="button"
						aria-label="Close menu"
						onclick={onclose}
						class="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] cursor-pointer"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<!-- User Profile Card in Drawer -->
				{#if appState.isAuthenticated && appState.user}
					<div class="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] font-bold text-sm flex items-center justify-center uppercase shadow-sm">
								{appState.user.displayName ? appState.user.displayName.charAt(0) : 'U'}
							</div>
							<div class="overflow-hidden">
								<p class="text-xs font-bold text-[var(--text-primary)] truncate">{appState.user.displayName}</p>
								<p class="text-[11px] text-[var(--text-muted)] truncate">{appState.user.email}</p>
							</div>
						</div>
						<button
							type="button"
							onclick={handleLogout}
							aria-label="Sign out"
							class="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
						>
							<LogOut class="w-4 h-4" />
						</button>
					</div>
				{:else}
					<div class="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
						<p class="text-xs text-[var(--text-secondary)]">Sign in to sync your scans & multi-turn conversations.</p>
						<a
							href="/login"
							onclick={onclose}
							class="w-full py-2.5 px-3 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] font-semibold text-xs flex items-center justify-center gap-2 shadow-sm"
						>
							<LogIn class="w-3.5 h-3.5" />
							<span>Sign In / Register</span>
						</a>
					</div>
				{/if}

				<!-- Navigation links -->
				<nav class="space-y-1.5">
					<a
						href="/"
						onclick={onclose}
						class="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors"
					>
						<Scan class="w-4 h-4 text-[var(--accent-primary)]" />
						<span>Visual Scanner</span>
					</a>
					<a
						href="/history"
						onclick={onclose}
						class="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors"
					>
						<History class="w-4 h-4 text-[var(--text-secondary)]" />
						<span>Saved Scans</span>
						{#if appState.history.length > 0}
							<span class="ml-auto text-xs px-2 py-0.5 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] font-bold">
								{appState.history.length}
							</span>
						{/if}
					</a>
					<a
						href="/settings"
						onclick={onclose}
						class="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors"
					>
						<Settings class="w-4 h-4 text-[var(--text-secondary)]" />
						<span>Settings & Limits</span>
					</a>
					{#if !pwaStore.isInstalled}
						<button
							type="button"
							onclick={() => {
								if (onclose) onclose();
								pwaStore.install();
							}}
							class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--badge-bg)] transition-colors text-left cursor-pointer"
						>
							<Download class="w-4 h-4" />
							<span>Download / Install App</span>
						</button>
					{/if}
				</nav>

				<!-- Quick Provider Switcher -->
				<div class="pt-4 border-t border-[var(--border-subtle)]">
					<p class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
						Active AI Provider
					</p>
					<div class="space-y-2">
						{#each AI_PROVIDERS as provider}
							<button
								type="button"
								onclick={() => handleSelectProvider(provider.id)}
								class="w-full flex items-center justify-between p-3 rounded-2xl text-left border transition-all cursor-pointer {appState.selectedProvider === provider.id
									? 'bg-[var(--badge-bg)] border-[var(--accent-primary)] text-[var(--text-primary)] shadow-sm'
									: 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--card-hover-border)]'}"
							>
								<div class="flex items-center gap-3">
									<div
										class="w-3 h-3 rounded-full"
										style="background-color: {provider.accentColor};"
									></div>
									<div>
										<p class="text-sm font-semibold text-[var(--text-primary)]">{provider.name}</p>
										<p class="text-xs text-[var(--text-muted)]">{provider.modelName}</p>
									</div>
								</div>
								{#if appState.selectedProvider === provider.id}
									<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-text)]">
										Active
									</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Footer note -->
			<div class="text-[11px] text-[var(--text-muted)] text-center pt-4 border-t border-[var(--border-subtle)]">
				ScanAI Platform • Phase 4
			</div>
		</div>
	</div>
{/if}
