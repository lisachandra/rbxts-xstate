export function callable(fn: Callback): any {
	return setmetatable(
		{} as any,
		{
			__call(...args: unknown[]) {
				return fn(...args);
			},
		} as any,
	);
}
