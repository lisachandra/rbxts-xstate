import { Object } from "@rbxts/luau-polyfill";
import type { StateValue } from "types";
import { toStateValue } from "./toStateValue";

export function matchesState(parentStateId: StateValue, childStateId: StateValue): boolean {
	const parentStateValue = toStateValue(parentStateId);
	const childStateValue = toStateValue(childStateId);

	if (typeIs(childStateValue, "string")) {
		if (typeIs(parentStateValue, "string")) {
			return childStateValue === parentStateValue;
		}

		// Parent more specific than child
		return false;
	}

	if (typeIs(parentStateValue, "string")) {
		return parentStateValue in childStateValue;
	}

	return Object.keys(parentStateValue).every(key => {
		if (!(key in childStateValue)) {
			return false;
		}

		return matchesState(parentStateValue[key]!, childStateValue[key]!);
	});
}
