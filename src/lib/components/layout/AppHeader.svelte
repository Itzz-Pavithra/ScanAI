<script>
	import { page } from '$app/state';
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { pwaStore } from '$lib/stores/pwa.svelte.js';
	import { AI_PROVIDERS } from '$lib/config/providers.js';
	import MobileNavigation from './MobileNavigation.svelte';
	import { Scan, History, Settings, ChevronDown, Sparkles, Menu, Cpu, User, LogIn, LogOut, Bookmark, Download } from '@lucide/svelte';

	let isDropdownOpen = $state(false);
	let isUserDropdownOpen = $state(false);
	let isMobileNavOpen = $state(false);

	let currentProvider = $derived(
		AI_PROVIDERS.find((p) => p.id === appState.selectedProvider) || AI_PROVIDERS[0]
	);

	function selectProvider(id) {
		appState.setProvider(id);
		isDropdownOpen = false;
	}

	function toggleDropdown() {
		isDropdownOpen = !isDropdownOpen;
		isUserDropdownOpen = false;
	}

	function toggleUserDropdown() {
		isUserDropdownOpen = !isUserDropdownOpen;
		isDropdownOpen = false;
	}

	async function handleLogout() {
		isUserDropdownOpen = false;
		await appState.logout();
	}
</script>

<svelte:window onclick={(e) => {
	// Close dropdowns when clicking outside
	const target = e.target;
	if (!target?.closest?.('#provider-dropdown-container')) {
		isDropdownOpen = false;
	}
	if (!target?.closest?.('#user-dropdown-container')) {
		isUserDropdownOpen = false;
	}
}} />

<header
	class="sticky top-0 z-40 w-full backdrop-blur-xl bg-[var(--bg-surface-glass)] border-b border-[var(--border-subtle)] transition-colors duration-500"
