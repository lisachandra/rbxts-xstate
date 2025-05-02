import { Array } from "@rbxts/luau-polyfill";
import { cloneMachineSnapshot } from "State";
import { AnyTransitionDefinition, AnyMachineSnapshot, AnyActorScope, AnyEventObject } from "types";
import { areStateNodeCollectionsEqual } from "./areStateNodeCollectionsEqual";
import { removeConflictingTransitions } from "./removeConflictingTransitions";
import { resolveActionsAndContext } from "./resolveActionsAndContext";
import { exitStates } from "./exitStates";
import { enterStates } from "./enterStates";

/** https://www.w3.org/TR/scxml/#microstepProcedure */
export function microstep(
	transitions: Array<AnyTransitionDefinition>,
	currentSnapshot: AnyMachineSnapshot,
	actorScope: AnyActorScope,
	event: AnyEventObject,
	isInitial: boolean,
	internalQueue: Array<AnyEventObject>,
): AnyMachineSnapshot {
	if (!transitions.size()) {
		return currentSnapshot;
	}
	const mutStateNodeSet = new Set(currentSnapshot._nodes);
	let historyValue = currentSnapshot.historyValue;

	const filteredTransitions = removeConflictingTransitions(
		transitions,
		mutStateNodeSet,
		historyValue,
	);

	let nextState = currentSnapshot;

	// Exit states
	if (!isInitial) {
		[nextState, historyValue] = exitStates(
			nextState,
			event,
			actorScope,
			filteredTransitions,
			mutStateNodeSet,
			historyValue,
			internalQueue,
			actorScope.actionExecutor,
		);
	}

	// Execute transition content
	nextState = resolveActionsAndContext(
		nextState,
		event,
		actorScope,
		Array.flatMap(filteredTransitions, t => t.actions),
		internalQueue,
		undefined,
	);

	// Enter states
	nextState = enterStates(
		nextState,
		event,
		actorScope,
		filteredTransitions,
		mutStateNodeSet,
		internalQueue,
		historyValue,
		isInitial,
	);

	const nextStateNodes = [...mutStateNodeSet];

	if (nextState.status === "done") {
		nextState = resolveActionsAndContext(
			nextState,
			event,
			actorScope,
			Array.flatMap(
				Array.sort(nextStateNodes, (a, b) => b.order - a.order),
				state => state.exit,
			),
			internalQueue,
			undefined,
		);
	}

	// eslint-disable-next-line no-useless-catch
	try {
		if (
			historyValue === currentSnapshot.historyValue &&
			areStateNodeCollectionsEqual(currentSnapshot._nodes, mutStateNodeSet)
		) {
			return nextState;
		}
		return cloneMachineSnapshot(nextState, {
			_nodes: nextStateNodes,
			historyValue,
		});
	} catch (e) {
		// TODO: Refactor this once proper error handling is implemented.
		// See https://github.com/statelyai/rfcs/pull/4
		throw e;
	}
}
