import { AI_PROVIDERS, EXPLANATION_STYLES } from '../config/providers.js';
import { parseAIResponse } from '../utils/response-parser.js';
import { iterateSSEStream } from '../utils/sse-parser.js';
import { compressImageIfBeneficial } from '../utils/image-compression.js';

// Initial sample demonstration scans for history
const SEED_HISTORY = [
	{
		id: 'scan-demo-1',
		title: 'Robotics Circuit Board Schematic',
		providerId: 'chatgpt',
		styleId: 'step-by-step',
		timestamp: '2026-10-18T10:30:00Z',
		formattedDate: 'Today, 10:30 AM',
		imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
		question: 'Identify the microcontroller, power regulation capacitors, and any signal bottlenecks.',
		summary: 'Analysis confirms an STM32 ARM Cortex-M4 MCU with a switching DC-DC buck regulator and multi-rail filtering capacitors.',
		steps: [
			'Pinout validation confirms STM32F401 series operating at 84MHz.',
			'Primary 5V to 3.3V power stage utilizes a low-dropout linear regulator with 10µF ceramic decouping.',
			'SPI and I2C buses have onboard pull-up resistors (4.7kΩ) directly adjacent to the header.'
		],
		confidence: '98.4%',
		isMock: true
	},
	{
		id: 'scan-demo-2',
		title: 'Organic Botanical Specimen (Monstera Deliciosa)',
		providerId: 'gemini',
		styleId: 'detailed',
		timestamp: '2026-10-17T16:15:00Z',
		formattedDate: 'Yesterday, 4:15 PM',
		imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&auto=format&fit=crop&q=80',
		question: 'What plant species is this, what causes the fenestrations, and what are its light requirements?',
		summary: 'Identified as Monstera Deliciosa (Swiss Cheese Plant), exhibiting healthy mature fenestrations that maximize canopy light penetration.',
		steps: [
			'Morphology: Characteristic deep leaf perforations allow lower foliage to capture diffused sunlight.',
			'Health: Chlorophyll distribution indicates adequate indirect illumination with zero chlorosis.',
			'Recommendation: Maintain 65-75°F ambient temperature and water when top 2 inches of soil are dry.'
		],
		confidence: '99.1%',
		isMock: true
	},
	{
		id: 'scan-demo-3',
		title: 'Handwritten Calculus Differential Equation',
		providerId: 'claude',
		styleId: 'step-by-step',
		timestamp: '2026-10-16T11:45:00Z',
		formattedDate: 'Oct 16, 11:45 AM',
		imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
		question: 'Solve this second-order linear differential equation with constant coefficients.',
		summary: 'Exact solution derived for y\'\' - 4y\' + 13y = 0 with complex conjugate roots in the auxiliary polynomial.',
		steps: [
			'Form auxiliary equation: r² - 4r + 13 = 0.',
			'Compute quadratic roots: r = (4 ± √(16 - 52))/2 = 2 ± 3i.',
			'General solution: y(x) = e^(2x) · [C₁ cos(3x) + C₂ sin(3x)].'
		],
		confidence: '99.7%',
		isMock: true
	}
];

class AppStateManager {
	selectedProvider = $state(
		typeof document !== 'undefined' &&
		document.documentElement?.dataset?.theme &&
		['chatgpt', 'claude', 'gemini'].includes(document.documentElement.dataset.theme)
			? document.documentElement.dataset.theme
			: 'chatgpt'
	);
	selectedStyle = $state('step-by-step');
	uploadedImage = $state(null); // { file, previewUrl, name, size, type, width, height, compressed?: boolean }
	question = $state('');

	// Scanning & Streaming lifecycle states
	scanStatus = $state('idle'); // 'idle' | 'uploading' | 'connecting' | 'streaming' | 'completed' | 'cancelling' | 'cancelled' | 'error'
	scanError = $state(null); // { code, message, status }
	isAnalyzing = $derived(
		this.scanStatus === 'uploading' ||
		this.scanStatus === 'connecting' ||
		this.scanStatus === 'streaming' ||
		this.scanStatus === 'cancelling'
	);

