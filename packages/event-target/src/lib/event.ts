import { EventTarget } from "./event-target"; // Used as only type, so no circular.
import { assertType } from "./misc";
import {
	CanceledInPassiveListener,
	FalsyWasAssignedToCancelBubble,
	InitEventWasCalledWhileDispatching,
	NonCancelableEventWasCanceled,
	TruthyWasAssignedToReturnValue,
} from "./warnings";

/**
 * An implementation of `Event` interface, that wraps a given event object.
 * `EventTarget` shim can control the internal state of this `Event` objects.
 *
 * @see https://dom.spec.whatwg.org/#event
 */
export class Event<TEventType extends string = string> {
	/** @see https://dom.spec.whatwg.org/#dom-event-none */
	static NONE(): number {
		return NONE;
	}

	/** @see https://dom.spec.whatwg.org/#dom-event-capturing_phase */
	static CAPTURING_PHASE(): number {
		return CAPTURING_PHASE;
	}

	/** @see https://dom.spec.whatwg.org/#dom-event-at_target */
	static AT_TARGET(): number {
		return AT_TARGET;
	}

	/** @see https://dom.spec.whatwg.org/#dom-event-bubbling_phase */
	static BUBBLING_PHASE(): number {
		return BUBBLING_PHASE;
	}

	/**
	 * Initialize this event instance.
	 *
	 * @param kind The type of this event.
	 * @param eventInitDict Options to initialize.
	 * @see https://dom.spec.whatwg.org/#dom-event-event
	 */
	constructor(kind: TEventType, eventInitDict?: Event.EventInit) {
		const opts = eventInitDict ?? {};
		internalDataMap.set(this, {
			kind: string.lower(kind),
			bubbles: !!opts.bubbles,
			cancelable: !!opts.cancelable,
			composed: !!opts.composed,
			target: undefined,
			currentTarget: undefined,
			stopPropagationFlag: false,
			stopImmediatePropagationFlag: false,
			canceledFlag: false,
			inPassiveListenerFlag: false,
			dispatchFlag: false,
			timeStamp: os.clock(),
		});
	}

	/**
	 * The type of this event.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-type
	 */
	type(): TEventType {
		return _(this).kind as TEventType;
	}

	/**
	 * The event target of the current dispatching.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-target
	 */
	target(): EventTarget | undefined {
		return _(this).target;
	}

	/**
	 * The event target of the current dispatching.
	 *
	 * @deprecated Use the `target` property instead.
	 * @see https://dom.spec.whatwg.org/#dom-event-srcelement
	 */
	srcElement(): EventTarget | undefined {
		return _(this).target;
	}

	/**
	 * The event target of the current dispatching.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-currenttarget
	 */
	currentTarget(): EventTarget | undefined {
		return _(this).currentTarget;
	}

	/**
	 * The event target of the current dispatching. This doesn't support node
	 * tree.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-composedpath
	 */
	composedPath(): EventTarget[] {
		const currentTarget = _(this).currentTarget;
		if (currentTarget) {
			return [currentTarget];
		}
		return [];
	}

	/**
	 * The current event phase.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-eventphase
	 */
	eventPhase(): number {
		return _(this).dispatchFlag ? 2 : 0;
	}

	/**
	 * Stop event bubbling. Because this shim doesn't support node tree, this
	 * merely changes the `cancelBubble` property value.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-stoppropagation
	 */
	stopPropagation(): void {
		_(this).stopPropagationFlag = true;
	}

	/**
	 * `true` if event bubbling was stopped.
	 *
	 * @deprecated
	 * @see https://dom.spec.whatwg.org/#dom-event-cancelbubble
	 */
	cancelBubble(): boolean {
		return _(this).stopPropagationFlag;
	}

	/**
	 * Stop event bubbling if `true` is set.
	 *
	 * @deprecated Use the `stopPropagation()` method instead.
	 * @see https://dom.spec.whatwg.org/#dom-event-cancelbubble
	 */
	setCancelBubble(value: boolean) {
		if (value) {
			_(this).stopPropagationFlag = true;
		} else {
			FalsyWasAssignedToCancelBubble.warn();
		}
	}

	/**
	 * Stop event bubbling and subsequent event listener callings.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-stopimmediatepropagation
	 */
	stopImmediatePropagation(): void {
		const data = _(this);
		data.stopPropagationFlag = data.stopImmediatePropagationFlag = true;
	}

	/**
	 * `true` if this event will bubble.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-bubbles
	 */
	bubbles(): boolean {
		return _(this).bubbles;
	}

	/**
	 * `true` if this event can be canceled by the `preventDefault()` method.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-cancelable
	 */
	cancelable(): boolean {
		return _(this).cancelable;
	}

