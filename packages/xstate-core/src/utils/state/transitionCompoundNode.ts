import { Object } from "@rbxts/luau-polyfill";
import type { MachineSnapshot } from "State";
import {
	MachineContext,
	EventObject,
	AnyStateNode,
	StateValueMap,
	TransitionDefinition,
	StateValue,
} from "types";
import { getStateNode } from "./getStateNode";
import { transitionNode } from "./transitionNode";

export function transitionCompoundNode<TContext extends MachineContext, TEvent extends EventObject>(
	stateNode: AnyStateNode,
	stateValue: StateValueMap,
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
	const subStateKeys = Object.keys(stateValue);

	const childStateNode = getStateNode(stateNode, subStateKeys[0] as string);
	const nextNode = transitionNode(
		childStateNode,
		stateValue[subStateKeys[0]] as StateValue,
		snapshot,
		event,
	);

	if (!nextNode || !nextNode.size()) {
		return stateNode.next(snapshot, event);
	}

	return nextNode;
}
