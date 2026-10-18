<script>
	import { onDestroy } from 'svelte';
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { Camera, X, RefreshCw, AlertCircle, CheckCircle } from '@lucide/svelte';

	let { isOpen = false, onclose, oncapture } = $props();

	let videoElement = $state(null);
	let mediaStream = $state(null);
	let cameraError = $state(null);
	let isInitializing = $state(false);
	let facingMode = $state('environment'); // default to rear camera on mobile
	let hasMultipleCameras = $state(false);

	// Start stream when modal opens
	$effect(() => {
		if (isOpen) {
			startCamera();
		} else {
			stopCamera();
		}
	});

	onDestroy(() => {
		stopCamera();
	});

	async function startCamera() {
		stopCamera();
		cameraError = null;
		isInitializing = true;

		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
			cameraError = 'Camera access is not supported by your browser or environment.';
			isInitializing = false;
			return;
		}

		try {
			// Check for available devices to see if flip is possible
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const videoDevices = devices.filter((d) => d.kind === 'videoinput');
				hasMultipleCameras = videoDevices.length > 1;
			} catch (e) {
				hasMultipleCameras = false;
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: facingMode,
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				},
				audio: false
			});

			mediaStream = stream;
			if (videoElement) {
				videoElement.srcObject = stream;
				await videoElement.play();
			}
		} catch (err) {
			console.error('Camera access error:', err);
			if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
				cameraError = 'Camera permission was denied. Please allow camera access in your browser settings to scan items.';
			} else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
				cameraError = 'No camera device found on this system.';
			} else {
				cameraError = `Could not start camera: ${err.message || 'Unknown camera error'}`;
			}
		} finally {
			isInitializing = false;
		}
	}

	function stopCamera() {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => {
				track.stop();
			});
			mediaStream = null;
		}
		if (videoElement) {
			videoElement.srcObject = null;
		}
	}

	function switchFacingMode() {
		facingMode = facingMode === 'environment' ? 'user' : 'environment';
		startCamera();
	}

	function takePhoto() {
		if (!videoElement || !mediaStream) return;

		const videoWidth = videoElement.videoWidth || 640;
		const videoHeight = videoElement.videoHeight || 480;

		const canvas = document.createElement('canvas');
		canvas.width = videoWidth;
		canvas.height = videoHeight;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

		canvas.toBlob(
			(blob) => {
				if (blob) {
					const fileName = `camera_scan_${Date.now()}.jpg`;
					const file = new File([blob], fileName, { type: 'image/jpeg' });
					const previewUrl = URL.createObjectURL(blob);

					stopCamera();
					if (oncapture) {
						oncapture({
							file,
							previewUrl,
							name: fileName,
							size: blob.size,
							type: 'image/jpeg',
							width: videoWidth,
							height: videoHeight
						});
					}
					if (onclose) onclose();
				}
			},
			'image/jpeg',
			0.92
		);
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
			onclick={onclose}
		></div>

		<!-- Camera Modal Card -->
		<div
			class="relative w-full max-w-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
				<div class="flex items-center gap-2.5">
					<div class="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--badge-bg)] text-[var(--accent-primary)]">
						<Camera class="w-4 h-4" />
					</div>
					<div>
						<h3 class="text-base font-bold font-heading text-[var(--text-primary)]">Live Camera Scan</h3>
						<p class="text-xs text-[var(--text-muted)]">Align object or document within the viewfinder</p>
					</div>
				</div>

				<button
					type="button"
					aria-label="Close camera"
					onclick={() => {
						stopCamera();
						if (onclose) onclose();
					}}
					class="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] cursor-pointer"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Viewfinder Body -->
			<div class="relative bg-black aspect-4/3 sm:aspect-16/10 flex items-center justify-center overflow-hidden">
				{#if cameraError}
					<div class="p-8 text-center max-w-md">
						<div class="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-3">
							<AlertCircle class="w-6 h-6" />
						</div>
						<p class="text-sm font-semibold text-red-200 mb-2">Camera Unavailable</p>
						<p class="text-xs text-zinc-400 mb-4">{cameraError}</p>
						<button
							type="button"
							onclick={startCamera}
							class="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
						>
							Retry Camera Access
						</button>
					</div>
				{:else if isInitializing}
					<div class="flex flex-col items-center justify-center p-8 text-center">
						<div class="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin mb-3"></div>
						<p class="text-xs text-zinc-400">Requesting camera permissions...</p>
					</div>
				{/if}

				<!-- Live Video Element -->
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					bind:this={videoElement}
					playsinline
					autoplay
					muted
					class="w-full h-full object-cover {cameraError ? 'hidden' : 'block'}"
				></video>

				<!-- Viewfinder HUD Overlays -->
				{#if !cameraError && !isInitializing}
					<!-- Framing guide brackets -->
					<div class="pointer-events-none absolute inset-8 border border-white/20 rounded-2xl">
						<div class="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-[var(--accent-primary)] rounded-tl-lg"></div>
						<div class="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-[var(--accent-primary)] rounded-tr-lg"></div>
						<div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-[var(--accent-primary)] rounded-bl-lg"></div>
						<div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-[var(--accent-primary)] rounded-br-lg"></div>
					</div>

					<!-- Scanning target crosshairs -->
					<div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
						<div class="w-12 h-0.5 bg-white"></div>
						<div class="h-12 w-0.5 bg-white -ml-6"></div>
					</div>
				{/if}
			</div>

			<!-- Controls Footer -->
			<div class="flex items-center justify-between px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]">
				<!-- Flip Camera (if available) -->
				<div>
					{#if hasMultipleCameras}
						<button
							type="button"
							onclick={switchFacingMode}
							class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] cursor-pointer"
						>
							<RefreshCw class="w-4 h-4" />
							<span>Flip Camera</span>
						</button>
					{/if}
				</div>

				<!-- Shutter Button -->
				<div>
					<button
						type="button"
						disabled={cameraError || isInitializing}
						onclick={takePhoto}
						aria-label="Capture photo"
						class="group relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-[var(--border-strong)] bg-white/10 hover:bg-white/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-95"
					>
						<div class="w-11 h-11 rounded-full bg-[var(--accent-primary)] group-hover:scale-95 transition-transform"></div>
					</button>
				</div>

				<!-- Cancel / Close -->
				<div>
					<button
						type="button"
						onclick={() => {
							stopCamera();
							if (onclose) onclose();
						}}
						class="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] cursor-pointer"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