	/**
	 * `true` if the default behavior will act.
	 *
	 * @deprecated Use the `defaultPrevented` proeprty instead.
	 * @see https://dom.spec.whatwg.org/#dom-event-returnvalue
	 */
	returnValue(): boolean {
		return !_(this).canceledFlag;
	}

	/**
	 * Cancel the default behavior if `false` is set.
	 *
	 * @deprecated Use the `preventDefault()` method instead.
	 * @see https://dom.spec.whatwg.org/#dom-event-returnvalue
	 */
	setReturnValue(value: boolean) {
		if (!value) {
			setCancelFlag(_(this));
		} else {
			TruthyWasAssignedToReturnValue.warn();
		}
	}

	/**
	 * Cancel the default behavior.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-preventdefault
	 */
	preventDefault(): void {
		setCancelFlag(_(this));
	}

	/**
	 * `true` if the default behavior was canceled.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-event-defaultprevented
	 */
	defaultPrevented(): boolean {
		return _(this).canceledFlag;
	}

	/** @see https://dom.spec.whatwg.org/#dom-event-composed */
	composed(): boolean {
		return _(this).composed;
	}

	/** @see https://dom.spec.whatwg.org/#dom-event-istrusted */
	//istanbul ignore next
	isTrusted(): boolean {
		return false;
	}

	/** @see https://dom.spec.whatwg.org/#dom-event-timestamp */
	timeStamp(): number {
		return _(this).timeStamp;
	}

	/** @deprecated Don't use this method. The constructor did initialization. */
	initEvent(kind: string, bubbles = false, cancelable = false) {
		const data = _(this);
		if (data.dispatchFlag) {
			InitEventWasCalledWhileDispatching.warn();
			return;
		}

		internalDataMap.set(this, {
			...data,
			kind: string.lower(kind),
			bubbles: !!bubbles,
			cancelable: !!cancelable,
			target: undefined,
			currentTarget: undefined,
			stopPropagationFlag: false,
			stopImmediatePropagationFlag: false,
			canceledFlag: false,
		});
	}
}

export namespace Event {
	/**
	 * The options of the `Event` constructor.
	 *
	 * @see https://dom.spec.whatwg.org/#dictdef-eventinit
	 */
	export interface EventInit {
		bubbles?: boolean;
		cancelable?: boolean;
		composed?: boolean;
	}
}

export { _ as getEventInternalData };

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const NONE = 0;
const CAPTURING_PHASE = 1;
const AT_TARGET = 2;
const BUBBLING_PHASE = 3;

/** Private data. */
interface EventInternalData {
	/** The value of `type` attribute. */
	readonly kind: string;
	/** The value of `bubbles` attribute. */
	readonly bubbles: boolean;
	/** The value of `cancelable` attribute. */
	readonly cancelable: boolean;
	/** The value of `composed` attribute. */
	readonly composed: boolean;
	/** The value of `timeStamp` attribute. */
	readonly timeStamp: number;

	/** @see https://dom.spec.whatwg.org/#dom-event-target */
	target: EventTarget | undefined;
	/** @see https://dom.spec.whatwg.org/#dom-event-currenttarget */
	currentTarget: EventTarget | undefined;
	/** @see https://dom.spec.whatwg.org/#stop-propagation-flag */
	stopPropagationFlag: boolean;
	/** @see https://dom.spec.whatwg.org/#stop-immediate-propagation-flag */
	stopImmediatePropagationFlag: boolean;
	/** @see https://dom.spec.whatwg.org/#canceled-flag */
	canceledFlag: boolean;
	/** @see https://dom.spec.whatwg.org/#in-passive-listener-flag */
	inPassiveListenerFlag: boolean;
	/** @see https://dom.spec.whatwg.org/#dispatch-flag */
	dispatchFlag: boolean;
}

/** Private data for event wrappers. */
const internalDataMap = new WeakMap<any, EventInternalData>();

/**
 * Get private data.
 *
 * @param event The event object to get private data.
 * @param name The variable name to report.
 * @returns The private data of the event.
 */
function _(event: unknown, name = "this"): EventInternalData {
	const retv = internalDataMap.get(event);
	assertType(
		retv !== undefined,
		"'%s' must be an object that Event constructor created, but got another one: %o",
		name,
		event,
	);
	return retv;
}

/**
 * https://dom.spec.whatwg.org/#set-the-canceled-flag
 *
 * @param data Private data.
 */
function setCancelFlag(data: EventInternalData) {
	if (data.inPassiveListenerFlag) {
		CanceledInPassiveListener.warn();
		return;
	}
	if (!data.cancelable) {
		NonCancelableEventWasCanceled.warn();
		return;
	}

	data.canceledFlag = true;
}
