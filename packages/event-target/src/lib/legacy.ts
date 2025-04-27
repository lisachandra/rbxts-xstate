import { Event } from "./event";
import { getEventAttributeValue, setEventAttributeValue } from "./event-attribute-handler";
import { EventTarget } from "./event-target";
import { defineProperty } from "./getset";

/**
 * Define an `EventTarget` class that has event attibutes.
 *
 * @deprecated Use `getEventAttributeValue`/`setEventAttributeValue` pair on
 *   your derived class instead because of static analysis friendly.
 * @param types The types to define event attributes.
 */
export function defineCustomEventTarget<
	TEventMap extends Record<string, Event>,
	TMode extends "standard" | "strict" = "standard",
>(
	...types: (string & keyof TEventMap)[]
): defineCustomEventTarget.CustomEventTargetConstructor<TEventMap, TMode> {
	class CustomEventTarget extends EventTarget {
		constructor() {
			super();
			for (let i = 0; i < types.size(); ++i) {
				defineEventAttribute(this, types[i]);
			}
		}
	}

	return CustomEventTarget as any;
}

export namespace defineCustomEventTarget {
	/** The interface of CustomEventTarget constructor. */
	export type CustomEventTargetConstructor<
		TEventMap extends Record<string, Event>,
		TMode extends "standard" | "strict",
	> = {
		/** Create a new instance. */
		new (): CustomEventTarget<TEventMap, TMode>;
		/** Prototype object. */
		prototype: CustomEventTarget<TEventMap, TMode>;
	};

	/** The interface of CustomEventTarget. */
	export type CustomEventTarget<
		TEventMap extends Record<string, Event>,
		TMode extends "standard" | "strict",
	> = EventTarget<TEventMap, TMode> & defineEventAttribute.EventAttributes<any, TEventMap>;
}

/**
 * Define an event attribute.
 *
 * @deprecated Use `getEventAttributeValue`/`setEventAttributeValue` pair on
 *   your derived class instead because of static analysis friendly.
 * @param target The `EventTarget` object to define an event attribute.
 * @param kind The event type to define.
 * @param _eventClass Unused, but to infer `Event` class type.
 */
export function defineEventAttribute<
	TEventTarget extends EventTarget,
	TEventType extends string,
	TEventConstrucor extends typeof Event,
>(
	target: TEventTarget,
	kind: TEventType,
	_eventClass?: TEventConstrucor,
): asserts target is TEventTarget &
	defineEventAttribute.EventAttributes<
		TEventTarget,
		Record<TEventType, InstanceType<TEventConstrucor>>
	> {
	defineProperty(target, `on${kind}`, {
		get() {
			return (getEventAttributeValue as Callback)(target, kind);
		},
		set(value) {
			(setEventAttributeValue as Callback)(target, kind, value);
		},
	});
}

export namespace defineEventAttribute {
	/** Definition of event attributes. */
	export type EventAttributes<
		TEventTarget extends EventTarget<any, any>,
		TEventMap extends Record<string, Event>,
	> = {
		[P in string & keyof TEventMap as `on${P}`]:
			| EventTarget.CallbackFunction<TEventTarget, TEventMap[P]>
			| undefined;
	};
}
