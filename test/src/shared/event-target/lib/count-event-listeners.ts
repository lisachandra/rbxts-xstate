import { Object } from "@rbxts/luau-polyfill";
import { EventTarget, getEventTargetInternalData } from "@rbxts/whatwg-event-target";

/**
 * Get registered event listeners from an `EventTarget` object.
 *
 * @param target The `EventTarget` object to get.
 * @param kind The type of events to get.
 */
export function countEventListeners(target: EventTarget<any, any>, kind?: string): number {
	const listenerMap = getEventTargetInternalData(target, "target");
	const keys = kind ? [kind] : Object.keys(listenerMap);
	return keys.reduce((count, key) => count + (listenerMap.get(key)?.listeners.size() ?? 0), 0);
}
