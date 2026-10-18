<script>
	import { appState } from '$lib/stores/app-state.svelte.js';
	import { THEMES } from '$lib/config/themes.js';

	let currentTheme = $derived(THEMES[appState.selectedProvider] || THEMES.chatgpt);
	let animationLevel = $derived(appState.settings.animationLevel);
</script>

<div
	class="pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-colors duration-700 ease-in-out"
	aria-hidden="true"
>
	<!-- Ambient Radial Gradient Orbs -->
	{#if animationLevel !== 'off'}
		<div
			class="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full blur-[130px] transition-all duration-700 {animationLevel === 'full' ? 'animate-orb-1' : ''}"
			style="background: {currentTheme.orbColors[0] || 'rgba(255,255,255,0.08)'};"
		></div>

		<div
			class="absolute top-1/3 -right-36 h-[600px] w-[600px] rounded-full blur-[140px] transition-all duration-700 {animationLevel === 'full' ? 'animate-orb-2' : ''}"
			style="background: {currentTheme.orbColors[1] || 'rgba(255,255,255,0.05)'};"
		></div>

		<div
			class="absolute -bottom-40 left-1/4 h-[550px] w-[550px] rounded-full blur-[150px] transition-all duration-700 {animationLevel === 'full' ? 'animate-orb-1' : ''}"
			style="background: {currentTheme.orbColors[2] || currentTheme.orbColors[0] || 'rgba(255,255,255,0.06)'};"
		></div>
	{/if}

	<!-- Geometric subtle grid overlay -->
	<div
		class="absolute inset-0 opacity-[0.035] transition-opacity duration-500"
		style="background-image: radial-gradient(var(--text-primary) 1px, transparent 1px); background-size: 32px 32px;"
	></div>

	<!-- Delicate Vignette border fade -->
	<div
		class="absolute inset-0 bg-radial-[circle_at_center,_transparent_50%,_var(--bg-app)_100%] opacity-80"
	></div>
</div>
