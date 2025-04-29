import { AnyStateNode, HistoryValue } from "types";
import { addAncestorStatesToEnter } from "./addAncestorStatesToEnter";
import { getProperAncestors } from "./getProperAncestors";

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
