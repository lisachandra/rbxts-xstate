import { Array } from "@rbxts/luau-polyfill";
import { AnyTransitionDefinition, AnyHistoryValue, AnyStateNode } from "types";
import { findLeastCommonAncestor } from "./findLeastCommonAncestor";
import { getEffectiveTargetStates } from "./getEffectiveTargetStates";
import { isDescendant } from "./isDescendant";

export function getTransitionDomain(
	transition: AnyTransitionDefinition,
	historyValue: AnyHistoryValue,
): AnyStateNode | undefined {
	const targetStates = getEffectiveTargetStates(transition, historyValue);

	if (!targetStates) {
		return;
	}

	if (
		!transition.reenter &&
		targetStates.every(
			target => target === transition.source || isDescendant(target, transition.source),
		)
	) {
		return transition.source;
	}

	const lca = findLeastCommonAncestor(Array.concat(targetStates, [transition.source]));

	if (lca) {
		return lca;
	}

	// at this point we know that it's a root transition since LCA couldn't be found
	if (transition.reenter) {
		return;
	}

	return transition.source.machine.root;
}
