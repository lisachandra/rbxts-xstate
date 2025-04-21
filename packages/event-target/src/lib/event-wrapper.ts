import { Object } from "@rbxts/luau-polyfill";
import { Event } from "./event";
import { assertType } from "./misc";
import { bind } from "./bind";
import { defineProperty } from "./getset";

/**
 * An implementation of `Event` interface, that wraps a given event object. This
 * class controls the internal state of `Event`.
 *
 * @see https://dom.spec.whatwg.org/#interface-event
 */
export class EventWrapper<TEventType extends string> extends Event<TEventType> {
	/**
	 * Wrap a given event object to control states.
	 *
	 * @param event The event-like object to wrap.
	 */
	static wrap<T extends EventLike>(event: T): EventWrapperOf<T> {
		return new (getWrapperClassOf(event))(event);
	}

	protected constructor(event: Event<TEventType>) {
		super(event.type(), {
			bubbles: event.bubbles(),
			cancelable: event.cancelable(),
			composed: event.composed(),
		});

		if (event.cancelBubble()) {
			super.stopPropagation();
		}
		if (event.defaultPrevented()) {
			super.preventDefault();
		}

		internalDataMap.set(this, { original: event });

		// Define accessors
		const keys = Object.keys(event);
		for (let i = 0; i < keys.size(); ++i) {
			const key = keys[i];
			if (!(key in this)) {
				defineProperty(this, key, defineRedirectDescriptor(event, key));
			}
		}
	}

	stopPropagation(): void {
		super.stopPropagation();

		const { original } = _(this);
		if ("stopPropagation" in original) {
			original.stopPropagation!();
		}
	}

	cancelBubble(): boolean {
		return super.cancelBubble();
	}
	setCancelBubble(value: boolean) {
		super.setCancelBubble(value);

		const { original } = _(this);
		if ("cancelBubble" in original) {
			original.setCancelBubble!(value);
		}
	}

	stopImmediatePropagation(): void {
		super.stopImmediatePropagation();

		const { original } = _(this);
		if ("stopImmediatePropagation" in original) {
			original.stopImmediatePropagation!();
		}
	}

	returnValue(): boolean {
		return super.returnValue();
	}

	setReturnValue(value: boolean) {
		super.setReturnValue(value);

		const { original } = _(this);
		if ("returnValue" in original) {
			original.setReturnValue!(value);
		}
	}

	preventDefault(): void {
		super.preventDefault();

		const { original } = _(this);
		if ("preventDefault" in original) {
			original.preventDefault!();
		}
	}

	timeStamp(): number {
		const { original } = _(this);
		if ("timeStamp" in original) {
			return original.timeStamp!();
		}
		return super.timeStamp();
	}
}

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

type EventLike = { readonly type: () => string } & Partial<Event>;
type EventWrapperOf<T extends EventLike> = Event<ReturnType<T["type"]>> & Omit<T, keyof Event>;

interface EventWrapperInternalData {
	readonly original: EventLike;
}

/** Private data for event wrappers. */
const internalDataMap = new WeakMap<any, EventWrapperInternalData>();

/**
 * Get private data.
 *
 * @param event The event object to get private data.
 * @returns The private data of the event.
 */
function _(event: unknown): EventWrapperInternalData {
	const retv = internalDataMap.get(event);
	assertType(retv !== undefined, "'this' is expected an Event object, but got", event);
	return retv;
}

/**
 * Cache for wrapper classes.
 *
 * @private
 * @type {WeakMap<Object, Function>}
 */
const wrapperClassCache = new WeakMap();

/**
 * Get the wrapper class of a given prototype.
 *
 * @param originalEvent The event object to wrap.
 */
function getWrapperClassOf<T extends EventLike>(
	originalEvent: T,
): { new (e: T): EventWrapperOf<T> } {
	const prototype = (getmetatable(originalEvent) as LuaMetatable<EventLike>)[
		"__index" as never
	] as EventLike;
	if (prototype === undefined) {
		return EventWrapper as any;
	}

	let wrapper: unknown = wrapperClassCache.get(prototype);
	if (wrapper === undefined) {
		wrapper = defineWrapper(getWrapperClassOf(prototype), prototype);
		wrapperClassCache.set(prototype, wrapper);
	}

	return wrapper as never;
}

/**
 * Define new wrapper class.
 *
 * @param BaseEventWrapper The base wrapper class.
 * @param originalPrototype The prototype of the original event.
 */
function defineWrapper(BaseEventWrapper: any, originalPrototype: any): any {
	class CustomEventWrapper extends BaseEventWrapper {}

	const keys = Object.keys(originalPrototype);
	for (let i = 0; i < keys.size(); ++i) {
		defineProperty(
			CustomEventWrapper,
			keys[i] as string,
			defineRedirectDescriptor(originalPrototype, keys[i] as string),
		);
	}

	return CustomEventWrapper;
}

/** Get the property descriptor to redirect a given property. */
function defineRedirectDescriptor(_obj: any, key: string) {
	return {
		get() {
			const original: unknown = _(this).original;
			const value = (original as never)[key];
			if (typeIs(value, "function")) {
				return bind(value, original);
			}
			return value;
		},
		set(value: any) {
			const original: unknown = _(this).original;
			(original as never)[key as never] = value as never;
		},
	};
}
