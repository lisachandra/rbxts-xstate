import { Error } from "@rbxts/luau-polyfill";
import { EventObject } from "../../types";
import { toArray } from "utils/polyfill/array";
import { JSON } from "utils/polyfill/json";

/**
 * Asserts that the given event object is of the specified type or types. Throws
 * an error if the event object is not of the specified types.
 *
 * @example
 *
 * ```ts
 * // ...
 * entry: ({ event }) => {
 *   assertEvent(event, 'doNothing');
 *   // event is { type: 'doNothing' }
 * },
 * // ...
 * exit: ({ event }) => {
 *   assertEvent(event, 'greet');
 *   // event is { type: 'greet'; message: string }
 *
 *   assertEvent(event, ['greet', 'notify']);
 *   // event is { type: 'greet'; message: string }
 *   // or { type: 'notify'; message: string; level: 'info' | 'error' }
 * },
 * ```
 */
export function assertEvent<TEvent extends EventObject, TAssertedType extends TEvent["type"]>(
	event: TEvent,
	kind: TAssertedType | TAssertedType[],
): asserts event is TEvent & { type: TAssertedType } {
	const types = toArray(kind);
	if (!types.includes(event.type as never)) {
		const typesText =
			types.size() === 1 ? `type "${types[0]}"` : `one of types "${types.join('", "')}"`;
		throw new Error(`Expected event ${JSON.stringify(event)} to have ${typesText}`);
	}
}
