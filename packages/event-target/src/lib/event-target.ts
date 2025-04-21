import { Event, getEventInternalData } from "./event";
import { createListener, invokeCallback, isCapture, Listener, setRemoved } from "./listener";
import { Signal } from "@rbxts/lemon-signal";
import { Error } from "@rbxts/luau-polyfill";
import { assertType, format } from "./misc";
import { InvalidEventListener } from "./warnings";

/**
 * An implementation of the `EventTarget` interface.
 *
 * @see https://dom.spec.whatwg.org/#eventtarget
 */
export class EventTarget<
	TEventMap extends Record<string, Event> = Record<string, Event>,
	TMode extends "standard" | "strict" = "standard",
> {
	/** Initialize this instance. */
	constructor() {
		internalDataMap.set(this, new Map());
	}

	/**
	 * Add an event listener.
	 *
	 * @param type The event type.
	 * @param callback The event listener.
	 * @param options Options.
	 */
	addEventListener<T extends string & keyof TEventMap>(
		type: T,
		callback?: EventTarget.EventListener<this, TEventMap[T]>,
		options?: EventTarget.AddOptions,
	): void;

	/**
	 * Add an event listener.
	 *
	 * @param type The event type.
	 * @param callback The event listener.
	 * @param options Options.
	 */
	addEventListener(
		type: string,
		callback?: EventTarget.FallbackEventListener<this, TMode>,
		options?: EventTarget.AddOptions,
	): void;

	/**
	 * Add an event listener.
	 *
	 * @deprecated Use `{capture: boolean}` object instead of a boolean value.
	 * @param type The event type.
	 * @param callback The event listener.
	 * @param capture The capture flag.
	 */
	addEventListener<T extends string & keyof TEventMap>(
		type: T,
		callback: EventTarget.EventListener<this, TEventMap[T]> | undefined,
		capture: boolean,
	): void;

	/**
	 * Add an event listener.
	 *
	 * @deprecated Use `{capture: boolean}` object instead of a boolean value.
	 * @param type The event type.
	 * @param callback The event listener.
	 * @param capture The capture flag.
	 */
	addEventListener(
		type: string,
		callback: EventTarget.FallbackEventListener<this, TMode>,
		capture: boolean,
	): void;

	// Implementation
	addEventListener<T extends string & keyof TEventMap>(
		type0: T,
		callback0?: EventTarget.EventListener<this, TEventMap[T]>,
		options0?: boolean | EventTarget.AddOptions,
	): void {
		const listenerMap = _(this);
		const {
			callback,
			kind,
			capture,
			passive,
			once,
			signal: abortSignal,
		} = normalizeAddOptions(type0, callback0, options0);

		if (callback === undefined) {
			return;
		}

		let signalData = listenerMap.get(kind);
		if (!signalData) {
			signalData = {
				signal: new Signal<Event>(),
				listeners: [],
			};
			listenerMap.set(kind, signalData);
		}

		// Check for duplicate listeners
		const duplicate = signalData.listeners.find(
			listener => listener.callback === callback && isCapture(listener) === capture,
		);

		if (duplicate) {
			return;
		}

		const connection = signalData.signal.Connect((event: Event) => {
			if (passive && event.preventDefault) {
				// Throw an error if preventDefault is called in a passive event listener
				event.preventDefault = () => {
					throw new Error("preventDefault() called inside passive event listener"); // Spec-compliant error
				};
			}

			invokeCallback({ callback } as never, this, event);

			if (once) {
				this.removeEventListener(kind, callback as never, options0 as never);
			}
		});

		// eslint-disable-next-line prefer-const
		let entry: Listener;
		let abortSignalListener: Callback = undefined as never;
		if (abortSignal) {
			abortSignalListener = () => {
				entry.connection.Disconnect();
				setRemoved(entry);
				entry.signal?.removeEventListener("abort", entry.signalListener!);
				signalData.listeners.remove(signalData.listeners.indexOf(entry));
			};
			abortSignal.addEventListener("abort", abortSignalListener);
		}

		entry = createListener(
			callback,
			capture,
			passive,
			once,
			connection,
			abortSignal,
			abortSignalListener,
		);
		signalData.listeners.push(entry);
	}

	/**
	 * Remove an added event listener.
	 *
	 * @param type The event type.
	 * @param callback The event listener.
	 * @param options Options.
	 */
	removeEventListener<T extends string & keyof TEventMap>(
		type: T,
		callback?: EventTarget.EventListener<this, TEventMap[T]>,
		options?: EventTarget.Options,
	): void;

	/**
	 * Remove an added event listener.
	 *
	 * @param type The event type.
	 * @param callback The event listener.
	 * @param options Options.
	 */
	removeEventListener(
		type: string,
		callback?: EventTarget.FallbackEventListener<this, TMode>,
		options?: EventTarget.Options,
	): void;

	/**
	 * Remove an added event listener.
	 *
	 * @deprecated Use `{capture: boolean}` object instead of a boolean value.
	 * @param type The event type.
	 * @param callback The event listener.
	 * @param capture The capture flag.
	 */
	removeEventListener<T extends string & keyof TEventMap>(
		type: T,
		callback: EventTarget.EventListener<this, TEventMap[T]> | undefined,
		capture: boolean,
	): void;

	/**
	 * Remove an added event listener.
	 *
	 * @deprecated Use `{capture: boolean}` object instead of a boolean value.
	 * @param type The event type.
	 * @param callback The event listener.
	 * @param capture The capture flag.
	 */
	removeEventListener(
		type: string,
		callback: EventTarget.FallbackEventListener<this, TMode>,
		capture: boolean,
	): void;

	// Implementation
	removeEventListener<T extends string & keyof TEventMap>(
		type0: T,
		callback0?: EventTarget.EventListener<this, TEventMap[T]>,
		options0?: boolean | EventTarget.Options,
	): void {
		const listenerMap = _(this);
		const { callback, kind: kind } = normalizeOptions(type0, callback0, options0);
		const signalData = listenerMap.get(kind);

		if (signalData && callback) {
			let index: number = undefined as never;
			const entry = signalData.listeners.find((entry, i) => {
				index = i;
				return entry.callback === callback;
			});
			if (entry && index) {
				entry.connection.Disconnect();
				setRemoved(entry);
				entry.signal?.removeEventListener("abort", entry.signalListener!);
				signalData.listeners.remove(index);
			}
		}
	}

	/**
	 * Dispatch an event.
	 *
	 * @param event The `Event` object to dispatch.
	 */
	dispatchEvent<T extends string & keyof TEventMap>(
		event: EventTarget.EventData<TEventMap, TMode, T>,
	): boolean;

	/**
	 * Dispatch an event.
	 *
	 * @param event The `Event` object to dispatch.
	 */
	dispatchEvent(event: EventTarget.FallbackEvent<TMode>): boolean;

	// Implementation
	dispatchEvent(
		e: EventTarget.EventData<TEventMap, TMode, string> | EventTarget.FallbackEvent<TMode>,
	): boolean {
		const signalData = _(this).get(string.lower(e.type()));
		if (!signalData) {
			return true;
		}

		// 1. Capture Phase: Invoke capture listeners on this EventTarget
		for (const listener of signalData.listeners) {
			if (isCapture(listener)) {
				invokeCallback({ callback: listener.callback } as never, this, e);
				if (getEventInternalData(e).stopImmediatePropagationFlag) return false;
			}
		}

		// 2. Invoke listeners on the target
		signalData.signal.Fire(e);

		// Bubbling is not relevant for this shim
		return true;
	}
}

