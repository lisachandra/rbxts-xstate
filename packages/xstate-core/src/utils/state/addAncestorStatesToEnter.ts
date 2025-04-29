import { AnyStateNode, HistoryValue } from "types";
import { addDescendantStatesToEnter } from "./addDescendantStatesToEnter";
import { getChildren } from "./getChildren";
import { isDescendant } from "./isDescendant";
import { isHistoryNode } from "./isHistoryNode";

export function addAncestorStatesToEnter(
	statesToEnter: Set<AnyStateNode>,
	historyValue: HistoryValue<any, any>,
	statesForDefaultEntry: Set<AnyStateNode>,
	ancestors: AnyStateNode[],
	reentrancyDomain?: AnyStateNode,
) {
	for (const anc of ancestors) {
		if (!reentrancyDomain || isDescendant(anc, reentrancyDomain)) {
			statesToEnter.add(anc);
		}
		if (anc.type === "parallel") {
			for (const child of getChildren(anc).filter(sn => !isHistoryNode(sn))) {
				if (![...statesToEnter].some(s => isDescendant(s, child))) {
					statesToEnter.add(child);
					addDescendantStatesToEnter(
						child,
						historyValue,
						statesForDefaultEntry,
						statesToEnter,
					);
				}
			}
		}
	}
}
