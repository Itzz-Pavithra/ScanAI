<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { formatBytes } from '$lib/utils/file-utils.js';
	import { Trash2, RefreshCw, Maximize2, X, CheckCircle2 } from '@lucide/svelte';

	let { onreplace } = $props();

	let isZoomModalOpen = $state(false);
	let img = $derived(appState.uploadedImage);
</script>

{#if img}
	<div
		class="relative w-full rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] overflow-hidden shadow-xl transition-all"
	>
		<!-- Image Display Container -->
		<div class="relative w-full max-h-[420px] sm:max-h-[480px] bg-black/40 flex items-center justify-center overflow-hidden">
			<img
				src={img.previewUrl}
				alt={img.name || 'Scanned specimen'}
				class="w-full h-auto max-h-[420px] sm:max-h-[480px] object-contain select-none"
			/>

			<!-- Laser Scan Beam Animation when Analyzing -->
			{#if appState.isAnalyzing}
				<div class="pointer-events-none absolute inset-x-0 h-1 bg-[var(--scan-beam)] shadow-[0_0_20px_4px_var(--scan-glow)] animate-scan z-20"></div>
				<div class="absolute inset-0 bg-[var(--scan-glow)]/10 pointer-events-none z-10 backdrop-blur-[1px]"></div>
				<div class="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-[var(--accent-primary)]/50 text-xs font-mono text-[var(--accent-primary)]">
					<span class="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-ping"></span>
					<span>NEURAL SCAN IN PROGRESS...</span>
				</div>
			{/if}

			<!-- Top Quick Action Floating Pills -->
			<div class="absolute top-3 right-3 flex items-center gap-2 z-20">
				<!-- Fullscreen Zoom Button -->
				<button
					type="button"
					aria-label="Zoom image"
					onclick={() => (isZoomModalOpen = true)}
					class="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-md hover:scale-105"
				>
					<Maximize2 class="w-4 h-4" />
				</button>

				<!-- Remove Image Button -->
				<button
					type="button"
					aria-label="Remove image"
					onclick={() => appState.clearImage()}
					class="p-2 rounded-xl bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-md border border-red-400/30 transition-all cursor-pointer shadow-md hover:scale-105"
				>
					<Trash2 class="w-4 h-4" />
				</button>
			</div>
		</div>

		<!-- Metadata & Replace Bar -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-xs">
			<div class="flex items-center gap-3 overflow-hidden">
				<div class="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></div>
				<div class="truncate">
					<p class="font-medium text-[var(--text-primary)] truncate">{img.name || 'Scanned Image'}</p>
					<p class="text-[var(--text-muted)] font-mono">
						{formatBytes(img.size)} • {img.type || 'image/jpeg'}
						{#if img.width && img.height}
							• {img.width}×{img.height}px
						{/if}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2 self-end sm:self-auto">
				{#if onreplace}
					<button
						type="button"
						onclick={onreplace}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] transition-colors cursor-pointer"
					>
						<RefreshCw class="w-3.5 h-3.5" />
						<span>Replace Image</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Zoom Modal -->
{#if isZoomModalOpen && img}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 bg-black/90 backdrop-blur-lg"
			onclick={() => (isZoomModalOpen = false)}
		></div>

		<div class="relative max-w-5xl max-h-[90vh] z-10 flex flex-col items-center">
			<button
				type="button"
				aria-label="Close zoom preview"
				onclick={() => (isZoomModalOpen = false)}
				class="absolute -top-12 right-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
			>
				<X class="w-6 h-6" />
			</button>
			<img
				src={img.previewUrl}
				alt={img.name || 'Zoomed preview'}
				class="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
			/>
		</div>
	</div>
{/if}