export namespace EventTarget {
	/** The event listener. */
	export type EventListener<TEventTarget extends EventTarget<any, any>, TEvent extends Event> =
		| CallbackFunction<TEventTarget, TEvent>
		| CallbackObject<TEvent>;

	/** The event listener function. */
	export interface CallbackFunction<
		TEventTarget extends EventTarget<any, any>,
		TEvent extends Event,
	> {
		(self: TEventTarget, event?: TEvent): void;
	}

	/**
	 * The event listener object.
	 *
	 * @see https://dom.spec.whatwg.org/#callbackdef-eventlistener
	 */
	export interface CallbackObject<TEvent extends Event> {
		handleEvent(event: TEvent): void;
	}

	/**
	 * The common options for both `addEventListener` and `removeEventListener`
	 * methods.
	 *
	 * @see https://dom.spec.whatwg.org/#dictdef-eventlisteneroptions
	 */
	export interface Options {
		capture?: boolean;
	}

	/**
	 * The options for the `addEventListener` methods.
	 *
	 * @see https://dom.spec.whatwg.org/#dictdef-addeventlisteneroptions
	 */
	export interface AddOptions extends Options {
		passive?: boolean;
		once?: boolean;
		signal?: AbortSignal | undefined;
	}

	/**
	 * The abort signal.
	 *
	 * @see https://dom.spec.whatwg.org/#abortsignal
	 */
	export interface AbortSignal extends EventTarget<{ abort: Event }> {
		readonly aborted: boolean;
		onabort: CallbackFunction<this, Event> | undefined;
	}

