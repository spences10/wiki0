export type TextContent = {
	type: 'text';
	text: string;
};

export type StructuredContent = Record<string, unknown>;

export type ToolResponse = {
	content: TextContent[];
	structuredContent?: StructuredContent;
	isError?: boolean;
};

export function text_response(text: string): ToolResponse {
	return {
		content: [{ type: 'text', text }],
	};
}

export function json_response(value: unknown): ToolResponse {
	return {
		content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
		structuredContent: structured_content(value),
	};
}

export function error_response(error: unknown): ToolResponse {
	const message =
		error instanceof Error ? error.message : String(error);
	return {
		content: [{ type: 'text', text: message }],
		structuredContent: { error: message },
		isError: true,
	};
}

export function with_tool_errors<TInput>(
	handler: (input: TInput) => ToolResponse | Promise<ToolResponse>,
): (input: TInput) => Promise<ToolResponse> {
	return async (input: TInput) => {
		try {
			return await handler(input);
		} catch (error) {
			return error_response(error);
		}
	};
}

function structured_content(value: unknown): StructuredContent {
	if (is_record(value)) return value;
	return { value };
}

function is_record(value: unknown): value is StructuredContent {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}
