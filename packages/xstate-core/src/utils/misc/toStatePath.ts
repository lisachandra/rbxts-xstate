export function toStatePath(stateId: string | string[]): string[] {
	if (typeIs(stateId, "table")) {
		return stateId;
	}

	const result: string[] = [];
	let segment = "";

	let index = 1;
	while (index <= stateId.size()) {
		const char = string.sub(stateId, index, index);

		// Check for a backslash escape character
		if (char === "\\") {
			// If there is a next character, consume it and add it to the segment.
			// This handles cases like `path\.segment`.
			if (index + 1 <= stateId.size()) {
				segment = segment + string.sub(stateId, index + 1, index + 1);
				index += 2; // Skip both the backslash and the escaped character
			} else {
				// If the backslash is the last character, treat it literally.
				segment = segment + char;
				index++;
			}
			// Check for a dot delimiter
		} else if (char === ".") {
			result.push(segment);
			segment = "";
			index++; // Move to the next character
		} else {
			// For any other character, just append it to the segment.
			segment = segment + char;
			index++;
		}
	}

	result.push(segment);

	return result;
}
