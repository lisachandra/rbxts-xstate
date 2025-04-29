import { AnyTransitionDefinition, AnyStateNode, AnyHistoryValue } from "types";
import { getTransitionDomain } from "./getTransitionDomain";
import { isDescendant } from "./isDescendant";

export function computeExitSet(
	transitions: AnyTransitionDefinition[],
	stateNodeSet: Set<AnyStateNode>,
	historyValue: AnyHistoryValue,
): Array<AnyStateNode> {
	const statesToExit = new Set<AnyStateNode>();

	for (const t of transitions) {
		if (t.target?.size()) {
			const domain = getTransitionDomain(t, historyValue);

			if (t.reenter && t.source === domain) {
				statesToExit.add(domain);
			}

			for (const stateNode of stateNodeSet) {
				if (isDescendant(stateNode, domain!)) {
					statesToExit.add(stateNode);
				}
			}
		}
	}

	return [...statesToExit];
}
