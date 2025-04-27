import { ListenerList } from "./listener-list";

/** The map from event types to each listener list. */
export type ListenerListMap = Map<string, ListenerList>;

/** Create a new `ListenerListMap` object. */
export function createListenerListMap(): ListenerListMap {
	return new Map();
}

/**
 * Get the listener list of the given type. If the listener list has not been
 * initialized, initialize and return it.
 *
 * @param listenerMap The listener list map.
 * @param kind The event type to get.
 */
export function ensureListenerList(listenerMap: ListenerListMap, kind: string): ListenerList {
	listenerMap.set(
		kind,
		listenerMap.get(kind) ?? {
			attrCallback: undefined,
			attrListener: undefined,
			cow: false,
			listeners: [],
		},
	);
	return listenerMap.get(kind)!;
}
