import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAIResponse } from '../src/lib/utils/response-parser.js';

describe('Response Parser Utility', () => {
	it('extracts summary, steps, code blocks, and insights from markdown response', () => {
		const sampleMarkdown = `
This image depicts a standard NE555 timer integrated circuit configured in astable multivibrator mode.

Step 1: Identified pin 1 (GND) tied directly to ground rail.
Step 2: Resistor divider network between pin 8 (VCC) and pin 7 (Discharge) verified.
Step 3: Timing capacitor connected between pin 2 (Trigger) and pin 1.

Key Observations:
- Circuit Frequency: Approximately 1.44 kHz based on R1/R2/C1 values
- Component Integrity: No solder bridges or cold joints detected

\`\`\`c
// Estimated timing frequency equation
float freq = 1.44 / ((R1 + 2 * R2) * C1);
\`\`\`
		`;

		const parsed = parseAIResponse(sampleMarkdown);

		assert.ok(parsed.summary.includes('NE555 timer integrated circuit'));
		assert.equal(parsed.steps.length, 3);
		assert.ok(parsed.steps[0].includes('Identified pin 1'));
		assert.ok(parsed.codeOrFormula.includes('float freq = 1.44'));
		assert.ok(parsed.insights.length > 0);
		assert.equal(parsed.fullText, sampleMarkdown.trim());
	});

	it('handles empty response gracefully', () => {
		const parsed = parseAIResponse('');
		assert.equal(parsed.summary, '');
		assert.deepEqual(parsed.steps, []);
		assert.equal(parsed.codeOrFormula, '');
	});
});
