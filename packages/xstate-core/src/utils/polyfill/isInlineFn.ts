export function isInlineFn(t: any): t is Callback {
	const mt: object = (typeIs(t, "table") ? getmetatable(t) : undefined) ?? {};
	return typeIs(t, "function") || (typeIs(t, "table") && "__call" in mt);
}
