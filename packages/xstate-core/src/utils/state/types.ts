import type { StateNode } from "StateNode";
import type {
	MachineContext,
	EventObject,
	AnyStateNode,
	ActionArgs,
	AnyActorScope,
	AnyMachineSnapshot,
	ParameterizedObject,
	UnknownAction,
} from "types";

export type StateNodeIterable<TContext extends MachineContext, TE extends EventObject> = Iterable<
	StateNode<TContext, TE>
>;
export type AnyStateNodeIterable = StateNodeIterable<any, any>;

export type AdjList = Map<AnyStateNode, Array<AnyStateNode>>;

export interface BuiltInAction {
	(): void;
	type: `xstate.${string}`;
	resolve: (
		actorScope: AnyActorScope,
		snapshot: AnyMachineSnapshot,
		actionArgs: ActionArgs<any, any, any>,
		actionParams: ParameterizedObject["params"] | undefined,
		action: unknown,
		extra: unknown,
	) => [newState: AnyMachineSnapshot, params: unknown, actions?: UnknownAction[]];
	retryResolve: (
		actorScope: AnyActorScope,
		snapshot: AnyMachineSnapshot,
		params: unknown,
	) => void;
	execute: (actorScope: AnyActorScope, params: unknown) => void;
}
