<script>
	let {
		ariaLabel,
		title = '',
		variant = 'ghost',
		size = 'md',
		disabled = false,
		onclick,
		children,
		class: customClass = ''
	} = $props();

	const sizeClasses = {
		sm: 'h-8 w-8 text-sm p-1.5',
		md: 'h-10 w-10 text-base p-2',
		lg: 'h-12 w-12 text-lg p-2.5'
	};

	const variantClasses = {
		ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)]',
		outline: 'border border-[var(--border-subtle)] hover:border-[var(--card-hover-border)] text-[var(--text-primary)] hover:bg-[var(--badge-bg)]',
		primary: 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] hover:opacity-90 shadow-sm',
		danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/30'
	};
</script>

<button
	type="button"
	aria-label={ariaLabel || title}
	{title}
	{disabled}
	{onclick}
	class="inline-flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] active:scale-95 {sizeClasses[size] || sizeClasses.md} {variantClasses[variant] || variantClasses.ghost} {customClass}"
>
	{#if children}
		{@render children()}
	{/if}
</button>
