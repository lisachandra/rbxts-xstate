import { ErrorActorEvent } from "types";

export function createErrorActorEvent(id: string, err?: unknown): ErrorActorEvent {
	return { type: `xstate.error.actor.${id}`, error: err, actorId: id };
}
