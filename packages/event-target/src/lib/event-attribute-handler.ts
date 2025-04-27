import { Event } from "./event";
import { EventTarget, getEventTargetInternalData, SignalData } from "./event-target";
import { InvalidAttributeHandler } from "./warnings";
import { ensureListenerList } from "./listener-list-map";
import { addListener, removeListener } from "./listener-list";

/**
 * Get the current value of a given event attribute.
 *
 * @param target The `EventTarget` object to get.
 * @param kind The event type.
 */
export function getEventAttributeValue<
	TEventTarget extends EventTarget<any, any>,
	TEvent extends Event,
>(
	target: TEventTarget,
	kind: string,
): EventTarget.CallbackFunction<TEventTarget, TEvent> | undefined {
	const listMap = getEventTargetInternalData(target, "target");
	return listMap.get(tostring(kind))?.attrCallback ?? undefined;
}

/**
 * Set an event listener to a given event attribute.
 *
 * @param target The `EventTarget` object to set.
 * @param kind The event type.
 * @param callback The event listener.
 */
export function setEventAttributeValue(
	target: EventTarget<any, any>,
	kind: string,
	callback: EventTarget.CallbackFunction<any, any> | undefined,
): void {
	if (callback !== undefined && !typeIs(callback, "function")) {
		InvalidAttributeHandler.warn(callback);
	}

	if (typeIs(callback, "function") || (typeIs(callback, "table") && callback !== undefined)) {
		upsertEventAttributeListener(target, kind, callback);
	} else {
		removeEventAttributeListener(target, kind);
	}
}

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Update or insert the given event attribute handler.
 *
 * @param target The `EventTarget` object to set.
 * @param kind The event type.
 * @param callback The event listener.
 */
function upsertEventAttributeListener<TEventTarget extends EventTarget<any, any>>(
	target: TEventTarget,
	kind: string,
	callback: EventTarget.CallbackFunction<TEventTarget, any>,
): void {
	const list = ensureListenerList(getEventTargetInternalData(target, "target"), tostring(kind));
	list.attrCallback = callback;

	if (list.attrListener === undefined) {
		list.attrListener = addListener(
			list,
			defineEventAttributeCallback(list),
			false,
			false,
			false,
			undefined,
		);
	}
}
/**
 * Remove the given event attribute handler.
 *
 * @param target The `EventTarget` object to remove.
 * @param kind The event type.
 * @param callback The event listener.
 */
function removeEventAttributeListener(target: EventTarget<any, any>, kind: string): void {
	const listMap = getEventTargetInternalData(target, "target");
	const list = listMap.get(tostring(kind));
	if (list && list.attrListener) {
		removeListener(list, list.attrListener.callback, false);
		list.attrCallback = list.attrListener = undefined;
	}
}

/**
 * Define the callback function for the given listener list object. It calls
 * `attrCallback` property if the property value is a function.
 *
 * @param signalData The `ListenerList` object.
 */
function defineEventAttributeCallback(
	signalData: SignalData,
): EventTarget.CallbackFunction<any, any> {
	return (target, event) => {
		const callback = signalData.attrCallback;
		// Allow mocking
		if (callback !== undefined) {
			callback(target, event);
		}
	};
}
