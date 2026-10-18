<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { goto } from '$app/navigation';
	import { User, Lock, Mail, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, Check, Scan } from '@lucide/svelte';

	let displayName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	let hasMinLength = $derived(password.length >= 8);
	let hasUppercase = $derived(/[A-Z]/.test(password));
	let hasLowercase = $derived(/[a-z]/.test(password));
	let hasNumber = $derived(/[0-9]/.test(password));
	let passwordsMatch = $derived(password.length > 0 && password === confirmPassword);

	async function handleSubmit(e) {
		e.preventDefault();

		if (!displayName.trim()) {
			errorMessage = 'Please enter your display name.';
			return;
		}

		if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
			errorMessage = 'Password does not meet the security criteria below.';
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		const result = await appState.register(displayName.trim(), email.trim(), password);
		isSubmitting = false;

		if (result.success) {
			goto('/');
		} else {
			errorMessage = result.error || 'Failed to create account.';
		}
	}
</script>

<svelte:head>
	<title>Create Account — ScanAI</title>
</svelte:head>

<div class="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8 p-8 sm:p-10 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl relative overflow-hidden backdrop-blur-xl">
		<!-- Background Glow -->
		<div class="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[var(--accent-glow)] opacity-20 blur-3xl pointer-events-none"></div>

		<!-- Header -->
		<div class="text-center space-y-2">
			<div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--badge-border)] shadow-md mb-2">
				<Scan class="w-7 h-7" />
			</div>
			<h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)] tracking-tight">
				Create your <span class="text-[var(--accent-primary)]">ScanAI</span> account
			</h1>
			<p class="text-xs sm:text-sm text-[var(--text-secondary)]">
				Save scan conversations to MongoDB Atlas, access multi-turn follow-ups, and sync across devices
			</p>
		</div>

		<!-- Error Alert -->
		{#if errorMessage}
			<div class="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
				<span>{errorMessage}</span>
			</div>
		{/if}

		<!-- Form -->
		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<label for="displayName" class="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
					Full Name / Display Name
				</label>
				<div class="relative">
					<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
						<User class="w-4 h-4" />
					</div>
					<input
						id="displayName"
						type="text"
						autocomplete="name"
						required
						bind:value={displayName}
						placeholder="Ada Lovelace"
						class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
					/>
				</div>
			</div>

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
						class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
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
						autocomplete="new-password"
						required
						bind:value={password}
						placeholder="At least 8 chars"
						class="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
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

			<div>
				<label for="confirmPassword" class="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
					Confirm Password
				</label>
				<div class="relative">
					<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
						<Lock class="w-4 h-4" />
					</div>
					<input
						id="confirmPassword"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						required
						bind:value={confirmPassword}
						placeholder="Repeat password"
						class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
					/>
				</div>
			</div>

			<!-- Password Security Requirements Checklist -->
			<div class="p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1.5 text-[11px]">
				<p class="font-semibold text-[var(--text-muted)] uppercase tracking-wider">Password Requirements</p>
				<div class="grid grid-cols-2 gap-1 text-[var(--text-secondary)]">
					<div class="flex items-center gap-1.5 {hasMinLength ? 'text-green-500 font-medium' : ''}">
						<Check class="w-3 h-3 {hasMinLength ? 'opacity-100' : 'opacity-30'}" />
						<span>8+ characters</span>
					</div>
					<div class="flex items-center gap-1.5 {hasUppercase ? 'text-green-500 font-medium' : ''}">
						<Check class="w-3 h-3 {hasUppercase ? 'opacity-100' : 'opacity-30'}" />
						<span>1 uppercase letter</span>
					</div>
					<div class="flex items-center gap-1.5 {hasLowercase ? 'text-green-500 font-medium' : ''}">
						<Check class="w-3 h-3 {hasLowercase ? 'opacity-100' : 'opacity-30'}" />
						<span>1 lowercase letter</span>
					</div>
					<div class="flex items-center gap-1.5 {hasNumber ? 'text-green-500 font-medium' : ''}">
						<Check class="w-3 h-3 {hasNumber ? 'opacity-100' : 'opacity-30'}" />
						<span>1 number</span>
					</div>
				</div>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				class="w-full py-3.5 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] font-semibold text-sm shadow-lg hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isSubmitting}
					<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
					<span>Creating Account...</span>
				{:else}
					<span>Create Account</span>
					<ArrowRight class="w-4 h-4" />
				{/if}
			</button>
		</form>

		<!-- Footer Links -->
		<div class="text-center pt-2 border-t border-[var(--border-subtle)] space-y-2">
			<p class="text-xs text-[var(--text-secondary)]">
				Already have an account?
				<a href="/login" class="text-[var(--accent-primary)] font-semibold hover:underline ml-1">
					Sign in here
				</a>
			</p>
			<p class="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1">
				<ShieldCheck class="w-3.5 h-3.5 text-green-500" />
				<span>Private MongoDB Atlas database & GridFS storage</span>
			</p>
		</div>
	</div>
</div>
