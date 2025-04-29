import type { StateValue } from "types";

export function pathToStateValue(statePath: string[]): StateValue {
	if (statePath.size() === 1) {
		return statePath[0];
	}

	const value: StateValue = {};
	let marker = value;

	for (let i = 0; i < statePath.size() - 1; i++) {
		if (i === statePath.size() - 2) {
			marker[statePath[i]] = statePath[i + 1];
		} else {
			const previous = marker;
			marker = {};
			previous[statePath[i]] = marker;
		}
	}

	return value;
}
