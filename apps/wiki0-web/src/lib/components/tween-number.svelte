<script lang="ts">
	import { cubicInOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';

	// A number that glides to its new value
	let { value, digits = 3 }: { value: number; digits?: number } =
		$props();

	const tween = Tween.of(() => value, {
		duration: 700,
		easing: cubicInOut,
	});
</script>

{tween.current.toFixed(digits)}
