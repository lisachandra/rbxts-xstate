import { Error } from "@rbxts/luau-polyfill";
import { WILDCARD, XSTATE_STOP, XSTATE_INIT } from "constants";
import { cloneMachineSnapshot } from "State";
import {
	AnyMachineSnapshot,
	EventObject,
	AnyActorScope,
	AnyEventObject,
	AnyTransitionDefinition,
} from "types";
import { isErrorActorEvent } from "utils/misc/isErrorActorEvent";
import isDevelopment from "utils/polyfill/isDevelopment";
import { microstep } from "./microstep";
import { selectEventlessTransitions } from "./selectEventlessTransitions";
import { selectTransitions } from "./selectTransitions";
import { stopChildren } from "./stopChildren";

export function macrostep(
	snapshot: AnyMachineSnapshot,
	event: EventObject,
	actorScope: AnyActorScope,
	internalQueue: AnyEventObject[],
): {
	snapshot: typeof snapshot;
	microstates: Array<typeof snapshot>;
} {
	if (isDevelopment && event.type === WILDCARD) {
		throw new Error(`An event cannot have the wildcard type ('${WILDCARD}')`);
	}

	let nextSnapshot = snapshot;
	const microstates: AnyMachineSnapshot[] = [];

	function addMicrostate(
		microstate: AnyMachineSnapshot,
		event: AnyEventObject,
		transitions: AnyTransitionDefinition[],
	) {
		actorScope.system._sendInspectionEvent({
			type: "@xstate.microstep",
			actorRef: actorScope.self,
			event,
			snapshot: microstate,
			_transitions: transitions,
		});
		microstates.push(microstate);
	}

	// Handle stop event
	if (event.type === XSTATE_STOP) {
		nextSnapshot = cloneMachineSnapshot(stopChildren(nextSnapshot, event, actorScope), {
			status: "stopped",
		});
		addMicrostate(nextSnapshot, event, []);

		return {
			snapshot: nextSnapshot,
			microstates,
		};
	}

	let nextEvent = event;

	// Assume the state is at rest (no raised events)
	// Determine the next state based on the next microstep
	if (nextEvent.type !== XSTATE_INIT) {
		const currentEvent = nextEvent;
		const isErr = isErrorActorEvent(currentEvent);

		const transitions = selectTransitions(currentEvent, nextSnapshot);

		if (isErr && !transitions.size()) {
			// TODO: we should likely only allow transitions selected by very explicit descriptors
			// `*` shouldn't be matched, likely `xstate.error.*` shouldnt be either
			// similarly `xstate.error.actor.*` and `xstate.error.actor.todo.*` have to be considered too
			nextSnapshot = cloneMachineSnapshot<typeof snapshot>(snapshot, {
				status: "error",
				error: currentEvent.error,
			});
			addMicrostate(nextSnapshot, currentEvent, []);
			return {
				snapshot: nextSnapshot,
				microstates,
			};
		}
		nextSnapshot = microstep(
			transitions,
			snapshot,
			actorScope,
			nextEvent,
			false, // isInitial
			internalQueue,
		);
		addMicrostate(nextSnapshot, currentEvent, transitions);
	}

	let shouldSelectEventlessTransitions = true;

	while (nextSnapshot.status === "active") {
		let enabledTransitions: AnyTransitionDefinition[] = shouldSelectEventlessTransitions
			? selectEventlessTransitions(nextSnapshot, nextEvent)
			: [];

		// eventless transitions should always be selected after selecting *regular* transitions
		// by assigning `undefined` to `previousState` we ensure that `shouldSelectEventlessTransitions` gets always computed to true in such a case
		const previousState = enabledTransitions.size() ? nextSnapshot : undefined;

		if (!enabledTransitions.size()) {
			if (!internalQueue.size()) {
				break;
			}
			nextEvent = internalQueue.shift()!;
			enabledTransitions = selectTransitions(nextEvent, nextSnapshot);
		}

		nextSnapshot = microstep(
			enabledTransitions,
			nextSnapshot,
			actorScope,
			nextEvent,
			false,
			internalQueue,
		);
		shouldSelectEventlessTransitions = nextSnapshot !== previousState;
		addMicrostate(nextSnapshot, nextEvent, enabledTransitions);
	}

	if (nextSnapshot.status !== "active") {
		stopChildren(nextSnapshot, nextEvent, actorScope);
	}

	return {
		snapshot: nextSnapshot,
		microstates,
	};
}
