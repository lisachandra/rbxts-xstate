import {
	Event,
	EventTarget,
	getEventAttributeValue,
	setEventAttributeValue,
} from "@rbxts/whatwg-event-target";

type AbortSignalEventMap = {
	abort: Event;
};

/** Stub for AbortSignal. */
export class AbortSignalStub extends EventTarget<AbortSignalEventMap> {
	constructor() {
		super();
		_(this).onabort = getEventAttributeValue<EventTarget.AbortSignal, Event>(
			this as never,
			"abort",
		);
	}

	public getOnabort() {
		return _(this).onabort;
	}

	public getAborted() {
		return !!_(this).aborted;
	}

	public setOnabort(value: any) {
		setEventAttributeValue(this, "abort", value);
	}

	public abort(): void {
		_(this).aborted = true;
		this.dispatchEvent(new Event("abort"));
	}
}

interface AbortSignalInternalData {
	aborted?: boolean;
	onabort?: EventTarget.CallbackFunction<EventTarget.AbortSignal, Event>;
}

const internalDataMap = new WeakMap<any, AbortSignalInternalData>();

function _(event: unknown) {
	internalDataMap.set(event, internalDataMap.get(event) ?? {});
	return internalDataMap.get(event)!;
}
