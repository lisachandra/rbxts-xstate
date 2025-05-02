import { String } from "@rbxts/luau-polyfill";
import type { AnyEventObject, ErrorActorEvent } from "types";

export function isErrorActorEvent(event: AnyEventObject): event is ErrorActorEvent {
	return String.startsWith(event.type, "xstate.error.actor");
}
