<script lang="ts">
	import { useSidebar } from '#lib/components/ui/sidebar/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { sidebar_width } from '#lib/sidebar-width.svelte.js';
	import { mergeProps } from 'bits-ui';

	// Stands in for Sidebar.Rail: drag to resize, click to toggle.
	const sidebar = useSidebar();

	// Pointer travel before a press counts as a drag, not a click.
	const drag_threshold = 3;

	let handle = $state<HTMLButtonElement | null>(null);
	let drag: {
		x: number;
		width: number;
		direction: number;
		moved: boolean;
	} | null = null;
	let dragged = false;

	function onpointerdown(event: PointerEvent) {
		if (event.button !== 0 || sidebar.state === 'collapsed') return;
		const container = handle?.closest<HTMLElement>(
			'[data-slot=sidebar-container]',
		);
		if (!handle || !container) return;
		handle.setPointerCapture(event.pointerId);
		drag = {
			x: event.clientX,
			width: container.getBoundingClientRect().width,
			direction: container.dataset.side === 'right' ? -1 : 1,
			moved: false,
		};
	}

	function onpointermove(event: PointerEvent) {
		if (!drag) return;
		const delta = event.clientX - drag.x;
		if (!drag.moved && Math.abs(delta) < drag_threshold) return;
		drag.moved = true;
		sidebar_width.resizing = true;
		sidebar_width.set(drag.width + delta * drag.direction);
	}

	function onpointerup() {
		if (!drag) return;
		dragged = drag.moved;
		drag = null;
		if (dragged) {
			sidebar_width.resizing = false;
			sidebar_width.save();
		}
	}

	function onclick() {
		// A drag ends with a click; only a plain press toggles.
		if (dragged) {
			dragged = false;
			return;
		}
		sidebar.toggle();
	}
</script>

<Tooltip.Root delayDuration={500}>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<button
				bind:this={handle}
				{...mergeProps(props, {
					onpointerdown,
					onpointermove,
					onpointerup,
					onpointercancel: onpointerup,
					onclick,
				})}
				data-sidebar="rail"
				aria-label="Resize or toggle sidebar"
				tabindex={-1}
				class="absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 cursor-col-resize touch-none transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:inset-s-1/2 after:w-0.5 hover:after:bg-sidebar-border sm:flex group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar [[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-collapsible=offcanvas]_&]:-left-2 [[data-side=right][data-state=collapsed]_&]:cursor-w-resize"
			></button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content side="right" hidden={sidebar_width.resizing}>
		{sidebar.state === 'collapsed'
			? 'Show sidebar'
			: 'Drag to resize'}
	</Tooltip.Content>
</Tooltip.Root>
