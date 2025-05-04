import isDevelopment from "../utils/polyfill/isDevelopment";
import { executingCustomAction } from "../createActor";
import {
	ActionArgs,
	ActionFunction,
	AnyActorScope,
	AnyEventObject,
	AnyMachineSnapshot,
	DoNotInfer,
	EventObject,
	MachineContext,
	ParameterizedObject,
	SendExpr,
	BuiltInActionResolution,
} from "../types";
import { Error } from "@rbxts/luau-polyfill";
import { callable } from "utils/polyfill/callable";

function resolveEmit(
	_: AnyActorScope,
	snapshot: AnyMachineSnapshot,
	args: ActionArgs<any, any, any>,
	actionParams: ParameterizedObject["params"] | undefined,
	{
		event: eventOrExpr,
	}: {
		event:
			| EventObject
			| SendExpr<
					MachineContext,
					EventObject,
					ParameterizedObject["params"] | undefined,
					EventObject,
					EventObject
			  >;
	},
): BuiltInActionResolution {
	const resolvedEvent = typeIs(eventOrExpr, "function")
		? eventOrExpr(args, actionParams)
		: eventOrExpr;
	return [snapshot, { event: resolvedEvent }, undefined];
}

function executeEmit(
	actorScope: AnyActorScope,
	{
		event,
	}: {
		event: EventObject;
	},
) {
	actorScope.defer(() => actorScope.emit(event));
}

export interface EmitAction<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TEmitted extends EventObject,
> {
	(args: ActionArgs<TContext, TExpressionEvent, TEvent>, params: TParams): void;
	_out_TEmitted?: TEmitted;
}

/**
 * Emits an event to event handlers registered on the actor via `actor.on(event,
 * handler)`.
 *
 * @example
 *
 * ```ts
 * import { emit } from "@rbxts/xstate";
 *
 * const machine = createMachine({
 * 	// ...
 * 	on: {
 * 		something: {
 * 			actions: emit({
 * 				type: "emitted",
 * 				some: "data",
 * 			}),
 * 		},
 * 	},
 * 	// ...
 * });
 *
 * const actor = createActor(machine).start();
 *
 * actor.on("emitted", event => {
 * 	console.log(event);
 * });
 *
 * actor.send({ type: "something" });
 * // logs:
 * // {
 * //   type: 'emitted',
 * //   some: 'data'
 * // }
 * ```
 */
export function emit<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TEmitted extends AnyEventObject,
>(
	/** The event to emit, or an expression that returns an event to emit. */
	eventOrExpr:
		| DoNotInfer<TEmitted>
		| SendExpr<TContext, TExpressionEvent, TParams, DoNotInfer<TEmitted>, TEvent>,
): ActionFunction<
	TContext,
	TExpressionEvent,
	TEvent,
	TParams,
	never,
	never,
	never,
	never,
	TEmitted
> {
	if (isDevelopment && executingCustomAction) {
		warn(
			"Custom actions should not call `emit()` directly, as it is not imperative. See https://stately.ai/docs/actions#built-in-actions for more details.",
		);
	}

	function emit(_args: ActionArgs<TContext, TExpressionEvent, TEvent>, _params: TParams) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
	}

	// @ts-expect-error -- lua polyfill
	emit = callable(emit);
	emit.type = "xstate.emit";
	emit.event = eventOrExpr;

	emit.resolve = resolveEmit;
	emit.execute = executeEmit;

	return emit;
}
