<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { AI_PROVIDERS } from '$lib/config/providers.js';
	import ModelSelector from '$lib/components/scanner/ModelSelector.svelte';
	import ImageUploader from '$lib/components/scanner/ImageUploader.svelte';
	import QuestionInput from '$lib/components/scanner/QuestionInput.svelte';
	import ExplanationSelector from '$lib/components/scanner/ExplanationSelector.svelte';
	import AnswerPanel from '$lib/components/answers/AnswerPanel.svelte';
	import LoadingState from '$lib/components/shared/LoadingState.svelte';
	import {
		Sparkles,
		ArrowRight,
		Scan,
		CheckCircle,
		AlertTriangle,
		RotateCcw,
		XCircle,
		ExternalLink,
		KeyRound
	} from '@lucide/svelte';

	let currentProvider = $derived(
		AI_PROVIDERS.find((p) => p.id === appState.selectedProvider) || AI_PROVIDERS[0]
	);

	function handleScan() {
		appState.triggerAnalysis();
	}

	function handleCancel() {
		appState.cancelAnalysis();
	}

	function getDashboardUrl(providerId) {
		if (providerId === 'chatgpt') return 'https://platform.openai.com/api-keys';
		if (providerId === 'claude') return 'https://console.anthropic.com/settings/keys';
		return 'https://aistudio.google.com/app/apikey';
	}
</script>

<div class="space-y-12">
	<!-- Hero Section -->
	<section class="text-center max-w-3xl mx-auto space-y-4 pt-4 sm:pt-8">
		<div
			class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--badge-bg)] border border-[var(--badge-border)] text-xs font-semibold text-[var(--accent-primary)] shadow-sm animate-pulse-subtle"
		>
			<img src="/logo.png" alt="ScanAI" class="w-4 h-4 rounded object-cover" />
			<span>Multimodal Visual Intelligence System</span>
		</div>

		<h1
			class="text-4xl sm:text-6xl font-extrabold tracking-tight font-heading text-[var(--text-primary)] leading-[1.12]"
		>
			See it. Scan it. <br />
			<span
				class="bg-clip-text text-transparent transition-all duration-500"
				style="background-image: var(--theme-gradient);"
			>
				Understand it.
			</span>
		</h1>

		<p class="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
			Instant visual explanations, diagram deciphering, and problem solving powered by
			<span class="font-semibold text-[var(--text-primary)]">{currentProvider.name}</span>,
			ChatGPT, Claude, and Gemini.
		</p>
	</section>

	<!-- Main Workspace Grid -->
	<section class="max-w-4xl mx-auto space-y-8">
		<!-- Step 1: Model & Theme Selection -->
		<ModelSelector />

		<!-- Step 2: Visual Input (Dropzone / Camera / Preview) -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label class="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
					<Scan class="w-4 h-4 text-[var(--accent-primary)]" />
					<span>Visual Specimen or Document</span>
				</label>
				{#if appState.uploadedImage}
					<span class="text-xs text-emerald-400 flex items-center gap-1 font-medium">
						<CheckCircle class="w-3.5 h-3.5" />
						Ready to analyze
					</span>
				{:else}
					<span class="text-xs text-[var(--text-muted)]">Drop image, take photo, or paste</span>
				{/if}
			</div>

			<ImageUploader />
		</div>

		<!-- Step 3: Question & Instructions -->
		<QuestionInput onsubmit={handleScan} />

		<!-- Step 4: Explanation Depth & Language Style -->
		<ExplanationSelector />

		<!-- Step 5: Primary Action & Cancellation Controls -->
		<div class="pt-2 space-y-3">
			<div class="flex flex-col sm:flex-row items-center gap-3">
				<button
					type="button"
					disabled={!appState.uploadedImage || appState.isAnalyzing}
					onclick={handleScan}
					class="flex-1 w-full py-4 px-6 rounded-2xl font-bold font-heading text-base sm:text-lg text-[var(--accent-primary-text)] bg-[var(--accent-primary)] hover:opacity-95 transition-all duration-300 shadow-xl shadow-[var(--accent-glow)] flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none hover:scale-[1.008] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
				>
					{#if appState.isAnalyzing}
						<div class="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
						<span>
							{appState.scanStatus === 'preparing' ? 'Preparing Image...' : `Analyzing with ${currentProvider.name}...`}
						</span>
					{:else}
						<Sparkles class="w-5 h-5" />
						<span>Analyze with {currentProvider.name}</span>
						<ArrowRight class="w-5 h-5 ml-1" />
					{/if}
				</button>

				{#if appState.isAnalyzing}
					<button
						type="button"
						onclick={handleCancel}
						class="px-6 py-4 rounded-2xl font-semibold text-sm bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-all cursor-pointer flex items-center gap-2 self-stretch justify-center"
					>
						<XCircle class="w-4 h-4" />
						<span>Cancel</span>
					</button>
				{/if}
			</div>

			{#if !appState.uploadedImage}
				<p class="text-center text-xs text-[var(--text-muted)] mt-2.5">
					Upload or snap an image above to enable neural analysis
				</p>
			{/if}
		</div>

		<!-- Error State Notification -->
		{#if appState.scanError}
			<div class="p-6 rounded-3xl bg-red-950/40 border border-red-500/30 text-red-200 space-y-4 animate-in fade-in duration-300">
				<div class="flex items-start gap-3.5">
					<div class="p-2.5 rounded-xl bg-red-500/20 text-red-400 flex-shrink-0">
						<AlertTriangle class="w-6 h-6" />
					</div>
					<div class="space-y-1 flex-1">
						<h3 class="text-base font-bold font-heading text-red-100">
							{appState.scanError.code || 'Scan Request Error'}
						</h3>
						<p class="text-sm leading-relaxed text-red-200/90">
							{appState.scanError.message}
						</p>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-3 pt-2 border-t border-red-500/20">
					<button
						type="button"
						onclick={handleScan}
						class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
					>
						<RotateCcw class="w-3.5 h-3.5" />
						<span>Retry Analysis</span>
					</button>

					{#if appState.scanError.code?.includes('CONFIGURATION') || appState.scanError.code?.includes('AUTH')}
						<a
							href={getDashboardUrl(appState.selectedProvider)}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
						>
							<KeyRound class="w-3.5 h-3.5" />
							<span>Get {currentProvider.name} API Key</span>
							<ExternalLink class="w-3 h-3 ml-0.5" />
						</a>
					{/if}

					<button
						type="button"
						onclick={() => (appState.scanError = null)}
						class="px-3 py-2 text-xs text-red-300 hover:text-white ml-auto"
					>
						Dismiss
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 6: Live Streaming Chat or Result Panel -->
		{#if appState.conversation.messages.length > 0 || appState.scanResult}
			<AnswerPanel />
		{:else if appState.isAnalyzing}
			<div class="rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] shadow-2xl p-6">
				<LoadingState
					message={appState.scanStatus === 'uploading' ? 'Optimizing & Compressing Image...' : appState.scanStatus === 'connecting' ? `Connecting to ${currentProvider.name} Vision...` : 'Generating Multimodal Insights...'}
					submessage="Communicating with official {currentProvider.modelName} API endpoint"
				/>
			</div>
		{/if}
	</section>
</div>
