import { Object, Error } from "@rbxts/luau-polyfill";
import { NULL_EVENT } from "constants";
import {
	MachineContext,
	EventObject,
	AnyStateNode,
	TransitionDefinition,
	AnyEventObject,
} from "types";
import { formatTransition } from "./formatTransition";
import { toTransitionConfigArray } from "utils/misc/toTransitionConfigArray";

export function formatTransitions<TContext extends MachineContext, TEvent extends EventObject>(
	stateNode: AnyStateNode,
): Map<string, TransitionDefinition<TContext, TEvent>[]> {
	const transitions = new Map<string, TransitionDefinition<TContext, AnyEventObject>[]>();
	if (stateNode.config.on) {
		for (const descriptor of Object.keys(stateNode.config.on)) {
			if ((descriptor as unknown) === NULL_EVENT) {
				throw new Error(
					'Null events ("") cannot be specified as a transition key. Use `always: { ... }` instead.',
				);
			}
			const transitionsConfig = stateNode.config.on[descriptor as string];
			transitions.set(
				descriptor,
				toTransitionConfigArray(transitionsConfig).map(t =>
					formatTransition(stateNode, descriptor, t),
				),
			);
		}
	}
	if (stateNode.config.onDone) {
		const descriptor = `xstate.done.state.${stateNode.id}`;
		transitions.set(
			descriptor,
			toTransitionConfigArray(stateNode.config.onDone).map(t =>
				formatTransition(stateNode, descriptor, t),
			),
		);
	}
	for (const invokeDef of stateNode.getInvoke()) {
		if (invokeDef.onDone) {
			const descriptor = `xstate.done.actor.${invokeDef.id}`;
			transitions.set(
				descriptor,
				toTransitionConfigArray(invokeDef.onDone).map(t =>
					formatTransition(stateNode, descriptor, t),
				),
			);
		}
		if (invokeDef.onError) {
			const descriptor = `xstate.error.actor.${invokeDef.id}`;
			transitions.set(
				descriptor,
				toTransitionConfigArray(invokeDef.onError).map(t =>
					formatTransition(stateNode, descriptor, t),
				),
			);
		}
		if (invokeDef.onSnapshot) {
			const descriptor = `xstate.snapshot.${invokeDef.id}`;
			transitions.set(
				descriptor,
				toTransitionConfigArray(invokeDef.onSnapshot).map(t =>
					formatTransition(stateNode, descriptor, t),
				),
			);
		}
	}
	for (const delayedTransition of stateNode.getAfter()) {
		let existing = transitions.get(delayedTransition.eventType);
		if (!existing) {
			existing = [];
			transitions.set(delayedTransition.eventType, existing);
		}
		existing.push(delayedTransition);
	}
	return transitions as Map<string, TransitionDefinition<TContext, any>[]>;
}
