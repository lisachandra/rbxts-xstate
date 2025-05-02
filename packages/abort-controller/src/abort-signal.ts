import { Error } from "@rbxts/luau-polyfill";
import {
	Event,
	EventTarget,
	getEventAttributeValue,
	setEventAttributeValue,
} from "@rbxts/whatwg-event-target";

type Events = {
	// abort: Event<"abort">;
	abort: any;
};
type EventAttributes = {
	// getOnabort(): Event<"abort">;
	getOnabort(): any;
};

/**
 * The signal class.
 *
 * @see https://dom.spec.whatwg.org/#abortsignal
 */
export default class AbortSignal extends EventTarget<Events> implements EventAttributes {
	/** AbortSignal cannot be constructed directly. */
	public constructor() {
		super();
		throw new Error("AbortSignal cannot be constructed directly");
	}

	public getOnabort() {
		return getEventAttributeValue<EventTarget.AbortSignal, Event>(this as never, "abort") as
			| EventTarget.CallbackFunction<this, Event>
			| undefined;
	}

	public setOnabort(value: any) {
		setEventAttributeValue(this, "abort", value);
	}

	/**
	 * Returns `true` if this `AbortSignal`'s `AbortController` has signaled to
	 * abort, and `false` otherwise.
	 */
	public getAborted(): boolean {
		const aborted = _(this).aborted;
		if (!typeIs(aborted, "boolean")) {
			throw new Error(`Expected 'this' to be an 'AbortSignal' object, but got ${this}`);
		}
		return aborted;
	}
}

interface AbortSignalInternalData {
	aborted?: boolean;
}

const internalDataMap = new WeakMap<any, AbortSignalInternalData>();

function _(event: unknown) {
	internalDataMap.set(event, internalDataMap.get(event) ?? {});
	return internalDataMap.get(event)!;
}

const eventTargetConstructor = EventTarget["constructor" as never] as Callback;

/** Create an AbortSignal object. */
export function createAbortSignal(): AbortSignal {
	const signal = setmetatable({}, AbortSignal as never) as AbortSignal;
	eventTargetConstructor(signal);
	_(signal).aborted = false;
	return signal;
}

/** Abort a given signal. */
export function abortSignal(signal: AbortSignal): void {
	if (_(signal).aborted !== false) {
		return;
	}

	_(signal).aborted = true;
	signal.dispatchEvent({ type: () => "abort" } as never);
}
