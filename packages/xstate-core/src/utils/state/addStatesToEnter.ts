import { AnyStateNode, EventObject, HistoryValue, MachineContext } from "types";
import { getChildren } from "./getChildren";
import { isDescendant } from "./isDescendant";
import { isHistoryNode } from "./isHistoryNode";
import { getProperAncestors } from "./getProperAncestors";
import { resolveHistoryDefaultTransition } from "./resolveHistoryDefaultTransition";

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
export function addProperAncestorStatesToEnter(
	stateNode: AnyStateNode,
	toStateNode: AnyStateNode | undefined,
	statesToEnter: Set<AnyStateNode>,
	historyValue: HistoryValue<any, any>,
	statesForDefaultEntry: Set<AnyStateNode>,
) {
	addAncestorStatesToEnter(
		statesToEnter,
		historyValue,
		statesForDefaultEntry,
		getProperAncestors(stateNode, toStateNode),
	);
}
export function addDescendantStatesToEnter<
	TContext extends MachineContext,
	TEvent extends EventObject,
>(
	stateNode: AnyStateNode,
	historyValue: HistoryValue<any, any>,
	statesForDefaultEntry: Set<AnyStateNode>,
	statesToEnter: Set<AnyStateNode>,
) {
	if (isHistoryNode(stateNode)) {
		if (historyValue[stateNode.id]) {
			const historyStateNodes = historyValue[stateNode.id];
			for (const s of historyStateNodes) {
				statesToEnter.add(s);

				addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
			}
			for (const s of historyStateNodes) {
				addProperAncestorStatesToEnter(
					s,
					stateNode.parent,
					statesToEnter,
					historyValue,
					statesForDefaultEntry,
				);
			}
		} else {
			const historyDefaultTransition = resolveHistoryDefaultTransition<TContext, TEvent>(
				stateNode,
			);
			for (const s of historyDefaultTransition.target) {
				statesToEnter.add(s);

				if (historyDefaultTransition === stateNode.parent?.getInitial()) {
					statesForDefaultEntry.add(stateNode.parent);
				}

				addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
			}

			for (const s of historyDefaultTransition.target) {
				addProperAncestorStatesToEnter(
					s,
					stateNode.parent,
					statesToEnter,
					historyValue,
					statesForDefaultEntry,
				);
			}
		}
	} else {
		if (stateNode.type === "compound") {
			const [initialState] = stateNode.getInitial().target;

			if (!isHistoryNode(initialState)) {
				statesToEnter.add(initialState);
				statesForDefaultEntry.add(initialState);
			}
			addDescendantStatesToEnter(
				initialState,
				historyValue,
				statesForDefaultEntry,
				statesToEnter,
			);

			addProperAncestorStatesToEnter(
				initialState,
				stateNode,
				statesToEnter,
				historyValue,
				statesForDefaultEntry,
			);
		} else {
			if (stateNode.type === "parallel") {
				for (const child of getChildren(stateNode).filter(sn => !isHistoryNode(sn))) {
					if (![...statesToEnter].some(s => isDescendant(s, child))) {
						if (!isHistoryNode(child)) {
							statesToEnter.add(child);
							statesForDefaultEntry.add(child);
						}
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
}
