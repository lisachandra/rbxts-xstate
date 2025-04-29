export function indexString(str: string, index: number) {
	return utf8.char(utf8.codepoint(str, utf8.offset(str, index + 1))[0]);
}