	/** The event data to dispatch in strict mode. */
	export type EventData<
		TEventMap extends Record<string, Event>,
		TMode extends "standard" | "strict",
		TEventType extends string,
	> = TMode extends "strict"
		? IsValidEventMap<TEventMap> extends true
			? ExplicitType<TEventType> &
					Omit<TEventMap[TEventType], keyof Event> &
					Partial<Omit<Event, "type">>
			: never
		: never;

	/**
	 * Define explicit `type` property if `T` is a string literal. Otherwise,
	 * never.
	 */
	export type ExplicitType<T extends string> = string extends T ? never : { readonly type: T };

	/** The event listener type in standard mode. Otherwise, never. */
	export type FallbackEventListener<
		TEventTarget extends EventTarget<any, any>,
		TMode extends "standard" | "strict",
	> = TMode extends "standard" ? EventListener<TEventTarget, Event> | undefined : never;

	/** The event type in standard mode. Otherwise, never. */
	export type FallbackEvent<TMode extends "standard" | "strict"> = TMode extends "standard"
		? Event
		: never;

	/**
	 * Check if given event map is valid. It's valid if the keys of the event
	 * map are narrower than `string`.
	 */
	export type IsValidEventMap<T> = string extends keyof T ? false : true;
}

export { _ as getEventTargetInternalData };

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

export interface SignalData {
	/** The callback function of the event attribute handler. */
	attrCallback?: Listener.CallbackFunction<any, any>;
	/** The listener of the event attribute handler. */
	attrListener?: Listener;
	/** Signal for the event. */
	signal: Signal<Event>;
	/** The listeners. */
	listeners: Listener[];
}

type EventTargetInternalData = Map<string, SignalData>;

/** Internal data. */
const internalDataMap = new WeakMap<any, EventTargetInternalData>();

/**
 * Get private data.
 *
 * @param target The event target object to get private data.
 * @param name The variable name to report.
 * @returns The private data of the event.
 */
function _(target: any, name = "this"): EventTargetInternalData {
	const retv = internalDataMap.get(target);
	assertType(
		retv !== undefined,
		"'%s' must be an object that EventTarget constructor created, but got another one: %o",
		name,
		target,
	);
	return retv;
}

/**
 * Normalize options.
 *
 * @param options The options to normalize.
 */
function normalizeAddOptions(
	kind: string,
	callback: EventTarget.EventListener<any, any> | undefined,
	options: boolean | EventTarget.AddOptions | undefined,
): {
	kind: string;
	callback: EventTarget.EventListener<any, any> | undefined;
	capture: boolean;
	passive: boolean;
	once: boolean;
	signal: EventTarget.AbortSignal | undefined;
} {
	assertCallback(callback);

	if (typeIs(options, "table")) {
		return {
			kind: string.lower(kind),
			callback: callback ?? undefined,
			capture: !!options.capture,
			passive: !!options.passive,
			once: !!options.once,
			signal: options.signal ?? undefined,
		};
	}

	return {
		kind: string.lower(kind),
		callback: callback ?? undefined,
		capture: !!options,
		passive: false,
		once: false,
		signal: undefined,
	};
}

/**
 * Normalize options.
 *
 * @param options The options to normalize.
 */
function normalizeOptions(
	kind: string,
	callback: EventTarget.EventListener<any, any> | undefined,
	options: boolean | EventTarget.Options | undefined,
): {
	kind: string;
	callback: EventTarget.EventListener<any, any> | undefined;
	capture: boolean;
} {
	assertCallback(callback);

	if (typeIs(options, "table")) {
		return {
			kind: string.lower(kind),
			callback: callback ?? undefined,
			capture: !!options.capture,
		};
	}

	return {
		kind: string.lower(kind),
		callback: callback ?? undefined,
		capture: !!options,
	};
}

/**
 * Assert the type of 'callback' argument.
 *
 * @param callback The callback to check.
 */
function assertCallback(callback: unknown): void {
	if (typeIs(callback, "function")) {
		return;
	}
	if (callback === undefined || typeIs(callback, "table")) {
		InvalidEventListener.warn(callback);
		return;
	}

	throw new Error(format(InvalidEventListener.message, [callback]));
}
