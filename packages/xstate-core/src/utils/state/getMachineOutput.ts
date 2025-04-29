import { AnyMachineSnapshot, AnyEventObject, AnyActorScope, AnyStateNode } from "types";
import { createDoneStateEvent } from "utils/event/createDoneStateEvent";
import { resolveOutput } from "utils/misc/resolveOutput";

export function getMachineOutput(
	snapshot: AnyMachineSnapshot,
	event: AnyEventObject,
	actorScope: AnyActorScope,
	rootNode: AnyStateNode,
	rootCompletionNode: AnyStateNode,
) {
	if (rootNode.output === undefined) {
		return;
	}
	const doneStateEvent = createDoneStateEvent(
		rootCompletionNode.id,
		rootCompletionNode.output !== undefined && rootCompletionNode.parent
			? resolveOutput(rootCompletionNode.output, snapshot.context, event, actorScope.self)
			: undefined,
	);
	return resolveOutput(rootNode.output, snapshot.context, doneStateEvent, actorScope.self);
}
