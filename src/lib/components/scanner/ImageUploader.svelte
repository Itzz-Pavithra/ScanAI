<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { validateImageFile } from '$lib/utils/image-validation.js';
	import { getImageDimensions } from '$lib/utils/file-utils.js';
	import CameraCapture from './CameraCapture.svelte';
	import ImagePreview from './ImagePreview.svelte';
	import { UploadCloud, Camera, Image as ImageIcon, Sparkles, AlertCircle, FileText } from '@lucide/svelte';

	let fileInputElement = $state(null);
	let isDragging = $state(false);
	let errorMessage = $state(null);
	let isCameraOpen = $state(false);

	async function processFile(file) {
		errorMessage = null;

		const validation = validateImageFile(file);
		if (!validation.valid) {
			errorMessage = validation.error;
			appState.showToast(validation.error, 'error');
			return;
		}

		try {
			const previewUrl = URL.createObjectURL(file);
			const dimensions = await getImageDimensions(previewUrl);

			appState.setImage({
				file,
				previewUrl,
				name: file.name,
				size: file.size,
				type: file.type,
				width: dimensions.width,
				height: dimensions.height
			});

			appState.showToast('Image loaded successfully', 'info');
		} catch (err) {
			console.error('Error preparing image preview:', err);
			errorMessage = 'Failed to load image preview.';
		}
	}

	function handleFileInputChange(event) {
		const files = event.target.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
		// Reset input value so re-selecting same file triggers change
		if (fileInputElement) fileInputElement.value = '';
	}

	function handleDragOver(e) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(e) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	function triggerFilePicker() {
		if (fileInputElement) {
			fileInputElement.click();
		}
	}

	// Paste listener
	function handlePaste(e) {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (const item of items) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) {
					processFile(file);
					break;
				}
			}
		}
	}
</script>

<svelte:window onpaste={handlePaste} />

<!-- Hidden File Input -->
<input
	bind:this={fileInputElement}
	type="file"
	accept="image/png, image/jpeg, image/jpg, image/webp"
	class="hidden"
	onchange={handleFileInputChange}
/>

{#if appState.uploadedImage}
	<!-- Render Preview Component if image is already selected -->
	<ImagePreview onreplace={triggerFilePicker} />
{:else}
	<!-- Empty / Dropzone State -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		class="relative group rounded-3xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer {isDragging
			? 'border-[var(--accent-primary)] bg-[var(--badge-bg)] scale-[1.008]'
			: 'border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)]/70 hover:border-[var(--card-hover-border)]'}"
		onclick={triggerFilePicker}
		onkeydown={(e) => {
			if (e.key === ' ' || e.key === 'Enter') {
				e.preventDefault();
				triggerFilePicker();
			}
		}}
		tabindex="0"
		role="button"
		aria-label="Upload or capture image to scan"
	>
		<!-- Background subtle glow -->
		<div class="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-radial-[circle_at_center,_var(--accent-glow)_0%,_transparent_70%]"></div>

		<!-- Main visual icon container -->
		<div class="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] mb-6 shadow-xl group-hover:scale-105 transition-transform duration-300">
			<div class="absolute inset-0 rounded-3xl opacity-30 blur-md bg-[var(--accent-primary)]"></div>
			<UploadCloud class="w-9 h-9 text-[var(--accent-primary)] relative z-10" />
		</div>

		<!-- Title and description -->
		<h2 class="text-xl sm:text-2xl font-bold font-heading text-[var(--text-primary)] mb-2">
			Drop your image here, or browse
		</h2>
		<p class="text-sm text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
			Upload documents, diagrams, math problems, specimens, or photos. You can also paste directly from clipboard (<kbd class="px-1.5 py-0.5 text-xs font-mono rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">Ctrl+V</kbd>).
		</p>

		<!-- Action buttons -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex flex-wrap items-center justify-center gap-3 relative z-10" onclick={(e) => e.stopPropagation()}>
			<!-- Browse Button -->
			<button
				type="button"
				onclick={triggerFilePicker}
				class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--accent-primary-text)] hover:opacity-90 transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
			>
				<ImageIcon class="w-4 h-4" />
				<span>Choose File</span>
			</button>

			<!-- Live Camera Button -->
			<button
				type="button"
				onclick={() => (isCameraOpen = true)}
				class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
			>
				<Camera class="w-4 h-4 text-[var(--accent-primary)]" />
				<span>Use Camera</span>
			</button>
		</div>

		<!-- Supported specs footer badge -->
		<div class="mt-8 pt-4 border-t border-[var(--border-subtle)]/60 flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
			<span>PNG, JPG, JPEG, WEBP</span>
			<span>•</span>
			<span>Up to 15 MB</span>
			<span>•</span>
			<span>Encrypted in-browser</span>
		</div>
	</div>
{/if}

<!-- Error Alert -->
{#if errorMessage}
	<div class="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs mt-3 animate-in fade-in duration-200">
		<AlertCircle class="w-4 h-4 flex-shrink-0 text-red-400" />
		<span>{errorMessage}</span>
	</div>
{/if}

<!-- Camera Modal -->
<CameraCapture
	isOpen={isCameraOpen}
	onclose={() => (isCameraOpen = false)}
	oncapture={(capturedImage) => {
		appState.setImage(capturedImage);
		appState.showToast('Camera snapshot captured!', 'success');
	}}
/>
