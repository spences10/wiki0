import { cubicInOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';

type ViewAngle = { rotate: number; tilt: number };

/**
 * How an isometric chart is turned: the buttons and the drag work
 * from the same angles. A chart with a flat form of its own draws
 * that instead while `flat` is set.
 */
export const create_isometric_view = (
	raised: () => ViewAngle,
	// Open on the chart's flat form, for charts that have one
	start_flat = false,
) => {
	let flat = $state(start_flat);
	// Null until the viewer turns the chart, so the default angle can
	// follow the data
	let turned = $state<ViewAngle | null>(null);
	let dragging = false;
	// Where a drag has turned the view to. Only written back when the
	// drag ends, so the buttons turn from there: writing it every
	// frame rebuilds the view under the pointer and the drag stutters
	let dragged_to: { x: number; y: number } | null = null;

	const angle = $derived(turned ?? raised());

	return {
		get flat() {
			return flat;
		},
		get options() {
			return {
				rotate: angle.rotate,
				tilt: angle.tilt,
				motion: {
					type: 'tween' as const,
					duration: prefersReducedMotion.current ? 0 : 700,
					easing: cubicInOut,
				},
			};
		},
		turn(degrees: number) {
			const from = turned ?? raised();
			flat = false;
			turned = { rotate: from.rotate + degrees, tilt: from.tilt };
		},
		reset() {
			flat = false;
			turned = null;
		},
		toggle_flat() {
			flat = !flat;
		},
		drag_start() {
			dragging = true;
		},
		drag_end() {
			dragging = false;
			if (!dragged_to) return;
			turned = { rotate: dragged_to.x, tilt: dragged_to.y };
			dragged_to = null;
		},
		on_transform({
			rotation,
		}: {
			rotation?: { x: number; y: number } | null;
		}) {
			if (dragging && rotation) dragged_to = rotation;
		},
	};
};

export type IsometricViewState = ReturnType<
	typeof create_isometric_view
>;

/**
 * A tower's fill, from its colour at the top to a paler tone at the
 * floor. It fades to a paler tone rather than to nothing, as a box
 * you can see through shows the towers standing behind it.
 */
export const tower_gradient = (colour: string) => [
	colour,
	`color-mix(in oklab, ${colour} 55%, var(--card))`,
];
