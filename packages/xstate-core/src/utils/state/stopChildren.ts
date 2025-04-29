import { Object } from "@rbxts/luau-polyfill";
import { stopChild } from "actions";
import { AnyMachineSnapshot, AnyEventObject, AnyActorScope } from "types";
import { resolveActionsAndContext } from "./resolveActionsAndContext";

export function stopChildren(
	nextState: AnyMachineSnapshot,
	event: AnyEventObject,
	actorScope: AnyActorScope,
) {
	return resolveActionsAndContext(
		nextState,
		event,
		actorScope,
		Object.values((nextState as object)["children" as never] as defined[]).map((child: any) =>
			stopChild(child),
		),
		[],
		undefined,
	);
}
