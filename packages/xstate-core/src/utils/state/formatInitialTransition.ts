import { Error } from "@rbxts/luau-polyfill";
import {
	MachineContext,
	EventObject,
	AnyStateNode,
	InitialTransitionConfig,
	TODO,
	InitialTransitionDefinition,
} from "types";
import { toArray } from "utils/polyfill/array";

export function formatInitialTransition<
	TContext extends MachineContext,
	TEvent extends EventObject,
>(
	stateNode: AnyStateNode,
	_target: string | undefined | InitialTransitionConfig<TContext, TEvent, TODO, TODO, TODO, TODO>,
): InitialTransitionDefinition<TContext, TEvent> {
	const resolvedTarget = typeIs(_target, "string")
		? stateNode.states[_target]
		: _target
			? stateNode.states[_target.target]
			: undefined;
	if (!resolvedTarget && _target) {
		throw new Error(
			`Initial state node "${_target}" not found on parent state node #${stateNode.id}`,
		);
	}
	const transition: InitialTransitionDefinition<TContext, TEvent> = {
		source: stateNode,
		actions: !_target || typeIs(_target, "string") ? [] : toArray(_target.actions),
		eventType: undefined as never,
		reenter: false,
		target: resolvedTarget ? [resolvedTarget] : [],
		toJSON: () => ({
			...transition,
			source: `#${stateNode.id}`,
			target: resolvedTarget ? [`#${resolvedTarget.id}`] : [],
		}),
	};

	return transition;
}
