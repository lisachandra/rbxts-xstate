import { AnyMachineSnapshot, AnyEventObject, AnyActorScope, UnknownAction } from "types";
import { resolveAndExecuteActionsWithContext } from "./resolveAndExecuteActionsWithContext";
import { BuiltInAction } from "./types";

export function resolveActionsAndContext(
	currentSnapshot: AnyMachineSnapshot,
	event: AnyEventObject,
	actorScope: AnyActorScope,
	actions: UnknownAction[],
	internalQueue: AnyEventObject[],
	deferredActorIds: string[] | undefined,
): AnyMachineSnapshot {
	const retries: (readonly [BuiltInAction, unknown])[] | undefined = deferredActorIds
		? []
		: undefined;
	const nextState = resolveAndExecuteActionsWithContext(
		currentSnapshot,
		event,
		actorScope,
		actions,
		{ internalQueue, deferredActorIds },
		retries,
	);
	retries?.forEach(([builtinAction, params]) => {
		builtinAction.retryResolve(actorScope, nextState, params);
	});
	return nextState;
}
