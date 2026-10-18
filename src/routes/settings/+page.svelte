<script>
	import { onMount } from 'svelte';
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { AI_PROVIDERS, EXPLANATION_STYLES } from '$lib/config/providers.js';
	import { THEMES } from '$lib/config/themes.js';
	import { goto } from '$app/navigation';
	import {
		Settings,
		Cpu,
		Sliders,
		Sparkles,
		KeyRound,
		Info,
		CheckCircle,
		ShieldAlert,
		RotateCcw,
		Palette,
		Activity,
		User,
		Mail,
		BarChart3,
		Trash2,
		LogOut,
		Save,
		ShieldCheck,
		Download,
		Smartphone,
		CheckCircle2
	} from '@lucide/svelte';
	import { pwaStore } from '$lib/stores/pwa.svelte.js';

	let usageData = $state({
		todayScans: 0,
		dailyLimit: 50,
		remainingToday: 50,
		totalScans: 0
	});

	let editDisplayName = $state('');
	let isSavingProfile = $state(false);
	let showDeleteModal = $state(false);
	let isDeletingAccount = $state(false);

	onMount(async () => {
		if (appState.user) {
			editDisplayName = appState.user.displayName || '';
			try {
				const res = await fetch('/api/user/profile');
				if (res.ok) {
					const data = await res.json();
					if (data.success && data.usage) {
						usageData = data.usage;
					}
				}
			} catch (e) {
				console.warn('Failed to load usage data:', e);
			}
		}
	});

	async function saveDisplayName() {
		if (!editDisplayName.trim()) return;
		isSavingProfile = true;
		try {
			const res = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: editDisplayName.trim() })
			});
			const data = await res.json();
			if (data.success && data.user) {
				appState.user = { ...appState.user, displayName: data.user.displayName };
				appState.showToast('Profile updated successfully!', 'success');
			}
		} catch (err) {
			appState.showToast('Failed to update display name', 'error');
		} finally {
			isSavingProfile = false;
		}
	}

	async function handleDefaultProviderChange(id) {
		appState.updateSettings({ defaultProvider: id });
		appState.setProvider(id);
		if (appState.isAuthenticated) {
			try {
				await fetch('/api/user/profile', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ preferences: { defaultProvider: id } })
				});
			} catch (e) {}
		}
		appState.showToast(`Default provider set to ${id.toUpperCase()}`, 'success');
	}

	async function handleDefaultStyleChange(id) {
		appState.updateSettings({ defaultStyle: id });
		appState.setStyle(id);
		if (appState.isAuthenticated) {
			try {
				await fetch('/api/user/profile', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ preferences: { defaultStyle: id } })
				});
			} catch (e) {}
		}
		appState.showToast(`Default explanation style set to ${id}`, 'success');
	}

	async function handleAnimationChange(level) {
		appState.updateSettings({ animationLevel: level });
		if (appState.isAuthenticated) {
			try {
				await fetch('/api/user/profile', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ preferences: { animationLevel: level } })
				});
			} catch (e) {}
		}
		appState.showToast(`Background motion set to ${level}`, 'info');
	}

	async function handleDeleteAccount() {
		isDeletingAccount = true;
		try {
			const res = await fetch('/api/user/account', { method: 'DELETE' });
			const data = await res.json();
			if (data.success) {
				appState.user = null;
				appState.history = [];
				appState.resetScan();
				showDeleteModal = false;
				appState.showToast('Your account and scan data have been permanently deleted', 'info');
				goto('/');
			} else {
				throw new Error(data.error || 'Account deletion failed');
			}
		} catch (err) {
			appState.showToast(err.message, 'error');
		} finally {
			isDeletingAccount = false;
		}
	}
</script>

<svelte:head>
	<title>Settings — ScanAI</title>
</svelte:head>