	// Multi-turn Visual Conversation State
	conversation = $state({
		id: null,
		providerId: 'chatgpt',
		explanationStyle: 'step-by-step',
		messages: [] // Array<{ id, role: 'user' | 'assistant', content, streaming?: boolean, timestamp, error?: boolean }>
	});

	activeAbortController = null;
	providerConfig = $state({
		chatgpt: { configured: false, model: 'gpt-4o-mini' },
		claude: { configured: false, model: 'claude-3-5-sonnet-20241022' },
		gemini: { configured: false, model: 'gemini-2.5-flash' }
	});

	scanResult = $state(null);
	history = $state([]);
	settings = $state({
		defaultProvider: 'chatgpt',
		defaultStyle: 'step-by-step',
		animationLevel: 'full'
	});
	toast = $state(null);
	isCameraModalOpen = $state(false);
	initialized = $state(false);

	// User Authentication & Session State
	user = $state(null); // { id, email, displayName, preferences }
	authLoading = $state(false);
	authError = $state(null);
	isAuthenticated = $derived(Boolean(this.user));

	constructor() {
		// Browser hydration will be called via init() in layout
	}

	async init() {
		if (this.initialized || typeof window === 'undefined') return;

		try {
			const savedProvider = localStorage.getItem('scanai_provider');
			if (savedProvider && ['chatgpt', 'claude', 'gemini'].includes(savedProvider)) {
				this.selectedProvider = savedProvider;
			}

			const savedStyle = localStorage.getItem('scanai_style');
			if (savedStyle) {
				this.selectedStyle = savedStyle;
			}

			const savedSettings = localStorage.getItem('scanai_settings');
			if (savedSettings) {
				this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
				if (this.settings.defaultProvider && !savedProvider) {
					this.selectedProvider = this.settings.defaultProvider;
				}
			}

			const savedHistory = localStorage.getItem('scanai_history');
			if (savedHistory) {
				this.history = JSON.parse(savedHistory);
			} else {
				this.history = SEED_HISTORY;
				localStorage.setItem('scanai_history', JSON.stringify(SEED_HISTORY));
			}

			// Apply theme to document if needed
			if (document.documentElement.dataset.theme !== this.selectedProvider) {
				document.documentElement.dataset.theme = this.selectedProvider;
			}

			// Check backend API key configuration
			await this.checkProviderConfig();

			// Check user authentication status and load persistent history
			await this.checkAuth();
		} catch (e) {
			console.error('Error hydrating app state from localStorage:', e);
		} finally {
			this.initialized = true;
		}
	}

	async checkProviderConfig() {
		try {
			const res = await fetch('/api/config');
			if (res.ok) {
				const data = await res.json();
				if (data.success && data.providers) {
					this.providerConfig = data.providers;
				}
			}
		} catch (e) {
			// Backend config probe non-fatal
		}
	}

