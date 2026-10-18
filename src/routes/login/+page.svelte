<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Lock, Mail, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, Scan } from '@lucide/svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e) {
		e.preventDefault();
		if (!email.trim() || !password) {
			errorMessage = 'Please enter both email and password.';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		const result = await appState.login(email.trim(), password);
		isSubmitting = false;

		if (result.success) {
			const redirectTo = page.url.searchParams.get('redirect') || '/';
			goto(redirectTo);
		} else {
			errorMessage = result.error || 'Invalid email or password.';
		}
	}
</script>

<svelte:head>
	<title>Sign In — ScanAI</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8 p-8 sm:p-10 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl relative overflow-hidden backdrop-blur-xl">
		<!-- Background Glow -->
		<div class="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[var(--accent-glow)] opacity-20 blur-3xl pointer-events-none"></div>

		<!-- Header -->
		<div class="text-center space-y-2">
			<div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--badge-border)] shadow-md mb-2">
				<Scan class="w-7 h-7" />
			</div>
			<h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)] tracking-tight">
				Welcome back to <span class="text-[var(--accent-primary)]">ScanAI</span>
			</h1>
			<p class="text-xs sm:text-sm text-[var(--text-secondary)]">
				Sign in to access persistent history, sync multi-turn chats, and save bookmarks
			</p>
		</div>

		<!-- Error Alert -->
		{#if errorMessage}
			<div class="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
				<span>{errorMessage}</span>
			</div>
		{/if}

		<!-- Form -->
		<form onsubmit={handleSubmit} class="space-y-5">
			<div>
				<label for="email" class="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
					Email Address
				</label>
				<div class="relative">
					<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
						<Mail class="w-4 h-4" />
					</div>
					<input
						id="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						placeholder="you@domain.com"
						class="w-full pl-10 pr-4 py-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
					/>
				</div>
			</div>

			<div>
				<label for="password" class="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
					Password
				</label>
				<div class="relative">
					<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
						<Lock class="w-4 h-4" />
					</div>
					<input
						id="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="current-password"
						required
						bind:value={password}
						placeholder="••••••••"
						class="w-full pl-10 pr-11 py-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
					/>
					<button
						type="button"
						onclick={() => (showPassword = !showPassword)}
						class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
					>
						{#if showPassword}
							<EyeOff class="w-4 h-4" />
						{:else}
							<Eye class="w-4 h-4" />
						{/if}
					</button>
				</div>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				class="w-full py-3.5 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] font-semibold text-sm shadow-lg hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isSubmitting}
					<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
					<span>Authenticating...</span>
				{:else}
					<span>Sign In to Account</span>
					<ArrowRight class="w-4 h-4" />
				{/if}
			</button>
		</form>

		<!-- Footer Links -->
		<div class="text-center pt-2 border-t border-[var(--border-subtle)] space-y-2">
			<p class="text-xs text-[var(--text-secondary)]">
				Don't have an account yet?
				<a href="/register" class="text-[var(--accent-primary)] font-semibold hover:underline ml-1">
					Create an account
				</a>
			</p>
			<p class="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1">
				<ShieldCheck class="w-3.5 h-3.5 text-green-500" />
				<span>Argon2id encrypted credentials & private sessions</span>
			</p>
		</div>
	</div>
</div>
