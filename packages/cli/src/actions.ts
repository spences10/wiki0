export function print_json(value: unknown): void {
	console.log(JSON.stringify(value, null, 2));
}