<div class="space-y-10 max-w-4xl mx-auto py-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)]">
		<div class="flex items-center gap-3">
			<div class="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--badge-border)] shadow-md">
				<Settings class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
					Account & Settings
				</h1>
				<p class="text-xs sm:text-sm text-[var(--text-secondary)]">
					Configure profile, server usage limits, visual themes, and persistent preferences
				</p>
			</div>
		</div>
	</div>

	<!-- Section 0: User Profile & Cloud Storage Status -->
	{#if appState.isAuthenticated && appState.user}
		<div class="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-6">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] font-bold text-lg flex items-center justify-center uppercase shadow-md">
						{appState.user.displayName ? appState.user.displayName.charAt(0) : 'U'}
					</div>
					<div>
						<h2 class="text-base font-bold text-[var(--text-primary)]">{appState.user.displayName}</h2>
						<p class="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
							<Mail class="w-3.5 h-3.5" />
							<span>{appState.user.email}</span>
							<span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-semibold border border-green-500/20">
								<ShieldCheck class="w-3 h-3" />
								<span>Verified</span>
							</span>
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={() => appState.logout()}
					class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer self-start sm:self-auto"
				>
					<LogOut class="w-3.5 h-3.5" />
					<span>Sign Out</span>
				</button>
			</div>

			<!-- Display Name Edit Form -->
			<div class="space-y-2">
				<label for="displayName" class="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
					Display Name
				</label>
				<div class="flex items-center gap-3">
					<input
						id="displayName"
						type="text"
						bind:value={editDisplayName}
						class="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
					/>
					<button
						type="button"
						onclick={saveDisplayName}
						disabled={isSavingProfile || !editDisplayName.trim()}
						class="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] text-xs font-semibold shadow-sm hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
					>
						<Save class="w-3.5 h-3.5" />
						<span>Save</span>
					</button>
				</div>
			</div>

			<!-- Usage Summary Card -->
			<div class="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
						<BarChart3 class="w-4 h-4 text-[var(--accent-primary)]" />
						<span>Daily AI Scan Allowance</span>
					</div>
					<span class="text-xs font-mono font-bold text-[var(--text-primary)]">
						{usageData.todayScans} / {usageData.dailyLimit} scans used
					</span>
				</div>

				<!-- Progress Bar -->
				<div class="w-full h-2 rounded-full bg-[var(--badge-bg)] overflow-hidden">
					<div
						class="h-full bg-[var(--accent-primary)] transition-all duration-500 rounded-full"
						style="width: {Math.min(100, (usageData.todayScans / usageData.dailyLimit) * 100)}%;"
					></div>
				</div>

				<div class="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
					<span>Remaining today: {usageData.remainingToday} scans</span>
					<span>Total scans all time: {usageData.totalScans}</span>
				</div>
			</div>
		</div>
	{:else}
		<div class="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div class="space-y-1">
				<h2 class="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
					<User class="w-4 h-4 text-[var(--accent-primary)]" />
					<span>Guest Mode</span>
				</h2>
				<p class="text-xs text-[var(--text-secondary)]">
					You are currently scanning as a guest. Sign in to store your scans in MongoDB Atlas and access history on any device.
				</p>
			</div>
			<a
				href="/login"
				class="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] text-xs font-semibold shadow-md hover:opacity-95 whitespace-nowrap"
			>
				Sign In / Register
			</a>
		</div>
	{/if}

	<!-- Section 1: Default AI Engine & Theme -->
	<div class="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-6">
		<div class="flex items-start justify-between">
			<div>
				<h2 class="text-lg font-bold font-heading text-[var(--text-primary)] flex items-center gap-2">
					<Palette class="w-5 h-5 text-[var(--accent-primary)]" />
					<span>Default AI Provider & Theme Experience</span>
				</h2>
				<p class="text-xs text-[var(--text-secondary)] mt-1">
					Select which provider activates by default on application launch
				</p>
			</div>
			<span class="text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--badge-border)]">
				Active: {appState.selectedProvider.toUpperCase()}
			</span>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			{#each AI_PROVIDERS as prov}
				{@const isDefault = appState.settings.defaultProvider === prov.id}
				<button
					type="button"
					onclick={() => handleDefaultProviderChange(prov.id)}
					class="p-4 rounded-2xl border text-left transition-all cursor-pointer {isDefault
						? 'bg-[var(--badge-bg)] border-[var(--accent-primary)] shadow-md ring-2 ring-[var(--accent-ring)]'
						: 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--card-hover-border)]'}"
				>
					<div class="flex items-center justify-between mb-2">
						<div class="w-3.5 h-3.5 rounded-full" style="background-color: {prov.accentColor};"></div>
						{#if isDefault}
							<CheckCircle class="w-4 h-4 text-[var(--accent-primary)]" />
						{/if}
					</div>
					<h3 class="text-sm font-bold text-[var(--text-primary)]">{prov.name}</h3>
					<p class="text-xs text-[var(--text-muted)] mt-1">{prov.modelName}</p>
				</button>
			{/each}
		</div>
	</div>

	<!-- Section 2: Explanation Style Preference -->
	<div class="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-6">
		<div>
			<h2 class="text-lg font-bold font-heading text-[var(--text-primary)] flex items-center gap-2">
				<Sliders class="w-5 h-5 text-[var(--accent-primary)]" />
				<span>Default Explanation Depth</span>
			</h2>
			<p class="text-xs text-[var(--text-secondary)] mt-1">
				Choose how thorough the AI responses should be when answering visual questions
			</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{#each EXPLANATION_STYLES as style}
				{@const isDefault = appState.settings.defaultStyle === style.id}
				<button
					type="button"
					onclick={() => handleDefaultStyleChange(style.id)}
					class="p-4 rounded-2xl border text-left transition-all cursor-pointer {isDefault
						? 'bg-[var(--badge-bg)] border-[var(--accent-primary)] shadow-md'
						: 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--card-hover-border)]'}"
				>
					<div class="flex items-center justify-between mb-1">
						<h3 class="text-sm font-bold text-[var(--text-primary)]">{style.label}</h3>
						{#if isDefault}
							<CheckCircle class="w-4 h-4 text-[var(--accent-primary)]" />
						{/if}
					</div>
					<p class="text-xs text-[var(--text-secondary)]">{style.description}</p>
				</button>
			{/each}
		</div>
	</div>

	<!-- Section: Application & Offline PWA -->
	<div class="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-6">
		<div class="flex items-center justify-between flex-wrap gap-4">
			<div>
				<h2 class="text-lg font-bold font-heading text-[var(--text-primary)] flex items-center gap-2">
					<Smartphone class="w-5 h-5 text-[var(--accent-primary)]" />
					<span>ScanAI Application & PWA</span>
				</h2>
				<p class="text-xs text-[var(--text-secondary)] mt-1">
					Install ScanAI as a standalone app on your mobile device or desktop for instant visual access
				</p>
			</div>

			{#if pwaStore.isInstalled}
				<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
					<CheckCircle2 class="w-4 h-4" />
					<span>Installed (Standalone Mode)</span>
				</div>
			{:else}
				<button
					type="button"
					onclick={() => pwaStore.install()}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
				>
					<Download class="w-4 h-4" />
					<span>Download / Install App</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Section 3: Danger Zone -->
	{#if appState.isAuthenticated}
		<div class="p-6 sm:p-8 rounded-3xl bg-red-500/5 border border-red-500/20 space-y-6">
			<div class="flex items-center gap-2 text-red-500">
				<ShieldAlert class="w-5 h-5" />
				<h2 class="text-base font-bold font-heading">Danger Zone</h2>
			</div>
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<p class="text-sm font-semibold text-[var(--text-primary)]">Delete Account and All Scan Data</p>
					<p class="text-xs text-[var(--text-secondary)] mt-0.5">
						Permanently delete your user profile, active sessions, scan conversations, and all GridFS stored images.
					</p>
				</div>
				<button
					type="button"
					onclick={() => (showDeleteModal = true)}
					class="px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-xs shadow-md hover:bg-red-700 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
				>
					Delete Account
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- Account Deletion Confirmation Modal -->
{#if showDeleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="w-full max-w-md rounded-3xl bg-[var(--bg-surface-elevated)] border border-red-500/30 p-6 sm:p-8 space-y-5 shadow-2xl text-center">
			<div class="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
				<ShieldAlert class="w-7 h-7" />
			</div>
			<div class="space-y-2">
				<h3 class="text-lg font-extrabold text-[var(--text-primary)] font-heading">Permanently Delete Account?</h3>
				<p class="text-xs text-[var(--text-secondary)] leading-relaxed">
					This action is <strong>irreversible</strong>. All your saved scans, conversations, multi-turn chat messages, and GridFS images will be permanently erased from MongoDB Atlas.
				</p>
			</div>
			<div class="flex items-center justify-center gap-3 pt-2">
				<button
					type="button"
					onclick={() => (showDeleteModal = false)}
					disabled={isDeletingAccount}
					class="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--badge-bg)] cursor-pointer"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleDeleteAccount}
					disabled={isDeletingAccount}
					class="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 text-white shadow-md hover:bg-red-700 cursor-pointer disabled:opacity-50"
				>
					{isDeletingAccount ? 'Deleting...' : 'Yes, Permanently Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
