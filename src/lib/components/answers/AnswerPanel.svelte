<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { AI_PROVIDERS } from '$lib/config/providers.js';
	import AnswerSection from './AnswerSection.svelte';
	import FollowUpInput from './FollowUpInput.svelte';
	import MarkdownRenderer from '../shared/MarkdownRenderer.svelte';
	import {
		Check,
		Copy,
		RotateCcw,
		PlusCircle,
		Sparkles,
		ThumbsUp,
		ThumbsDown,
		CheckCircle2,
		XCircle,
		User,
		Bot,
		MessageSquare,
		Send
	} from '@lucide/svelte';

	let copied = $state(false);
	let feedbackGiven = $state(null); // 'up' | 'down' | null

	let res = $derived(appState.scanResult);
	let provider = $derived(
		AI_PROVIDERS.find((p) => p.id === (res?.providerId || appState.selectedProvider)) ||
			AI_PROVIDERS[0]
	);

	let messages = $derived(appState.conversation.messages);

	async function copyFullConversation() {
		let text = `ScanAI Conversation (${provider.name} - ${res?.modelName || provider.modelName})\n\n`;
		for (const m of messages) {
			text += `${m.role.toUpperCase()} [${m.timestamp}]:\n${m.content}\n\n`;
		}

		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			appState.showToast('Copied full conversation to clipboard!', 'success');
			setTimeout(() => {
				copied = false;
			}, 2500);
		} catch (e) {
			appState.showToast('Failed to copy to clipboard', 'error');
		}
	}

	function handleFeedback(type) {
		feedbackGiven = type;
		appState.showToast(
			type === 'up' ? 'Thanks for your feedback!' : 'Feedback noted for model improvements.',
			'info'
		);
	}
</script>

