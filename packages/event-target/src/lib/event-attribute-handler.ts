import { Event } from "./event";
import { EventTarget, getEventTargetInternalData, SignalData } from "./event-target";
import { createListener, invokeCallback, setRemoved } from "./listener";
import { InvalidAttributeHandler } from "./warnings";

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
	return listMap.get(kind)?.attrCallback ?? undefined;
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
	if (callback !== undefined && typeIs(callback, "function")) {
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
	const listenerMap = getEventTargetInternalData(target, "target");
	const typeString = string.lower(kind);
	const signalData = listenerMap.get(typeString);

	if (!signalData) {
		// should not happen, but handle it anyway
		return;
	}
	signalData.attrCallback = callback;
	if (signalData.attrListener) {
		return;
	}
	const connection = signalData.signal.Connect((event: Event) => {
		invokeCallback({ callback } as never, target, event);
	});
	signalData.attrListener = createListener(
		defineEventAttributeCallback(signalData),
		false,
		false,
		false,
		connection,
		undefined,
		undefined,
	);
}
/**
 * Remove the given event attribute handler.
 *
 * @param target The `EventTarget` object to remove.
 * @param kind The event type.
 * @param callback The event listener.
 */
function removeEventAttributeListener(target: EventTarget<any, any>, kind: string): void {
	const listenerMap = getEventTargetInternalData(target, "target");
	const typeString = string.lower(kind);
	const signalData = listenerMap.get(typeString);

	const entry = signalData?.attrListener;
	const list = signalData?.listeners;
	if (!signalData || !entry || !list) {
		// should not happen, but handle it anyway
		return;
	}

	entry.connection.Disconnect();
	setRemoved(entry);
	entry.signal?.removeEventListener("abort", entry.signalListener!);
	list.remove(list.indexOf(entry));
	signalData.attrCallback = signalData.attrListener = undefined;
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
	return (itself, event) => {
		const callback = signalData.attrCallback;
		if (typeIs(callback, "function")) {
			callback(itself, event);
		}
	};
}
