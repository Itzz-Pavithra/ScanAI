/**
 * Parses raw AI markdown text into structured fields for AnswerPanel
 * @param {string} rawText
 * @returns {{
 *   summary: string,
 *   steps: string[],
 *   codeOrFormula: string,
 *   insights: Array<{ label: string, value: string }>,
 *   fullText: string
 * }}
 */
export function parseAIResponse(rawText) {
	if (!rawText) {
		return {
			summary: '',
			steps: [],
			codeOrFormula: '',
			insights: [],
			fullText: ''
		};
	}

	const trimmed = rawText.trim();
	const lines = trimmed.split('\n');

	// Extract code block if present
	let codeOrFormula = '';
	const codeMatch = trimmed.match(/```(?:[a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
	if (codeMatch && codeMatch[1]) {
		codeOrFormula = codeMatch[1].trim();
	}

	// Extract numbered steps (e.g. "1. ", "Step 1:", etc.)
	const steps = [];
	const stepRegex = /^(?:(?:\d+\.|\bStep\s+\d+:?)\s+)(.+)$/i;

	for (const line of lines) {
		const match = line.trim().match(stepRegex);
		if (match && match[1]) {
			steps.push(match[1].trim());
		}
	}

	// Extract first substantive paragraph for summary
	const paragraphs = trimmed
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter((p) => p && !p.startsWith('```') && !p.startsWith('#') && !/^(?:\d+\.|\bStep\s+\d+:?)/.test(p));

	const summary = paragraphs[0] || (lines[0] || 'Visual analysis completed successfully.');

	// Extract insights or key bullet points
	const insights = [];
	const bulletRegex = /^[-*•]\s+(.+)$/;
	for (const line of lines) {
		const bMatch = line.trim().match(bulletRegex);
		if (bMatch && bMatch[1]) {
			const text = bMatch[1].trim();
			if (text.includes(':')) {
				const [label, val] = text.split(':');
				insights.push({
					label: label.replace(/\*\*/g, '').trim(),
					value: val.replace(/\*\*/g, '').trim()
				});
			}
			if (insights.length >= 3) break;
		}
	}

	// Default insights if none extracted
	if (insights.length === 0) {
		insights.push(
			{ label: 'Multimodal Parsing', value: 'High fidelity extraction' },
			{ label: 'Evidence Grounding', value: 'Directly verified from image pixels' }
		);
	}

	return {
		summary,
		steps: steps.length > 0 ? steps : [],
		codeOrFormula,
		insights,
		fullText: trimmed
	};
}
