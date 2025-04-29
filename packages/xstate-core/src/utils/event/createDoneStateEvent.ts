import { DoneStateEvent } from "types";

/**
 * Returns an event that represents that a final state node has been reached in
 * the parent state node.
 *
 * @param id The final state node's parent state node `id`
 * @param output The data to pass into the event
 */

export function createDoneStateEvent(id: string, output?: unknown): DoneStateEvent {
	return {
		type: `xstate.done.state.${id}`,
		output,
	};
}
