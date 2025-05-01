import { Object } from "@rbxts/luau-polyfill";
import type { MachineSnapshot } from "State";
import {
	MachineContext,
	EventObject,
	AnyStateNode,
	StateValue,
	TransitionDefinition,
	StateValueMap,
} from "types";
import { transitionAtomicNode } from "./transitionAtomicNode";
import { getStateNode } from "./getStateNode";

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
export function transitionParallelNode<TContext extends MachineContext, TEvent extends EventObject>(
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
	const allInnerTransitions: Array<TransitionDefinition<TContext, TEvent>> = [];

	for (const subStateKey of Object.keys(stateValue)) {
		const subStateValue = stateValue[subStateKey];

		if (!subStateValue) {
			continue;
		}

		const subStateNode = getStateNode(stateNode, subStateKey as string);
		const innerTransitions = transitionNode(subStateNode, subStateValue, snapshot, event);
		if (innerTransitions) {
			for (const v of innerTransitions) {
				allInnerTransitions.push(v);
			}
		}
	}
	if (!allInnerTransitions.size()) {
		return stateNode.next(snapshot, event);
	}

	return allInnerTransitions;
}
