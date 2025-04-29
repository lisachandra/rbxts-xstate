import isDevelopment from "../utils/polyfill/isDevelopment";
import { Guard, evaluateGuard } from "../guards";
import {
	Action,
	ActionArgs,
	ActionFunction,
	AnyActorRef,
	AnyActorScope,
	AnyEventObject,
	AnyMachineSnapshot,
	EventObject,
	MachineContext,
	ParameterizedObject,
	ProvidedActor,
	BuiltinActionResolution,
	UnifiedArg,
	UnknownAction,
} from "../types";
import { assign } from "./assign";
import { cancel } from "./cancel";
import { emit } from "./emit";
import { raise } from "./raise";
import { sendParent, sendTo } from "./send";
import { spawnChild } from "./spawnChild";
import { stopChild } from "./stopChild";
import { Error } from "@rbxts/luau-polyfill";

interface ActionEnqueuer<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
	TAction extends ParameterizedObject,
	TGuard extends ParameterizedObject,
	TDelay extends string,
	TEmitted extends EventObject,
> {
	(
		action: Action<
			TContext,
			TExpressionEvent,
			TEvent,
			undefined,
			TActor,
			TAction,
			TGuard,
			TDelay,
			TEmitted
		>,
	): void;
	assign: (
		...args: Parameters<typeof assign<TContext, TExpressionEvent, undefined, TEvent, TActor>>
	) => void;
	cancel: (
		...args: Parameters<typeof cancel<TContext, TExpressionEvent, undefined, TEvent>>
	) => void;
	raise: (
		...args: Parameters<
			typeof raise<TContext, TExpressionEvent, TEvent, undefined, TDelay, TDelay>
		>
	) => void;
	sendTo: <TTargetActor extends AnyActorRef>(
		...args: Parameters<
			typeof sendTo<
				TContext,
				TExpressionEvent,
				undefined,
				TTargetActor,
				TEvent,
				TDelay,
				TDelay
			>
		>
	) => void;
	sendParent: (
		...args: Parameters<
			typeof sendParent<
				TContext,
				TExpressionEvent,
				undefined,
				AnyEventObject,
				TEvent,
				TDelay,
				TDelay
			>
		>
	) => void;
	spawnChild: (
		...args: Parameters<
			typeof spawnChild<TContext, TExpressionEvent, undefined, TEvent, TActor>
		>
	) => void;
	stopChild: (
		...args: Parameters<typeof stopChild<TContext, TExpressionEvent, undefined, TEvent>>
	) => void;
	emit: (
		...args: Parameters<typeof emit<TContext, TExpressionEvent, undefined, TEvent, TEmitted>>
	) => void;
}

function resolveEnqueueActions(
	actorScope: AnyActorScope,
	snapshot: AnyMachineSnapshot,
	args: ActionArgs<any, any, any>,
	actionParams: ParameterizedObject["params"] | undefined,
	{
		collect,
	}: {
		collect: CollectActions<
			MachineContext,
			EventObject,
			ParameterizedObject["params"] | undefined,
			EventObject,
			ProvidedActor,
			ParameterizedObject,
			ParameterizedObject,
			string,
			EventObject
		>;
	},
): BuiltinActionResolution {
	const actions: defined[] = [];
	const enqueue: Parameters<typeof collect>[0]["enqueue"] = function (action) {
		actions.push(action);
	};
	enqueue.assign = (...args) => {
		actions.push(assign(...args));
	};
	enqueue.cancel = (...args) => {
		actions.push(cancel(...args));
	};
	enqueue.raise = (...args) => {
		// for some reason it fails to infer `TDelay` from `...args` here and picks its default (`never`)
		// then it fails to typecheck that because `...args` use `string` in place of `TDelay`
		actions.push((raise as typeof enqueue.raise)(...args) as never);
	};
	enqueue.sendTo = (...args) => {
		// for some reason it fails to infer `TDelay` from `...args` here and picks its default (`never`)
		// then it fails to typecheck that because `...args` use `string` in place of `TDelay
		actions.push((sendTo as typeof enqueue.sendTo)(...args) as never);
	};
	enqueue.sendParent = (...args) => {
		actions.push((sendParent as typeof enqueue.sendParent)(...args) as never);
	};
	enqueue.spawnChild = (...args) => {
		actions.push(spawnChild(...args));
	};
	enqueue.stopChild = (...args) => {
		actions.push(stopChild(...args));
	};
	enqueue.emit = (...args) => {
		actions.push(emit(...args));
	};

	collect(
		{
			context: args.context,
			event: args.event,
			enqueue,
			check: guard => evaluateGuard(guard, snapshot.context, args.event, snapshot),
			self: actorScope.self,
			system: actorScope.system,
		},
		actionParams,
	);

	return [snapshot, undefined, actions as UnknownAction[]];
}

