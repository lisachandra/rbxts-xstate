import { Array } from "@rbxts/luau-polyfill";
import { stopChild } from "actions";
import {
	AnyMachineSnapshot,
	AnyEventObject,
	AnyActorScope,
	AnyTransitionDefinition,
	AnyStateNode,
	HistoryValue,
	ActionExecutor,
} from "types";
import { computeExitSet } from "./computeExitSet";
import { getHistoryNodes } from "./getHistoryNodes";
import { isAtomicStateNode } from "./isAtomicStateNode";
import { isDescendant } from "./isDescendant";
import { resolveActionsAndContext } from "./resolveActionsAndContext";

export function exitStates(
	currentSnapshot: AnyMachineSnapshot,
	event: AnyEventObject,
	actorScope: AnyActorScope,
	transitions: AnyTransitionDefinition[],
	mutStateNodeSet: Set<AnyStateNode>,
	historyValue: HistoryValue<any, any>,
	internalQueue: AnyEventObject[],
	_actionExecutor: ActionExecutor,
) {
	let nextSnapshot = currentSnapshot;
	const statesToExit = computeExitSet(transitions, mutStateNodeSet, historyValue);

	Array.sort(statesToExit, (a, b) => b.order - a.order);

	let changedHistory: typeof historyValue | undefined;

	// From SCXML algorithm: https://www.w3.org/TR/scxml/#exitStates
	for (const exitStateNode of statesToExit) {
		for (const historyNode of getHistoryNodes(exitStateNode)) {
			let predicate: (sn: AnyStateNode) => boolean;
			if (historyNode.history === "deep") {
				predicate = sn => isAtomicStateNode(sn) && isDescendant(sn, exitStateNode);
			} else {
				predicate = sn => {
					return sn.parent === exitStateNode;
				};
			}
			changedHistory ??= { ...historyValue };
			changedHistory[historyNode.id] = [...mutStateNodeSet].filter(predicate);
		}
	}

	for (const s of statesToExit) {
		nextSnapshot = resolveActionsAndContext(
			nextSnapshot,
			event,
			actorScope,
			[...s.exit, ...s.getInvoke().map(def => stopChild(def.id))],
			internalQueue,
			undefined,
		);
		mutStateNodeSet.delete(s);
	}
	return [nextSnapshot, changedHistory || historyValue] as const;
}
