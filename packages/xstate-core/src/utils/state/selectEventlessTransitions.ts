import { Array } from "@rbxts/luau-polyfill";
import { evaluateGuard } from "guards";
import { AnyMachineSnapshot, AnyEventObject, AnyTransitionDefinition } from "types";
import { getProperAncestors } from "./getProperAncestors";
import { isAtomicStateNode } from "./isAtomicStateNode";
import { removeConflictingTransitions } from "./removeConflictingTransitions";

export function selectEventlessTransitions(
	nextState: AnyMachineSnapshot,
	event: AnyEventObject,
): AnyTransitionDefinition[] {
	const enabledTransitionSet: Set<AnyTransitionDefinition> = new Set();
	const atomicStates = nextState._nodes.filter(isAtomicStateNode);

	for (const stateNode of atomicStates) {
		const statesToSearch = Array.concat([stateNode], getProperAncestors(stateNode, undefined));
		statesToSearch.some(s => {
			if (!s.always) {
				return false;
			}
			for (const transition of s.always) {
				if (
					transition.guard === undefined ||
					evaluateGuard(transition.guard, nextState.context, event, nextState)
				) {
					enabledTransitionSet.add(transition);
					return true;
				}
			}
			return false;
		});
	}

	return removeConflictingTransitions(
		[...enabledTransitionSet],
		new Set(nextState._nodes),
		nextState.historyValue,
	);
}
