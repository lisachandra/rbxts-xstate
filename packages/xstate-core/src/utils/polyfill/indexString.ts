export function indexString(str: string, index: number): string | undefined {
	index++;

	const byteOffset = utf8.offset(str, index);

	if (byteOffset === undefined) {
		return undefined;
	}

	let codepoint: number | undefined;
	try {
		[codepoint] = utf8.codepoint(str, byteOffset);
	} catch {
		return undefined;
	}

	if (codepoint === undefined) {
		return undefined;
	}

	return utf8.char(codepoint);
}