export interface EnqueueActionsAction<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
	TAction extends ParameterizedObject,
	TGuard extends ParameterizedObject,
	TDelay extends string,
> {
	(args: ActionArgs<TContext, TExpressionEvent, TEvent>, params: TParams): void;
	_out_TEvent?: TEvent;
	_out_TActor?: TActor;
	_out_TAction?: TAction;
	_out_TGuard?: TGuard;
	_out_TDelay?: TDelay;
}

interface CollectActionsArg<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
	TAction extends ParameterizedObject,
	TGuard extends ParameterizedObject,
	TDelay extends string,
	TEmitted extends EventObject,
> extends UnifiedArg<TContext, TExpressionEvent, TEvent> {
	check: (guard: Guard<TContext, TExpressionEvent, undefined, TGuard>) => boolean;
	enqueue: ActionEnqueuer<
		TContext,
		TExpressionEvent,
		TEvent,
		TActor,
		TAction,
		TGuard,
		TDelay,
		TEmitted
	>;
}

type CollectActions<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
	TAction extends ParameterizedObject,
	TGuard extends ParameterizedObject,
	TDelay extends string,
	TEmitted extends EventObject,
> = (
	{
		context,
		event,
		check,
		enqueue,
		self,
	}: CollectActionsArg<
		TContext,
		TExpressionEvent,
		TEvent,
		TActor,
		TAction,
		TGuard,
		TDelay,
		TEmitted
	>,
	params: TParams,
) => void;

/**
 * Creates an action object that will execute actions that are queued by the
 * `enqueue(action)` function.
 *
 * @example
 *
 * ```ts
 * import { createMachine, enqueueActions } from "@rbxts/xstate";
 *
 * const machine = createMachine({
 * 	entry: enqueueActions(({ enqueue, check }) => {
 * 		enqueue.assign({ count: 0 });
 *
 * 		if (check("someGuard")) {
 * 			enqueue.assign({ count: 1 });
 * 		}
 *
 * 		enqueue("someAction");
 * 	}),
 * });
 * ```
 */
export function enqueueActions<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject = TExpressionEvent,
	TActor extends ProvidedActor = ProvidedActor,
	TAction extends ParameterizedObject = ParameterizedObject,
	TGuard extends ParameterizedObject = ParameterizedObject,
	TDelay extends string = never,
	TEmitted extends EventObject = EventObject,
>(
	collect: CollectActions<
		TContext,
		TExpressionEvent,
		TParams,
		TEvent,
		TActor,
		TAction,
		TGuard,
		TDelay,
		TEmitted
	>,
): ActionFunction<
	TContext,
	TExpressionEvent,
	TEvent,
	TParams,
	TActor,
	TAction,
	TGuard,
	TDelay,
	TEmitted
> {
	function enqueueActions(
		_args: ActionArgs<TContext, TExpressionEvent, TEvent>,
		_params: unknown,
	) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
	}

	enqueueActions.type = "xstate.enqueueActions";
	enqueueActions.collect = collect;
	enqueueActions.resolve = resolveEnqueueActions;

	return enqueueActions;
}