>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
		<!-- Brand Logo -->
		<a
			href="/"
			class="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] rounded-xl p-1"
		>
			<div
				class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-black/40 border border-[var(--border-strong)] shadow-md group-hover:scale-105 transition-transform duration-300 overflow-hidden"
			>
				<div
					class="absolute inset-0 rounded-2xl opacity-40 blur-[6px] transition-colors duration-500"
					style="background-color: {currentProvider.accentColor};"
				></div>
				<img
					src="/logo.png"
					alt="ScanAI Logo"
					class="w-full h-full object-cover relative z-10"
				/>
			</div>
			<div class="flex flex-col">
				<div class="flex items-center gap-2">
					<span class="text-xl font-bold tracking-tight font-heading text-[var(--text-primary)]">
						Scan<span class="text-[var(--accent-primary)] transition-colors duration-500">AI</span>
					</span>
					<span
						class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--badge-border)] bg-[var(--badge-bg)] text-[var(--badge-text)] transition-all duration-500"
					>
						{currentProvider.name}
					</span>
				</div>
				<span class="text-[11px] text-[var(--text-muted)] hidden sm:inline -mt-0.5">Visual Intelligence</span>
			</div>
		</a>

		<!-- Desktop Navigation -->
		<nav class="hidden md:flex items-center gap-1 bg-[var(--bg-surface)] p-1.5 rounded-2xl border border-[var(--border-subtle)] shadow-inner">
			<a
				href="/"
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 {page.url.pathname === '/'
					? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] shadow-sm'
					: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)]'}"
			>
				<Scan class="w-4 h-4" />
				<span>Scanner</span>
			</a>
			<a
				href="/history"
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 {page.url.pathname === '/history'
					? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] shadow-sm'
					: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)]'}"
			>
				<History class="w-4 h-4" />
				<span>History</span>
				{#if appState.history.length > 0}
					<span class="ml-0.5 text-xs px-1.5 py-0.2 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
						{appState.history.length}
					</span>
				{/if}
			</a>
			<a
				href="/settings"
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 {page.url.pathname === '/settings'
					? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] shadow-sm'
					: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)]'}"
			>
				<Settings class="w-4 h-4" />
				<span>Settings</span>
			</a>
		</nav>

		<!-- Right Controls: Provider Switcher & User Account Controls -->
		<div class="flex items-center gap-3">
			<!-- Install App Action -->
			{#if !pwaStore.isInstalled}
				<button
					type="button"
					onclick={() => pwaStore.install()}
					aria-label="Install ScanAI App"
					title="Install ScanAI App"
					class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--badge-bg)] hover:bg-[var(--border-subtle)] text-[var(--accent-primary)] border border-[var(--badge-border)] text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
				>
					<Download class="w-3.5 h-3.5" />
					<span>Install App</span>
				</button>
			{/if}

			<!-- Provider Dropdown Switcher -->
			<div class="relative" id="provider-dropdown-container">
				<button
					type="button"
					onclick={toggleDropdown}
					aria-expanded={isDropdownOpen}
					aria-label="Select AI Provider"
					class="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] transition-all cursor-pointer shadow-sm text-sm"
				>
					<div
						class="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-[var(--bg-surface-elevated)] transition-colors duration-500"
						style="background-color: {currentProvider.accentColor}; --tw-ring-color: {currentProvider.glowColor};"
					></div>
					<div class="text-left hidden sm:block">
						<p class="text-xs font-semibold text-[var(--text-primary)] leading-none">{currentProvider.name}</p>
						<p class="text-[10px] text-[var(--text-muted)] mt-0.5">{currentProvider.modelName}</p>
					</div>
					<span class="sm:hidden text-xs font-semibold text-[var(--text-primary)]">{currentProvider.name}</span>
					<ChevronDown class="w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 {isDropdownOpen ? 'rotate-180' : ''}" />
				</button>

				{#if isDropdownOpen}
					<div
						class="absolute right-0 mt-2 w-72 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
					>
						<div class="px-3 py-2 border-b border-[var(--border-subtle)] mb-1">
							<p class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
								Switch AI Model & Theme
							</p>
						</div>
						<div class="space-y-1">
							{#each AI_PROVIDERS as provider}
								<button
									type="button"
									onclick={() => selectProvider(provider.id)}
									class="w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer {appState.selectedProvider === provider.id
										? 'bg-[var(--badge-bg)] text-[var(--text-primary)] font-medium'
										: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}"
								>
									<div class="flex items-center gap-3">
										<div
											class="w-3.5 h-3.5 rounded-full flex-shrink-0"
											style="background-color: {provider.accentColor};"
										></div>
										<div>
											<p class="text-sm font-semibold">{provider.name}</p>
											<p class="text-xs text-[var(--text-muted)]">{provider.tagline}</p>
										</div>
									</div>
									{#if appState.selectedProvider === provider.id}
										<div class="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- User Authentication Controls -->
			<div class="relative" id="user-dropdown-container">
				{#if appState.isAuthenticated && appState.user}
					<button
						type="button"
						onclick={toggleUserDropdown}
						class="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-2xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all cursor-pointer shadow-sm"
					>
						<div class="w-7 h-7 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] font-bold text-xs flex items-center justify-center uppercase shadow-sm">
							{appState.user.displayName ? appState.user.displayName.charAt(0) : 'U'}
						</div>
						<span class="hidden sm:inline text-xs font-semibold text-[var(--text-primary)] max-w-24 truncate">
							{appState.user.displayName}
						</span>
						<ChevronDown class="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:inline" />
					</button>

					{#if isUserDropdownOpen}
						<div
							class="absolute right-0 mt-2 w-64 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
						>
							<div class="px-3 py-2.5 border-b border-[var(--border-subtle)] mb-1">
								<p class="text-xs font-bold text-[var(--text-primary)] truncate">{appState.user.displayName}</p>
								<p class="text-[11px] text-[var(--text-muted)] truncate">{appState.user.email}</p>
							</div>
							<div class="space-y-1">
								<a
									href="/history"
									onclick={() => (isUserDropdownOpen = false)}
									class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
								>
									<History class="w-4 h-4 text-[var(--accent-primary)]" />
									<span>Saved Scans</span>
								</a>
								<a
									href="/settings"
									onclick={() => (isUserDropdownOpen = false)}
									class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
								>
									<Settings class="w-4 h-4 text-[var(--accent-primary)]" />
									<span>Account & Limits</span>
								</a>
								<button
									type="button"
									onclick={handleLogout}
									class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
								>
									<LogOut class="w-4 h-4" />
									<span>Sign Out</span>
								</button>
							</div>
						</div>
					{/if}
				{:else}
					<a
						href="/login"
						class="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] font-semibold text-xs shadow-md hover:shadow-lg hover:opacity-95 transition-all"
					>
						<LogIn class="w-3.5 h-3.5" />
						<span class="hidden sm:inline">Sign In</span>
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button
				type="button"
				onclick={() => (isMobileNavOpen = true)}
				aria-label="Open mobile navigation menu"
				class="md:hidden p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
			>
				<Menu class="w-5 h-5" />
			</button>
		</div>
	</div>
</header>

<MobileNavigation isOpen={isMobileNavOpen} onclose={() => (isMobileNavOpen = false)} />
