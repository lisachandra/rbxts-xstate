import { Error } from "@rbxts/luau-polyfill";
import AbortSignal, { abortSignal, createAbortSignal } from "./abort-signal";

/**
 * The AbortController.
 *
 * @see https://dom.spec.whatwg.org/#abortcontroller
 */
export default class AbortController {
	/** Initialize this controller. */
	public constructor() {
		signals.set(this, createAbortSignal());
	}

	/** Returns the `AbortSignal` object associated with this object. */
	public getSignal(): AbortSignal {
		return getSignal(this);
	}

	/**
	 * Abort and signal to any observers that the associated activity is to be
	 * aborted.
	 */
	public abort(): void {
		abortSignal(getSignal(this));
	}
}

/** Associated signals. */
const signals = new WeakMap<AbortController, AbortSignal>();

/** Get the associated signal of a given controller. */
function getSignal(controller: AbortController): AbortSignal {
	const signal = signals.get(controller);
	if (signal === undefined) {
		throw new Error(`Expected 'this' to be an 'AbortController' object, but got ${controller}`);
	}
	return signal;
}

export { AbortController, AbortSignal };
