import { AnyTransitionDefinition, HistoryValue, AnyStateNode } from "types";
import { getEffectiveTargetStates } from "./getEffectiveTargetStates";
import { getProperAncestors } from "./getProperAncestors";
import { getTransitionDomain } from "./getTransitionDomain";
import { isHistoryNode } from "./isHistoryNode";
import { addAncestorStatesToEnter, addDescendantStatesToEnter } from "./addStatesToEnter";

export function computeEntrySet(
	transitions: Array<AnyTransitionDefinition>,
	historyValue: HistoryValue<any, any>,
	statesForDefaultEntry: Set<AnyStateNode>,
	statesToEnter: Set<AnyStateNode>,
) {
	for (const t of transitions) {
		const domain = getTransitionDomain(t, historyValue);

		for (const s of t.target || []) {
			if (
				!isHistoryNode(s) &&
				// if the target is different than the source then it will *definitely* be entered
				(t.source !== s ||
					// we know that the domain can't lie within the source
					// if it's different than the source then it's outside of it and it means that the target has to be entered as well
					t.source !== domain ||
					// reentering transitions always enter the target, even if it's the source itself
					t.reenter)
			) {
				statesToEnter.add(s);
				statesForDefaultEntry.add(s);
			}
			addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
		}
		const targetStates = getEffectiveTargetStates(t, historyValue);
		for (const s of targetStates) {
			const ancestors = getProperAncestors(s, domain);
			if (domain?.type === "parallel") {
				ancestors.push(domain);
			}
			addAncestorStatesToEnter(
				statesToEnter,
				historyValue,
				statesForDefaultEntry,
				ancestors,
				!t.source.parent && t.reenter ? undefined : domain,
			);
		}
	}
}
