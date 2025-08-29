const PLACEHOLDER = "__DOT_PLACEHOLDER__";

export function toStatePath(stateId: string | string[]): string[] {
	if (typeIs(stateId, "table")) {
		return stateId;
	}

	const unescapedString = string.gsub(stateId, "\\%.", PLACEHOLDER)[0];

	const result: string[] = [];
	for (const [segment] of unescapedString.gmatch("([^.]*)%.?")) {
		if ((segment as string).size() > 0) {
			result.push(string.gsub(segment as string, PLACEHOLDER, ".")[0]);
		}
	}

	return result;
}
