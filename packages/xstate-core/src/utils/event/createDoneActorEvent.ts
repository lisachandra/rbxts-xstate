import { DoneActorEvent } from "types";

/**
 * Returns an event that represents that an invoked service has terminated.
 *
 * An invoked service is terminated when it has reached a top-level final state
 * node, but not when it is canceled.
 *
 * @param invokeId The invoked service ID
 * @param output The data to pass into the event
 */

export function createDoneActorEvent(invokeId: string, output?: unknown): DoneActorEvent {
	return {
		type: `xstate.done.actor.${invokeId}`,
		output,
		actorId: invokeId,
	};
}
