import { Array } from "@rbxts/luau-polyfill";
import { spawnChild } from "actions";
import { cloneMachineSnapshot } from "State";
import {
	AnyMachineSnapshot,
	AnyEventObject,
	AnyActorScope,
	AnyTransitionDefinition,
	AnyStateNode,
	HistoryValue,
	UnknownAction,
} from "types";
import { createDoneStateEvent } from "utils/event/createDoneStateEvent";
import { resolveOutput } from "utils/misc/resolveOutput";
import { getMachineOutput } from "./getMachineOutput";
import { isInFinalState } from "./isInFinalState";
import { resolveActionsAndContext } from "./resolveActionsAndContext";
import { computeEntrySet } from "./computeEntrySet";

export function enterStates(
	currentSnapshot: AnyMachineSnapshot,
	event: AnyEventObject,
	actorScope: AnyActorScope,
	filteredTransitions: AnyTransitionDefinition[],
	mutStateNodeSet: Set<AnyStateNode>,
	internalQueue: AnyEventObject[],
	historyValue: HistoryValue<any, any>,
	isInitial: boolean,
) {
	let nextSnapshot = currentSnapshot;
	const statesToEnter = new Set<AnyStateNode>();
	// those are states that were directly targeted or indirectly targeted by the explicit target
	// in other words, those are states for which initial actions should be executed
	// when we target `#deep_child` initial actions of its ancestors shouldn't be executed
	const statesForDefaultEntry = new Set<AnyStateNode>();
	computeEntrySet(filteredTransitions, historyValue, statesForDefaultEntry, statesToEnter);

	// In the initial state, the root state node is "entered".
	if (isInitial) {
		statesForDefaultEntry.add(currentSnapshot.machine.root);
	}

	const completedNodes = new Set();

	for (const stateNodeToEnter of Array.sort([...statesToEnter], (a, b) => a.order - b.order)) {
		mutStateNodeSet.add(stateNodeToEnter);
		const actions: UnknownAction[] = [];

		// Add entry actions
		for (const v of stateNodeToEnter.entry) {
			actions.push(v);
		}

		for (const invokeDef of stateNodeToEnter.getInvoke()) {
			actions.push(
				spawnChild(invokeDef.src, {
					...invokeDef,
					syncSnapshot: !!invokeDef.onSnapshot,
				}),
			);
		}

		if (statesForDefaultEntry.has(stateNodeToEnter)) {
			const initialActions = stateNodeToEnter.getInitial().actions;
			for (const v of initialActions) {
				actions.push(v);
			}
		}

		nextSnapshot = resolveActionsAndContext(
			nextSnapshot,
			event,
			actorScope,
			actions,
			internalQueue,
			stateNodeToEnter.getInvoke().map(invokeDef => invokeDef.id),
		);

		if (stateNodeToEnter.type === "final") {
			const parent = stateNodeToEnter.parent;

			let ancestorMarker = parent?.type === "parallel" ? parent : parent?.parent;
			let rootCompletionNode = ancestorMarker || stateNodeToEnter;

			if (parent?.type === "compound") {
				internalQueue.push(
					createDoneStateEvent(
						parent.id,
						stateNodeToEnter.output !== undefined
							? resolveOutput(
									stateNodeToEnter.output,
									nextSnapshot.context,
									event,
									actorScope.self,
								)
							: undefined,
					),
				);
			}
			while (
				ancestorMarker?.type === "parallel" &&
				!completedNodes.has(ancestorMarker) &&
				isInFinalState(mutStateNodeSet, ancestorMarker)
			) {
				completedNodes.add(ancestorMarker);
				internalQueue.push(createDoneStateEvent(ancestorMarker.id));
				rootCompletionNode = ancestorMarker;
				ancestorMarker = ancestorMarker.parent;
			}
			if (ancestorMarker) {
				continue;
			}

			nextSnapshot = cloneMachineSnapshot(nextSnapshot, {
				status: "done",
				output: getMachineOutput(
					nextSnapshot,
					event,
					actorScope,
					nextSnapshot.machine.root,
					rootCompletionNode,
				),
			});
		}
	}

	return nextSnapshot;
}
