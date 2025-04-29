import { Object } from "@rbxts/luau-polyfill";
import type { MachineSnapshot } from "State";
import { MachineContext, EventObject, AnyStateNode, StateValue, TransitionDefinition } from "types";
import { transitionAtomicNode } from "./transitionAtomicNode";
import { transitionCompoundNode } from "./transitionCompoundNode";
import { transitionParallelNode } from "./transitionParallelNode";

export function transitionNode<TContext extends MachineContext, TEvent extends EventObject>(
	stateNode: AnyStateNode,
	stateValue: StateValue,
	snapshot: MachineSnapshot<
		TContext,
		TEvent,
		any,
		any,
		any,
		any,
		any,
		any // TStateSchema
	>,
	event: TEvent,
): Array<TransitionDefinition<TContext, TEvent>> | undefined {
	// leaf node
	if (typeIs(stateValue, "string")) {
		return transitionAtomicNode(stateNode, stateValue, snapshot, event);
	}

	// compound node
	if (Object.keys(stateValue).size() === 1) {
		return transitionCompoundNode(stateNode, stateValue, snapshot, event);
	}

	// parallel node
	return transitionParallelNode(stateNode, stateValue, snapshot, event);
}
