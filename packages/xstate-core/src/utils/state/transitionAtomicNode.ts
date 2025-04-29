import type { MachineSnapshot } from "State";
import { MachineContext, EventObject, AnyStateNode, TransitionDefinition } from "types";
import { getStateNode } from "./getStateNode";

export function transitionAtomicNode<TContext extends MachineContext, TEvent extends EventObject>(
	stateNode: AnyStateNode,
	stateValue: string,
	snapshot: MachineSnapshot<
		TContext,
		TEvent,
		any,
		any,
		any,
		any,
		any, // TMeta
		any // TStateSchema
	>,
	event: TEvent,
): Array<TransitionDefinition<TContext, TEvent>> | undefined {
	const childStateNode = getStateNode(stateNode, stateValue);
	const nextNode = childStateNode.next(snapshot, event);

	if (!nextNode || !nextNode.size()) {
		return stateNode.next(snapshot, event);
	}

	return nextNode;
}