	setProvider(providerId) {
		if (!['chatgpt', 'claude', 'gemini'].includes(providerId)) return;
		this.selectedProvider = providerId;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('scanai_provider', providerId);
				document.documentElement.dataset.theme = providerId;
			} catch (e) {
				console.error('Error saving provider to localStorage:', e);
			}
		}
	}

	setStyle(styleId) {
		this.selectedStyle = styleId;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('scanai_style', styleId);
			} catch (e) {
				console.error('Error saving style to localStorage:', e);
			}
		}
	}

	setImage(imageData) {
		if (this.uploadedImage?.previewUrl && this.uploadedImage.previewUrl.startsWith('blob:')) {
			URL.revokeObjectURL(this.uploadedImage.previewUrl);
		}
		this.uploadedImage = imageData;
		this.scanError = null;
		if (this.scanStatus === 'error' || this.scanStatus === 'cancelled') {
			this.scanStatus = 'idle';
		}
	}

	clearImage() {
		if (this.uploadedImage?.previewUrl && this.uploadedImage.previewUrl.startsWith('blob:')) {
			URL.revokeObjectURL(this.uploadedImage.previewUrl);
		}
		this.uploadedImage = null;
		this.scanError = null;
		this.scanStatus = 'idle';
	}

	setQuestion(text) {
		this.question = text;
	}

	updateSettings(newSettings) {
		this.settings = { ...this.settings, ...newSettings };
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('scanai_settings', JSON.stringify(this.settings));
			} catch (e) {
				console.error('Error saving settings:', e);
			}
		}
	}

	showToast(message, type = 'info') {
		this.toast = {
			id: Date.now(),
			message,
			type
		};
		setTimeout(() => {
			if (this.toast?.message === message) {
				this.toast = null;
			}
		}, 4500);
	}

	cancelAnalysis() {
		if (this.activeAbortController) {
			this.activeAbortController.abort();
			this.activeAbortController = null;
		}
		this.scanStatus = 'cancelled';

		// Stop streaming state on any active assistant message
		const lastMsg = this.conversation.messages[this.conversation.messages.length - 1];
		if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streaming) {
			lastMsg.streaming = false;
			lastMsg.content += ' [Generation cancelled by user]';
		}

		this.showToast('Scan request cancelled.', 'info');
	}

	/**
	 * Initiates real-time streaming visual analysis for a new scan
	 */
	async triggerAnalysis() {
		if (this.isAnalyzing) return;

		if (!this.uploadedImage) {
			this.showToast('Please select or capture an image first.', 'error');
			return;
		}

		this.scanError = null;
		this.scanStatus = 'uploading';
		this.activeAbortController = new AbortController();

		try {
			// Step 1: Client-side safe image compression
			let fileToSend = this.uploadedImage.file;
			if (!fileToSend && this.uploadedImage.previewUrl) {
				const resp = await fetch(this.uploadedImage.previewUrl);
				const blob = await resp.blob();
				fileToSend = new File([blob], this.uploadedImage.name || 'scanned_image.jpg', {
					type: blob.type || 'image/jpeg'
				});
			}

			if (fileToSend) {
				const compressionResult = await compressImageIfBeneficial(fileToSend);
				fileToSend = compressionResult.file;
			}

			// Step 2: Initialize clean conversation
			const convId = `conv_${Date.now()}`;
			const initialPrompt = this.question.trim() || 'General image analysis';

			this.conversation = {
				id: convId,
				providerId: this.selectedProvider,
				explanationStyle: this.selectedStyle,
				messages: [
					{
						id: `user_${Date.now()}`,
						role: 'user',
						content: initialPrompt,
						timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
					},
					{
						id: `asst_${Date.now()}`,
						role: 'assistant',
						content: '',
						streaming: true,
						timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
					}
				]
			};

			const formData = new FormData();
			formData.append('image', fileToSend, this.uploadedImage.name || 'scanned_image.jpg');
			formData.append('provider', this.selectedProvider);
			formData.append('question', initialPrompt);
			formData.append('explanationStyle', this.selectedStyle);
			formData.append('conversationId', convId);

			this.scanStatus = 'connecting';

			const response = await fetch('/api/chat/stream', {
				method: 'POST',
				body: formData,
				signal: this.activeAbortController.signal
			});

			if (!response.ok) {
				let errJson = null;
				try {
					errJson = await response.json();
				} catch (e) {}

				const errorDetails = errJson?.error || {
					code: 'SCAN_FAILED',
					message: `Server returned HTTP ${response.status}`
				};
				this.handleStreamFailure(errorDetails);
				return;
			}

			this.scanStatus = 'streaming';
			await this.processSSEStream(response.body, convId, initialPrompt);
		} catch (err) {
			if (err.name === 'AbortError') {
				this.scanStatus = 'cancelled';
				return;
			}
			console.error('Streaming request failed:', err);
			this.handleStreamFailure({
				code: 'NETWORK_ERROR',
				message: err.message || 'Network error occurred while contacting ScanAI server.'
			});
		} finally {
			this.activeAbortController = null;
		}
	}

	/**
	 * Submits a follow-up inquiry referencing the existing visual conversation
	 * @param {string} followUpText
	 */
	async sendFollowUp(followUpText) {
		if (this.isAnalyzing || !followUpText?.trim()) return;

		this.scanError = null;
		this.scanStatus = 'uploading';
		this.activeAbortController = new AbortController();

		const prompt = followUpText.trim();
		const userMsg = {
			id: `user_${Date.now()}`,
			role: 'user',
			content: prompt,
			timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		};

		const asstMsg = {
			id: `asst_${Date.now()}`,
			role: 'assistant',
			content: '',
			streaming: true,
			timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		};

		// Prepare previous turns (excluding current in-flight messages)
		const previousTurns = this.conversation.messages
			.filter((m) => !m.error && m.content.trim())
			.map((m) => ({ role: m.role, content: m.content }));

		this.conversation.messages = [...this.conversation.messages, userMsg, asstMsg];

		try {
			const formData = new FormData();
			formData.append('provider', this.selectedProvider);
			formData.append('question', prompt);
			formData.append('explanationStyle', this.selectedStyle);
			formData.append('conversationId', this.conversation.id || `conv_${Date.now()}`);
			formData.append('previousTurns', JSON.stringify(previousTurns));

			// Re-attach original image so vision models retain perceptual grounding
			if (this.uploadedImage?.file) {
				formData.append('image', this.uploadedImage.file, this.uploadedImage.name || 'specimen.jpg');
			}

			this.scanStatus = 'connecting';

			const response = await fetch('/api/chat/stream', {
				method: 'POST',
				body: formData,
				signal: this.activeAbortController.signal
			});

			if (!response.ok) {
				let errJson = null;
				try {
					errJson = await response.json();
				} catch (e) {}

				const errorDetails = errJson?.error || {
					code: 'FOLLOWUP_FAILED',
					message: `Server returned error (${response.status})`
				};
				this.handleStreamFailure(errorDetails);
				return;
			}

			this.scanStatus = 'streaming';
			await this.processSSEStream(response.body, this.conversation.id, prompt);
		} catch (err) {
			if (err.name === 'AbortError') {
				this.scanStatus = 'cancelled';
				return;
			}
			console.error('Follow-up stream error:', err);
			this.handleStreamFailure({
				code: 'NETWORK_ERROR',
				message: err.message || 'Network error communicating with model.'
			});
		} finally {
			this.activeAbortController = null;
		}
	}

	async processSSEStream(streamBody, convId, currentQuestion) {
		const assistantMsg = this.conversation.messages[this.conversation.messages.length - 1];

		try {
			for await (const { event, data } of iterateSSEStream(streamBody)) {
				if (this.scanStatus === 'cancelled') break;

				if (event === 'delta' && data?.text) {
					assistantMsg.content += data.text;
				} else if (event === 'complete') {
					assistantMsg.streaming = false;
					if (data?.fullAnswer) {
						assistantMsg.content = data.fullAnswer;
					}

					const parsed = parseAIResponse(assistantMsg.content);
					const provider = AI_PROVIDERS.find((p) => p.id === (data?.provider || this.selectedProvider)) || AI_PROVIDERS[0];

					const result = {
						id: data?.requestId || `scan-${Date.now()}`,
						providerId: provider.id,
						providerName: provider.name,
						modelName: data?.model || provider.modelName,
						styleId: this.selectedStyle,
						question: currentQuestion,
						summary: parsed.summary,
						steps: parsed.steps,
						insights: parsed.insights,
						codeOrFormula: parsed.codeOrFormula,
						fullAnswer: assistantMsg.content,
						confidence: 'Verified (Live AI)',
						timestamp: new Date().toISOString(),
						isMock: false
					};

					this.scanResult = result;
					this.scanStatus = 'completed';

					// Prepend to history
					const newHistoryItem = {
						id: result.id,
						title: this.uploadedImage?.name || 'Visual Scan',
						providerId: provider.id,
						styleId: result.styleId,
						timestamp: result.timestamp,
						formattedDate: 'Just now',
						imageUrl: this.uploadedImage?.previewUrl,
						question: result.question,
						summary: result.summary,
						steps: result.steps,
						confidence: result.confidence,
						isMock: false
					};

					this.history = [newHistoryItem, ...this.history.filter((h) => h.id !== result.id)];
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('scanai_history', JSON.stringify(this.history));
						} catch (e) {}
					}
				} else if (event === 'error') {
					this.handleStreamFailure(data);
					break;
				}
			}
		} catch (err) {
			if (err.name !== 'AbortError') {
				this.handleStreamFailure({ code: 'STREAM_ERROR', message: err.message });
			}
		} finally {
			if (assistantMsg) assistantMsg.streaming = false;
		}
	}

	handleStreamFailure(errorDetails) {
		this.scanError = errorDetails;
		this.scanStatus = 'error';
		const lastMsg = this.conversation.messages[this.conversation.messages.length - 1];
		if (lastMsg && lastMsg.role === 'assistant') {
			lastMsg.streaming = false;
			lastMsg.error = true;
			if (!lastMsg.content.trim()) {
				lastMsg.content = `Error: ${errorDetails.message || 'Request failed'}`;
			}
		}
		this.showToast(errorDetails.message || 'Scan failed', 'error');
	}

	retryLastMessage() {
		const msgs = this.conversation.messages;
		if (msgs.length === 0) return;

		// If last message was assistant error, remove it and re-run last user message
		if (msgs[msgs.length - 1]?.role === 'assistant') {
			const failedAsst = msgs.pop();
			const lastUser = msgs.pop();
			if (lastUser) {
				if (msgs.length === 0) {
					this.question = lastUser.content;
					this.triggerAnalysis();
				} else {
					this.sendFollowUp(lastUser.content);
				}
			}
		}
	}

	deleteHistoryItem(id) {
		this.history = this.history.filter((item) => item.id !== id);
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('scanai_history', JSON.stringify(this.history));
			} catch (e) {}
		}
		this.showToast('Scan removed from history', 'info');
	}

	clearAllHistory() {
		this.history = [];
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem('scanai_history');
			} catch (e) {}
		}
		this.showToast('Scan history cleared', 'info');
	}

	resetScan() {
		if (this.isAnalyzing) {
			this.cancelAnalysis();
		}
		this.clearImage();
		this.question = '';
		this.scanResult = null;
		this.scanError = null;
		this.scanStatus = 'idle';
		this.conversation = {
			id: null,
			providerId: this.selectedProvider,
			explanationStyle: this.selectedStyle,
			messages: []
		};
	}

	async checkAuth() {
		try {
			const res = await fetch('/api/auth/me');
			if (res.ok) {
				const data = await res.json();
				if (data.authenticated && data.user) {
					this.user = data.user;
					if (data.user.preferences?.defaultProvider) {
						this.setProvider(data.user.preferences.defaultProvider);
					}
					if (data.user.preferences?.defaultStyle) {
						this.setStyle(data.user.preferences.defaultStyle);
					}
					await this.loadConversations();
					return;
				}
			}
			this.user = null;
		} catch (e) {
			this.user = null;
		}
	}

	async login(email, password) {
		this.authLoading = true;
		this.authError = null;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.error?.message || 'Login failed');
			}
			this.user = data.user;
			if (data.user.preferences?.defaultProvider) {
				this.setProvider(data.user.preferences.defaultProvider);
			}
			if (data.user.preferences?.defaultStyle) {
				this.setStyle(data.user.preferences.defaultStyle);
			}
			this.showToast(`Welcome back, ${data.user.displayName}!`, 'success');
			await this.loadConversations();
			return { success: true };
		} catch (err) {
			this.authError = err.message;
			this.showToast(err.message, 'error');
			return { success: false, error: err.message };
		} finally {
			this.authLoading = false;
		}
	}

	async register(displayName, email, password) {
		this.authLoading = true;
		this.authError = null;
		try {
			const res = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName, email, password })
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.error?.message || 'Registration failed');
			}
			this.user = data.user;
			this.showToast(`Account created! Welcome, ${data.user.displayName}`, 'success');
			await this.loadConversations();
			return { success: true };
		} catch (err) {
			this.authError = err.message;
			this.showToast(err.message, 'error');
			return { success: false, error: err.message };
		} finally {
			this.authLoading = false;
		}
	}

	async logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch (e) {}
		this.user = null;
		this.history = [];
		this.resetScan();
		this.showToast('You have been signed out', 'info');
	}

	async loadConversations(params = {}) {
		if (!this.user) return;
		try {
			const query = new URLSearchParams();
			if (params.q) query.set('q', params.q);
			if (params.provider && params.provider !== 'all') query.set('provider', params.provider);
			if (params.bookmarked) query.set('bookmarked', 'true');
			if (params.page) query.set('page', String(params.page));

			const res = await fetch(`/api/conversations?${query.toString()}`);
			if (res.ok) {
				const data = await res.json();
				if (data.success && data.conversations) {
					this.history = data.conversations;
				}
			}
		} catch (e) {
			console.warn('[History Fetch Warning]:', e.message);
		}
	}

	async toggleBookmark(conversationId) {
		const item = this.history.find((h) => h.id === conversationId);
		if (!item) return;
		const nextState = !item.isBookmarked;
		item.isBookmarked = nextState;

		if (this.user) {
			try {
				await fetch(`/api/conversations/${conversationId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ isBookmarked: nextState })
				});
			} catch (e) {
				item.isBookmarked = !nextState;
			}
		}
	}

	async renameConversation(conversationId, newTitle) {
		const item = this.history.find((h) => h.id === conversationId);
		if (!item || !newTitle?.trim()) return;
		const oldTitle = item.title;
		item.title = newTitle.trim();

		if (this.user) {
			try {
				const res = await fetch(`/api/conversations/${conversationId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: newTitle.trim() })
				});
				if (!res.ok) item.title = oldTitle;
			} catch (e) {
				item.title = oldTitle;
			}
		}
	}

	async deleteConversation(conversationId) {
		this.history = this.history.filter((h) => h.id !== conversationId);
		if (this.user) {
			try {
				await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
			} catch (e) {
				console.warn('[Delete Conversation Warning]:', e.message);
			}
		}
		this.showToast('Conversation deleted', 'info');
	}

	async loadPersistentConversation(conversationId) {
		try {
			const res = await fetch(`/api/conversations/${conversationId}`);
			if (!res.ok) throw new Error('Failed to load conversation');
			const data = await res.json();
			const conv = data.conversation;

			this.setProvider(conv.provider);
			this.setStyle(conv.explanationStyle);
			this.conversation = {
				id: conv.id,
				providerId: conv.provider,
				explanationStyle: conv.explanationStyle,
				messages: (conv.messages || []).map((m) => ({
					id: m.id,
					role: m.role,
					content: m.content,
					streaming: false,
					interrupted: m.interrupted,
					timestamp: m.createdAt
				}))
			};

			if (conv.hasImage && conv.imageUrl) {
				this.setImage({
					file: null,
					previewUrl: conv.imageUrl,
					name: conv.imageMetadata?.filename || conv.title,
					size: conv.imageMetadata?.size || 0,
					type: conv.imageMetadata?.mimeType || 'image/jpeg'
				});
			} else {
				this.clearImage();
			}

			// Restore last assistant message as scanResult
			const lastAssistant = conv.messages?.slice().reverse().find((m) => m.role === 'assistant');
			if (lastAssistant) {
				const parsed = parseAIResponse(lastAssistant.content);
				const prov = AI_PROVIDERS.find((p) => p.id === conv.provider) || AI_PROVIDERS[0];
				this.scanResult = {
					id: conv.id,
					providerId: prov.id,
					providerName: prov.name,
					modelName: conv.model || prov.modelName,
					styleId: conv.explanationStyle,
					question: conv.title,
					summary: parsed.summary,
					steps: parsed.steps,
					insights: parsed.insights,
					codeOrFormula: parsed.codeOrFormula,
					fullAnswer: lastAssistant.content,
					confidence: 'Restored Scan',
					timestamp: conv.updatedAt,
					isMock: false
				};
			}

			this.scanStatus = 'completed';
			return { success: true };
		} catch (err) {
			this.showToast(err.message, 'error');
			return { success: false, error: err.message };
		}
	}
}

export const appState = new AppStateManager();
