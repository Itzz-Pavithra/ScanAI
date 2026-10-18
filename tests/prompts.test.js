import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVisionPrompt } from '../src/lib/server/ai/prompts.js';

describe('Vision Prompt Builder', () => {
	it('builds default prompt when question is omitted', () => {
		const { systemInstruction, prompt } = buildVisionPrompt('', 'simple');
		assert.ok(prompt.includes('Please analyze this image thoroughly'));
		assert.ok(systemInstruction.includes('simple, clear, and high-level explanation'));
	});

	it('incorporates custom user question', () => {
		const { prompt } = buildVisionPrompt('What is the formula on the board?', 'step-by-step');
		assert.equal(prompt, 'What is the formula on the board?');
	});

	it('injects Tamil / Tanglish directives when selected', () => {
		const { systemInstruction } = buildVisionPrompt('Describe this', 'tamil');
		assert.ok(systemInstruction.includes('Tamil mixed with common English technical terms'));
	});

	it('injects detailed directives when selected', () => {
		const { systemInstruction } = buildVisionPrompt('Explain structure', 'detailed');
		assert.ok(systemInstruction.includes('comprehensive, in-depth explanation'));
	});
});
