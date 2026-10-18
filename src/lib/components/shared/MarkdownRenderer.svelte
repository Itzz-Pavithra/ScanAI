<script>
	import { Check, Copy } from '@lucide/svelte';

	let { content = '' } = $props();

	let copiedIndex = $state(null);

	async function copyCode(codeText, index) {
		try {
			await navigator.clipboard.writeText(codeText);
			copiedIndex = index;
			setTimeout(() => {
				copiedIndex = null;
			}, 2000);
		} catch (e) {
			// Clipboard write fallback
		}
	}

	/**
	 * Parses markdown text into safe tokens for native Svelte rendering
	 * @param {string} text
	 */
	function parseBlocks(text) {
		if (!text) return [];

		const blocks = [];
		const lines = text.split('\n');
		let inCodeBlock = false;
		let codeLanguage = '';
		let codeBuffer = [];
		let listBuffer = [];

		function flushList() {
			if (listBuffer.length > 0) {
				blocks.push({
					type: 'list',
					items: [...listBuffer]
				});
				listBuffer = [];
			}
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Handle code fence
			if (line.trim().startsWith('```')) {
				if (inCodeBlock) {
					// End code block
					blocks.push({
						type: 'code',
						language: codeLanguage,
						code: codeBuffer.join('\n')
					});
					codeBuffer = [];
					inCodeBlock = false;
					codeLanguage = '';
				} else {
					// Start code block
					flushList();
					inCodeBlock = true;
					codeLanguage = line.trim().slice(3).trim();
				}
				continue;
			}

			if (inCodeBlock) {
				codeBuffer.push(line);
				continue;
			}

			// Handle Headings
			if (line.startsWith('#')) {
				flushList();
				const match = line.match(/^(#{1,6})\s+(.+)$/);
				if (match) {
					blocks.push({
						type: 'heading',
						level: match[1].length,
						text: match[2].trim()
					});
					continue;
				}
			}

			// Handle Lists (- or * or numbered 1.)
			const listMatch = line.trim().match(/^(?:[-*•]|\d+\.)\s+(.+)$/);
			if (listMatch) {
				listBuffer.push(listMatch[1].trim());
				continue;
			}

			// Normal line / paragraph
			if (line.trim().length > 0) {
				flushList();
				blocks.push({
					type: 'paragraph',
					text: line.trim()
				});
			} else {
				flushList();
			}
		}

		// Flush trailing code or list if in progress during streaming
		if (inCodeBlock && codeBuffer.length > 0) {
			blocks.push({
				type: 'code',
				language: codeLanguage,
				code: codeBuffer.join('\n')
			});
		}
		flushList();

		return blocks;
	}

	let blocks = $derived(parseBlocks(content));
</script>

<div class="space-y-4 text-[var(--text-primary)] leading-relaxed text-sm">
	{#each blocks as block, idx}
		{#if block.type === 'heading'}
			{#if block.level === 1}
				<h2 class="text-xl font-bold font-heading text-[var(--text-primary)] mt-5 mb-2 pb-1 border-b border-[var(--border-subtle)]">
					{block.text}
				</h2>
			{:else if block.level === 2}
				<h3 class="text-lg font-bold font-heading text-[var(--text-primary)] mt-4 mb-2">
					{block.text}
				</h3>
			{:else}
				<h4 class="text-base font-semibold font-heading text-[var(--text-primary)] mt-3 mb-1.5">
					{block.text}
				</h4>
			{/if}
		{:else if block.type === 'paragraph'}
			<p class="text-sm leading-relaxed text-[var(--text-secondary)]">
				{block.text}
			</p>
		{:else if block.type === 'list'}
			<ul class="space-y-2 my-3 pl-4 border-l-2 border-[var(--border-subtle)]">
				{#each block.items as item, itemIdx}
					<li class="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
						<span class="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] mt-2 flex-shrink-0"></span>
						<span>{item}</span>
					</li>
				{/each}
			</ul>
		{:else if block.type === 'code'}
			<div class="relative my-4 rounded-2xl bg-black/70 border border-[var(--border-strong)] overflow-hidden shadow-lg">
				<div class="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-mono text-[var(--text-muted)]">
					<span>{block.language || 'code'}</span>
					<button
						type="button"
						onclick={() => copyCode(block.code, idx)}
						class="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs"
					>
						{#if copiedIndex === idx}
							<Check class="w-3.5 h-3.5 text-emerald-400" />
							<span class="text-emerald-400">Copied</span>
						{:else}
							<Copy class="w-3.5 h-3.5" />
							<span>Copy</span>
						{/if}
					</button>
				</div>
				<pre class="p-4 font-mono text-xs overflow-x-auto text-zinc-200 leading-relaxed whitespace-pre">{block.code}</pre>
			</div>
		{/if}
	{/each}
</div>