{#if messages.length > 0 || res}
	<div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
		<!-- Status Banner: Live Real AI vs Historical Mock -->
		{#if res && res.isMock === false}
			<div class="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
				<div class="w-6 h-6 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
					<CheckCircle2 class="w-3.5 h-3.5" />
				</div>
				<div class="flex-1">
					<span class="font-bold text-white">Live AI Vision Result:</span>
					Verified multimodal visual reasoning streamed directly from {provider.name} ({res.modelName}).
				</div>
				<span class="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/30">
					Live API
				</span>
			</div>
		{:else if res && res.isMock === true}
			<div class="flex items-center gap-3 p-4 rounded-2xl bg-[var(--badge-bg)] border border-[var(--badge-border)] text-xs text-[var(--text-secondary)]">
				<div class="w-6 h-6 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
					<Sparkles class="w-3.5 h-3.5" />
				</div>
				<div class="flex-1">
					<span class="font-semibold text-[var(--text-primary)]">Demonstration Log:</span>
					Historical demonstration scan. Execute a scan with your configured API keys for live model output.
				</div>
				<span class="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-subtle)]">
					Demo Mode
				</span>
			</div>
		{/if}

		<!-- Main Container Card -->
		<div class="rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] p-6 sm:p-8 shadow-2xl space-y-8">
			<!-- Header Row: Specimen Thumbnail + Provider Info + Actions -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
				<div class="flex items-center gap-4">
					{#if appState.uploadedImage}
						<div class="relative w-14 h-14 rounded-2xl overflow-hidden border border-[var(--border-subtle)] flex-shrink-0 shadow-md">
							<img
								src={appState.uploadedImage.previewUrl}
								alt="Specimen thumbnail"
								class="w-full h-full object-cover"
							/>
						</div>
					{/if}
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-xl font-bold font-heading text-[var(--text-primary)]">
								{provider.name} Visual Chat
							</h3>
							<span class="text-xs px-2.5 py-0.5 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)] font-medium">
								{res?.modelName || provider.modelName}
							</span>
						</div>
						<p class="text-xs text-[var(--text-muted)] mt-1">
							Style: <span class="capitalize font-medium text-[var(--text-secondary)]">{appState.selectedStyle}</span>
							{#if messages.length > 0}
								• {messages.length} messages in conversation
							{/if}
						</p>
					</div>
				</div>

				<!-- Quick Action Buttons -->
				<div class="flex items-center gap-2 self-start sm:self-auto">
					<button
						type="button"
						onclick={copyFullConversation}
						class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-surface)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] transition-all cursor-pointer"
					>
						{#if copied}
							<Check class="w-3.5 h-3.5 text-emerald-400" />
							<span class="text-emerald-400">Copied</span>
						{:else}
							<Copy class="w-3.5 h-3.5" />
							<span>Copy Chat</span>
						{/if}
					</button>

					{#if appState.isAnalyzing}
						<button
							type="button"
							onclick={() => appState.cancelAnalysis()}
							class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-all cursor-pointer"
						>
							<XCircle class="w-3.5 h-3.5" />
							<span>Cancel</span>
						</button>
					{/if}

					<button
						type="button"
						onclick={() => appState.resetScan()}
						class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-primary-text)] hover:opacity-90 transition-all cursor-pointer shadow-sm"
					>
						<PlusCircle class="w-3.5 h-3.5" />
						<span>New Scan</span>
					</button>
				</div>
			</div>

			<!-- Multi-Turn Conversation Thread -->
			<div class="space-y-6">
				{#each messages as msg}
					{#if msg.role === 'user'}
						<!-- User Turn Bubble -->
						<div class="flex items-start gap-3 pl-6 sm:pl-16">
							<div class="flex-1 p-4.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
								<div class="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
									<span class="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
										<User class="w-3.5 h-3.5 text-[var(--accent-primary)]" />
										You
									</span>
									<span class="font-mono text-[10px]">{msg.timestamp}</span>
								</div>
								<p class="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
									{msg.content}
								</p>
							</div>
						</div>
					{:else}
						<!-- Assistant Turn Bubble -->
						<div class="flex items-start gap-3 pr-6 sm:pr-12">
							<div class="flex-1 p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)]/80 border border-[var(--border-strong)] space-y-3">
								<div class="flex items-center justify-between text-xs pb-2 border-b border-[var(--border-subtle)]">
									<div class="flex items-center gap-2">
										<div class="w-6 h-6 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)] flex items-center justify-center">
											<Bot class="w-3.5 h-3.5" />
										</div>
										<span class="font-bold text-[var(--text-primary)]">{provider.name}</span>
										<span class="text-[10px] font-mono text-[var(--text-muted)]">({res?.modelName || provider.modelName})</span>
									</div>

									{#if msg.streaming}
										<div class="flex items-center gap-1.5 text-xs text-[var(--accent-primary)] font-medium">
											<div class="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-ping"></div>
											<span>Streaming...</span>
										</div>
									{:else}
										<span class="font-mono text-[10px] text-[var(--text-muted)]">{msg.timestamp}</span>
									{/if}
								</div>

								<!-- Answer Body -->
								<div class="relative">
									{#if msg.content}
										<MarkdownRenderer content={msg.content} />
										{#if msg.streaming}
											<span class="inline-block w-2 h-4 bg-[var(--accent-primary)] ml-1 animate-pulse align-middle"></span>
										{/if}
									{:else if msg.streaming}
										<div class="flex items-center gap-2 py-4 text-xs text-[var(--text-muted)]">
											<div class="w-4 h-4 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin"></div>
											<span>Thinking & analyzing visual features...</span>
										</div>
									{/if}
								</div>

								<!-- Error Message Retry Button -->
								{#if msg.error}
									<div class="pt-2 flex items-center gap-3">
										<button
											type="button"
											onclick={() => appState.retryLastMessage()}
											class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30 transition-colors cursor-pointer"
										>
											<RotateCcw class="w-3 h-3" />
											<span>Retry Message</span>
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>

			<!-- Fallback for historical single-turn scan result (if not in messages array) -->
			{#if messages.length === 0 && res}
				<div class="space-y-6">
					{#if res.summary}
						<AnswerSection title="Executive Summary">
							<p class="text-base text-[var(--text-primary)] leading-relaxed">{res.summary}</p>
						</AnswerSection>
					{/if}

					{#if res.steps && res.steps.length > 0}
						<AnswerSection title="Step-by-Step Breakdown">
							<div class="space-y-3">
								{#each res.steps as step, index}
									<div class="flex items-start gap-3.5 p-3 rounded-2xl bg-[var(--bg-surface-elevated)]/60 border border-[var(--border-subtle)]">
										<div class="flex items-center justify-center w-6 h-6 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-text)] text-xs font-bold flex-shrink-0 mt-0.5">
											{index + 1}
										</div>
										<p class="text-sm text-[var(--text-primary)] leading-relaxed">{step}</p>
									</div>
								{/each}
							</div>
						</AnswerSection>
					{/if}
				</div>
			{/if}

			<!-- Follow-Up Question Input -->
			<div class="pt-4 border-t border-[var(--border-subtle)] space-y-3">
				<div class="flex items-center justify-between text-xs text-[var(--text-muted)]">
					<span class="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
						<MessageSquare class="w-3.5 h-3.5 text-[var(--accent-primary)]" />
						Ask a follow-up question about this image
					</span>
					<span>Retains full image & chat context</span>
				</div>

				<FollowUpInput onsubmit={(query) => appState.sendFollowUp(query)} />
			</div>

			<!-- Footer feedback controls -->
			<div class="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
				<div class="flex items-center gap-2">
					<span>Was this visual explanation accurate?</span>
					<button
						type="button"
						onclick={() => handleFeedback('up')}
						class="p-1.5 rounded-lg border transition-colors cursor-pointer {feedbackGiven === 'up'
							? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
							: 'border-[var(--border-subtle)] hover:text-[var(--text-primary)]'}"
					>
						<ThumbsUp class="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onclick={() => handleFeedback('down')}
						class="p-1.5 rounded-lg border transition-colors cursor-pointer {feedbackGiven === 'down'
							? 'bg-red-500/20 text-red-400 border-red-500/30'
							: 'border-[var(--border-subtle)] hover:text-[var(--text-primary)]'}"
					>
						<ThumbsDown class="w-3.5 h-3.5" />
					</button>
				</div>

				<div class="font-mono text-[11px]">
					Conversation ID: {appState.conversation.id || res?.id || 'active'}
				</div>
			</div>
		</div>
	</div>
{/if}
