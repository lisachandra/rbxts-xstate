import isDevelopment from "../utils/polyfill/isDevelopment";
import { cloneMachineSnapshot } from "../State";
import { ProcessingStatus } from "../createActor";
import {
	ActionArgs,
	AnyActorRef,
	AnyActorScope,
	AnyMachineSnapshot,
	EventObject,
	MachineContext,
	ParameterizedObject,
	BuiltInActionResolution,
	AnyObject,
} from "../types";
import { Error } from "@rbxts/luau-polyfill";
import { callable } from "utils/polyfill/callable";

type ResolvableActorRef<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
> =
	| string
	| AnyActorRef
	| ((
			args: ActionArgs<TContext, TExpressionEvent, TEvent>,
			params: TParams,
	  ) => AnyActorRef | string);

function resolveStop(
	_: AnyActorScope,
	snapshot: AnyMachineSnapshot,
	args: ActionArgs<any, any, any>,
	actionParams: ParameterizedObject["params"] | undefined,
	{ actorRef }: { actorRef: ResolvableActorRef<any, any, any, any> },
): BuiltInActionResolution {
	const actorRefOrString = typeIs(actorRef, "function") ? actorRef(args, actionParams) : actorRef;
	const resolvedActorRef: AnyActorRef | undefined = typeIs(actorRefOrString, "string")
		? ((snapshot.children as AnyObject)[actorRefOrString] as never)
		: actorRefOrString;

	let children = snapshot.children;
	if (resolvedActorRef) {
		children = { ...children };
		delete (children as AnyObject)[resolvedActorRef.id];
	}

	return [
		cloneMachineSnapshot(snapshot, {
			children,
		}),
		resolvedActorRef,
		undefined,
	];
}
function executeStop(actorScope: AnyActorScope, actorRef: AnyActorRef | 0 | undefined) {
	if (!actorRef) {
		return;
	}

	// we need to eagerly unregister it here so a new actor with the same systemId can be registered immediately
	// since we defer actual stopping of the actor but we don't defer actor creations (and we can't do that)
	// this could throw on `systemId` collision, for example, when dealing with reentering transitions
	actorScope.system._unregister(actorRef);

	// this allows us to prevent an actor from being started if it gets stopped within the same macrostep
	// this can happen, for example, when the invoking state is being exited immediately by an always transition
	if (actorRef._processingStatus !== ProcessingStatus.Running) {
		actorScope.stopChild(actorRef);
		return;
	}
	// stopping a child enqueues a stop event in the child actor's mailbox
	// we need for all of the already enqueued events to be processed before we stop the child
	// the parent itself might want to send some events to a child (for example from exit actions on the invoking state)
	// and we don't want to ignore those events
	actorScope.defer(() => {
		actorScope.stopChild(actorRef);
	});
}

export interface StopAction<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
> {
	(args: ActionArgs<TContext, TExpressionEvent, TEvent>, params: TParams): void;
}

/**
 * Stops a child actor.
 *
 * @param actorRef The actor to stop.
 */
export function stopChild<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
>(
	actorRef: ResolvableActorRef<TContext, TExpressionEvent, TParams, TEvent>,
): StopAction<TContext, TExpressionEvent, TParams, TEvent> {
	function stop(_args: ActionArgs<TContext, TExpressionEvent, TEvent>, _params: TParams) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
	}

	// @ts-expect-error -- lua polyfill
	stop = callable(stop);
	stop.type = "xstate.stopChild";
	stop.actorRef = actorRef;

	stop.resolve = resolveStop;
	stop.execute = executeStop;

	return stop;
}

/**
 * Stops a child actor.
 *
 * @deprecated Use `stopChild(...)` instead
 * @alias
 */
export const stop = stopChild;
