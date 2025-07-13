import { String } from "@rbxts/luau-polyfill";
import { isArray } from "../polyfill/array";
import { indexString } from "../polyfill/indexString";

export function toStatePath(stateId: string | string[]): string[] {
	if (isArray(stateId)) {
		return stateId;
	}

	const result: string[] = [];
	let segment = "";

	for (let i = 0; i < stateId.size(); i++) {
		const char = String.charCodeAt(stateId, i + 1);
		switch (char) {
			// \
			case 92:
				// consume the next character
				segment += indexString(stateId, i + 1) ?? "";
				// and skip over it
				i++;
				continue;
			// .
			case 46:
				result.push(segment);
				segment = "";
				i++;
				continue;
		}
		segment += indexString(stateId, i) ?? "";
	}

	result.push(segment);

	return result;
}
