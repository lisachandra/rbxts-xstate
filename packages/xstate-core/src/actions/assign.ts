import isDevelopment from "../utils/polyfill/isDevelopment";
import { cloneMachineSnapshot } from "../State";
import { executingCustomAction } from "../createActor";
import { Spawner, createSpawner } from "../createSpawner";
import type {
	ActionArgs,
	AnyActorScope,
	AnyActorRef,
	AnyEventObject,
	AnyMachineSnapshot,
	Assigner,
	EventObject,
	LowInfer,
	MachineContext,
	ParameterizedObject,
	PropertyAssigner,
	ProvidedActor,
	ActionFunction,
	BuiltInActionResolution,
} from "../types";
import { Error, Object } from "@rbxts/luau-polyfill";
import { callable } from "utils/polyfill/callable";

export interface AssignArgs<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
> extends ActionArgs<TContext, TExpressionEvent, TEvent> {
	spawn: Spawner<TActor>;
}

function resolveAssign(
	actorScope: AnyActorScope,
	snapshot: AnyMachineSnapshot,
	actionArgs: ActionArgs<any, any, any>,
	actionParams: ParameterizedObject["params"] | undefined,
	{
		assignment,
	}: {
		assignment: Assigner<any, any, any, any, any> | PropertyAssigner<any, any, any, any, any>;
	},
): BuiltInActionResolution {
	if (!(snapshot.context as unknown)) {
		throw new Error(
			"Cannot assign to undefined `context`. Ensure that `context` is defined in the machine config.",
		);
	}
	const spawnedChildren: Record<string, AnyActorRef> = {};

	const assignArgs: AssignArgs<any, any, any, any> = {
		context: snapshot.context,
		event: actionArgs.event,
		spawn: createSpawner(actorScope, snapshot, actionArgs.event, spawnedChildren),
		self: actorScope.self,
		system: actorScope.system,
	};
	let partialUpdate: Record<string, unknown> = {};
	if (typeIs(assignment, "function")) {
		partialUpdate = assignment(assignArgs, actionParams);
	} else {
		for (const [key] of pairs(assignment)) {
			const propAssignment = assignment[key as string];
			partialUpdate[key as string] = typeIs(propAssignment, "function")
				? propAssignment(assignArgs, actionParams)
				: propAssignment;
		}
	}

	const updatedContext = Object.assign({}, snapshot.context, partialUpdate);

	return [
		cloneMachineSnapshot(snapshot, {
			context: updatedContext,
			children: Object.keys(spawnedChildren).size()
				? {
						...snapshot.children,
						...spawnedChildren,
					}
				: snapshot.children,
		}),
		undefined,
		undefined,
	];
}

export interface AssignAction<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
> {
	(args: ActionArgs<TContext, TExpressionEvent, TEvent>, params: TParams): void;
	_out_TActor?: TActor;
}

/**
 * Updates the current context of the machine.
 *
 * @example
 *
 * ```ts
 * import { createMachine, assign } from "@rbxts/xstate";
 *
 * const countMachine = createMachine({
 * 	context: {
 * 		count: 0,
 * 		message: "",
 * 	},
 * 	on: {
 * 		inc: {
 * 			actions: assign({
 * 				count: ({ context }) => context.count + 1,
 * 			}),
 * 		},
 * 		updateMessage: {
 * 			actions: assign(({ context, event }) => {
 * 				return {
 * 					message: event.message.trim(),
 * 				};
 * 			}),
 * 		},
 * 	},
 * });
 * ```
 *
 * @param assignment An object that represents the partial context to update, or
 *   a function that returns an object that represents the partial context to
 *   update.
 */
export function assign<
	TContext extends MachineContext,
	TExpressionEvent extends AnyEventObject, // TODO: consider using a stricter `EventObject` here
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
>(
	assignment:
		| Assigner<LowInfer<TContext>, TExpressionEvent, TParams, TEvent, TActor>
		| PropertyAssigner<LowInfer<TContext>, TExpressionEvent, TParams, TEvent, TActor>,
): ActionFunction<TContext, TExpressionEvent, TEvent, TParams, TActor, never, never, never, never> {
	if (isDevelopment && executingCustomAction) {
		warn(
			"Custom actions should not call `assign()` directly, as it is not imperative. See https://stately.ai/docs/actions#built-in-actions for more details.",
		);
	}

	function assign(_args: ActionArgs<TContext, TExpressionEvent, TEvent>, _params: TParams) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
	}

	// @ts-expect-error -- lua polyfill
	assign = callable(assign);
	assign.type = "xstate.assign";
	assign.assignment = assignment;

	assign.resolve = resolveAssign;

	return assign;
}
