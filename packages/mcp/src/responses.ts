export type TextContent = {
	type: 'text';
	text: string;
};

export type ToolResponse = {
	content: TextContent[];
};

export function text_response(text: string): ToolResponse {
	return {
		content: [{ type: 'text', text }],
	};
}

export function json_response(value: unknown): ToolResponse {
	return text_response(JSON.stringify(value, null, 2));
}
