import { appState } from './app-state.svelte.js';

class PwaManagerStore {
	deferredPrompt = $state(null);
	canInstall = $state(false);
	isInstalled = $state(false);
	isPrompting = $state(false);
	isDismissed = $state(false);
	hasUpdate = $state(false);
	waitingWorker = $state(null);
	isOffline = $state(false);
	showInstructionsModal = $state(false);
	platform = $state('desktop'); // 'ios' | 'android' | 'desktop' | 'other'
	initialized = false;
	userRequestedUpdate = false;

	constructor() {
		// Browser hydration will call init()
	}

	init() {
		if (this.initialized || typeof window === 'undefined') return;
		this.initialized = true;

		// 1. Detect standalone / installed state
		this.checkInstalledStatus();

		// 2. Detect device platform
		this.detectPlatform();

		// 3. Online / Offline status
		this.isOffline = !navigator.onLine;
		window.addEventListener('online', () => { this.isOffline = false; });
		window.addEventListener('offline', () => { this.isOffline = true; });

		// 4. Session dismissal check
		try {
			if (sessionStorage.getItem('scanai_pwa_banner_dismissed')) {
				this.isDismissed = true;
			}
		} catch (e) {}

		// 5. Capture native beforeinstallprompt event
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.deferredPrompt = e;
			this.canInstall = true;
		});

		// 6. Listen for app installation completion
		window.addEventListener('appinstalled', () => {
			this.isInstalled = true;
			this.canInstall = false;
			this.deferredPrompt = null;
			this.showInstructionsModal = false;
			appState.showToast('ScanAI installed successfully!', 'success');
		});

		// 7. Register Service Worker and manage updates safely
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').then((reg) => {
				if (reg.waiting) {
					this.waitingWorker = reg.waiting;
					this.hasUpdate = true;
				}

				reg.addEventListener('updatefound', () => {
					const newWorker = reg.installing;
					if (!newWorker) return;

					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							this.waitingWorker = newWorker;
							this.hasUpdate = true;
						}
					});
				});
			}).catch((err) => {
				console.debug('[SW] Registration note:', err?.message);
			});

			// Only reload if the user deliberately clicked "Update"
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (this.userRequestedUpdate) {
					window.location.reload();
				}
			});
		}
	}

	checkInstalledStatus() {
		if (typeof window === 'undefined') return;
		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			window.navigator.standalone === true ||
			document.referrer.includes('android-app://');

		this.isInstalled = isStandalone;
		if (isStandalone) {
			this.canInstall = false;
		}
	}

	detectPlatform() {
		if (typeof navigator === 'undefined') return;
		const ua = navigator.userAgent || '';
		if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
			this.platform = 'ios';
		} else if (/Android/.test(ua)) {
			this.platform = 'android';
		} else if (/Chrome|Edg|OPR|Firefox|Safari/.test(ua)) {
			this.platform = 'desktop';
		} else {
			this.platform = 'other';
		}
	}

	async install() {
		if (this.isInstalled) {
			appState.showToast('ScanAI is already installed on this device.', 'info');
			return;
		}

		if (this.isPrompting) return;

		// If native beforeinstallprompt is ready
		if (this.deferredPrompt) {
			this.isPrompting = true;
			try {
				await this.deferredPrompt.prompt();
				const choice = await this.deferredPrompt.userChoice;
				if (choice.outcome === 'accepted') {
					this.isInstalled = true;
					this.canInstall = false;
					this.deferredPrompt = null;
					appState.showToast('ScanAI installed successfully!', 'success');
				} else {
					appState.showToast('Installation dismissed.', 'info');
				}
			} catch (err) {
				console.warn('Native install prompt failed:', err);
				this.showInstructionsModal = true;
			} finally {
				this.isPrompting = false;
			}
		} else {
			// Native prompt unavailable (iOS Safari, Firefox, or already deferred)
			this.showInstructionsModal = true;
		}
	}

	dismissBanner() {
		this.isDismissed = true;
		try {
			sessionStorage.setItem('scanai_pwa_banner_dismissed', '1');
		} catch (e) {}
	}

	triggerUpdate() {
		this.userRequestedUpdate = true;
		if (this.waitingWorker) {
			this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
		} else {
			window.location.reload();
		}
	}
}

export const pwaStore = new PwaManagerStore();
