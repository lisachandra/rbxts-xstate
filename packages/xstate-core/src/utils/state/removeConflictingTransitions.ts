import { AnyTransitionDefinition, AnyStateNode, AnyHistoryValue } from "types";
import { hasIntersection } from "utils/misc/hasIntersection";
import { isDescendant } from "./isDescendant";
import { computeExitSet } from "./computeExitSet";
import { Array } from "@rbxts/luau-polyfill";

export function removeConflictingTransitions(
	enabledTransitions: Array<AnyTransitionDefinition>,
	stateNodeSet: Set<AnyStateNode>,
	historyValue: AnyHistoryValue,
): Array<AnyTransitionDefinition> {
	const filteredTransitions = new Set<AnyTransitionDefinition>();

	for (const t1 of enabledTransitions) {
		let t1Preempted = false;
		const transitionsToRemove = new Set<AnyTransitionDefinition>();
		for (const t2 of filteredTransitions) {
			if (
				hasIntersection(
					computeExitSet([t1], stateNodeSet, historyValue),
					computeExitSet([t2], stateNodeSet, historyValue),
				)
			) {
				if (isDescendant(t1.source, t2.source)) {
					transitionsToRemove.add(t2);
				} else {
					t1Preempted = true;
					break;
				}
			}
		}
		if (!t1Preempted) {
			for (const t3 of transitionsToRemove) {
				filteredTransitions.delete(t3);
			}
			filteredTransitions.add(t1);
		}
	}

	return Array.sort([...filteredTransitions], (a, b) => a.source.order - b.source.order);
}
