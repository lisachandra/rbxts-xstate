import isDevelopment from "../utils/polyfill/isDevelopment";
import { Error } from "@rbxts/luau-polyfill";
import { executingCustomAction } from "../createActor";
import {
	ActionArgs,
	ActionFunction,
	AnyActorScope,
	AnyEventObject,
	AnyMachineSnapshot,
	DelayExpr,
	DoNotInfer,
	EventObject,
	ExecutableActionObject,
	MachineContext,
	ParameterizedObject,
	RaiseActionOptions,
	SendExpr,
	BuiltinActionResolution,
} from "../types";

function resolveRaise(
	_: AnyActorScope,
	snapshot: AnyMachineSnapshot,
	args: ActionArgs<any, any, any>,
	actionParams: ParameterizedObject["params"] | undefined,
	{
		event: eventOrExpr,
		id,
		delay,
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
		id: string | undefined;
		delay:
			| string
			| number
			| DelayExpr<
					MachineContext,
					EventObject,
					ParameterizedObject["params"] | undefined,
					EventObject
			  >
			| undefined;
	},
	{ internalQueue }: { internalQueue: AnyEventObject[] },
): BuiltinActionResolution {
	const delaysMap = snapshot.machine.implementations.delays;

	if (typeIs(eventOrExpr, "string")) {
		throw new Error(
			`Only event objects may be used with raise; use raise({ type: "${eventOrExpr}" }) instead`,
		);
	}
	const resolvedEvent = typeIs(eventOrExpr, "function")
		? eventOrExpr(args, actionParams)
		: eventOrExpr;

	let resolvedDelay: number | undefined;
	if (typeIs(delay, "string")) {
		const configDelay = delaysMap && delaysMap[delay];
		resolvedDelay = typeIs(configDelay, "function")
			? configDelay(args, actionParams)
			: configDelay;
	} else {
		resolvedDelay = typeIs(delay, "function") ? delay(args, actionParams) : delay;
	}
	if (typeIs(resolvedDelay, "number")) {
		internalQueue.push(resolvedEvent);
	}
	return [
		snapshot,
		{
			event: resolvedEvent,
			id,
			delay: resolvedDelay,
		},
		undefined,
	];
}

function executeRaise(
	actorScope: AnyActorScope,
	params: {
		event: EventObject;
		id: string | undefined;
		delay: number | undefined;
	},
) {
	const { event, delay, id } = params;
	if (typeIs(delay, "number")) {
		actorScope.defer(() => {
			const itself = actorScope.self;
			actorScope.system.scheduler.schedule(itself, itself, event, delay, id);
		});
		return;
	}
}

export interface RaiseAction<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TDelay extends string,
> {
	(args: ActionArgs<TContext, TExpressionEvent, TEvent>, params: TParams): void;
	_out_TEvent?: TEvent;
	_out_TDelay?: TDelay;
}

/**
 * Raises an event. This places the event in the internal event queue, so that
 * the event is immediately consumed by the machine in the current step.
 *
 * @param eventType The event to raise.
 */
export function raise<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TDelay extends string = never,
	TUsedDelay extends TDelay = never,
>(
	eventOrExpr:
		| DoNotInfer<TEvent>
		| SendExpr<TContext, TExpressionEvent, TParams, DoNotInfer<TEvent>, TEvent>,
	options?: RaiseActionOptions<
		TContext,
		TExpressionEvent,
		TParams,
		DoNotInfer<TEvent>,
		TUsedDelay
	>,
): ActionFunction<TContext, TExpressionEvent, TEvent, TParams, never, never, never, TDelay, never> {
	if (isDevelopment && executingCustomAction) {
		warn(
			"Custom actions should not call `raise()` directly, as it is not imperative. See https://stately.ai/docs/actions#built-in-actions for more details.",
		);
	}

	function raise(_args: ActionArgs<TContext, TExpressionEvent, TEvent>, _params: TParams) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
	}

	raise.type = "xstate.raise";
	raise.event = eventOrExpr;
	raise.id = options?.id;
	raise.delay = options?.delay;

	raise.resolve = resolveRaise;
	raise.execute = executeRaise;

	return raise;
}

export interface ExecutableRaiseAction extends ExecutableActionObject {
	type: "xstate.raise";
	params: {
		event: EventObject;
		id: string | undefined;
		delay: number | undefined;
	};
}
