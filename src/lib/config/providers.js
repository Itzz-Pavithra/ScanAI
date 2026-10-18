export const AI_PROVIDERS = [
	{
		id: 'chatgpt',
		name: 'ChatGPT',
		modelName: 'GPT-4o Vision',
		company: 'OpenAI',
		tagline: 'Monochrome precision & analytical clarity',
		description: 'Fast, structured visual analysis with crisp black-and-white elegance',
		accentColor: '#FFFFFF',
		secondaryColor: '#A1A1AA',
		theme: 'chatgpt',
		badge: 'Balanced',
		gradient: 'from-zinc-100 to-zinc-400',
		glowColor: 'rgba(255, 255, 255, 0.25)',
		ringColor: 'rgba(255, 255, 255, 0.5)',
		highlights: ['Sharp entity recognition', 'Structured markdown responses', 'Instant summarization']
	},
	{
		id: 'claude',
		name: 'Claude',
		modelName: 'Claude 3.7 Sonnet',
		company: 'Anthropic',
		tagline: 'Warm editorial nuance & step-by-step depth',
		description: 'Nuanced explanations with thoughtful reasoning and warm amber aesthetics',
		accentColor: '#D97736',
		secondaryColor: '#F19A63',
		theme: 'claude',
		badge: 'Nuanced',
		gradient: 'from-[#D97736] to-[#F19A63]',
		glowColor: 'rgba(217, 119, 54, 0.35)',
		ringColor: 'rgba(241, 154, 99, 0.55)',
		highlights: ['Deep visual reasoning', 'Detailed breakdown logic', 'Refined conversational tone']
	},
	{
		id: 'gemini',
		name: 'Gemini',
		modelName: 'Gemini 2.5 Flash',
		company: 'Google',
		tagline: 'Multicolor intelligence & rapid multimodal perception',
		description: 'Vibrant Google-inspired multicolor visual intelligence with lightning speed',
		accentColor: '#4285F4',
		secondaryColor: '#EA4335',
		palette: {
			blue: '#4285F4',
			red: '#EA4335',
			yellow: '#FBBC05',
			green: '#34A853',
			orange: '#FF8F00'
		},
		theme: 'gemini',
		badge: 'Ultra Fast',
		gradient: 'from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]',
		glowColor: 'rgba(66, 133, 244, 0.35)',
		ringColor: 'rgba(66, 133, 244, 0.6)',
		highlights: ['Multimodal diagram deciphering', 'Google search grounding', 'Vibrant visual synthesis']
	}
];

export const EXPLANATION_STYLES = [
	{
		id: 'simple',
		label: 'Simple',
		desc: 'High-level, plain English, quick overview',
		icon: 'Sparkles'
	},
	{
		id: 'step-by-step',
		label: 'Step-by-step',
		desc: 'Numbered progression & logical breakdown',
		icon: 'ListOrdered'
	},
	{
		id: 'detailed',
		label: 'Detailed',
		desc: 'Comprehensive deep dive with formulas & context',
		icon: 'BookOpen'
	},
	{
		id: 'tamil',
		label: 'Tamil / Tanglish',
		desc: 'Native conversational Tamil with English terms',
		icon: 'Languages'
	}
];

export const EXAMPLE_PROMPTS = [
	'Identify everything in this image and explain its purpose.',
	'Break down this formula or diagram step-by-step.',
	'Extract all readable text, translate, and summarize.',
	'Analyze the food or ingredients and estimate nutritional facts.',
	'What is the historical or scientific context of this object?'
];
