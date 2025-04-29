import { AnyTransitionDefinition, AnyHistoryValue, AnyStateNode } from "types";
import { isHistoryNode } from "./isHistoryNode";
import { resolveHistoryDefaultTransition } from "./resolveHistoryDefaultTransition";

export function getEffectiveTargetStates(
	transition: Pick<AnyTransitionDefinition, "target">,
	historyValue: AnyHistoryValue,
): Array<AnyStateNode> {
	if (!transition.target) {
		return [];
	}

	const targets = new Set<AnyStateNode>();

	for (const targetNode of transition.target) {
		if (isHistoryNode(targetNode)) {
			if (historyValue[targetNode.id]) {
				for (const node of historyValue[targetNode.id]) {
					targets.add(node);
				}
			} else {
				for (const node of getEffectiveTargetStates(
					resolveHistoryDefaultTransition(targetNode),
					historyValue,
				)) {
					targets.add(node);
				}
			}
		} else {
			targets.add(targetNode);
		}
	}

	return [...targets];
}
