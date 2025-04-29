import { Object } from "@rbxts/luau-polyfill";
import type { MachineSnapshot } from "State";
import {
	MachineContext,
	EventObject,
	AnyStateNode,
	StateValueMap,
	TransitionDefinition,
} from "types";
import { getStateNode } from "./getStateNode";
import { transitionNode } from "./transitionNode";

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
