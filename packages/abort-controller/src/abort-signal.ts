import { Error } from "@rbxts/luau-polyfill";
import {
  Event,
  EventTarget,
  defineEventAttribute,
} from "@rbxts/whatwg-event-target";

type Events = {
  abort: Event<"abort">;
};
type EventAttributes = {
  onabort: Event<"abort">;
};

/**
 * The signal class.
 *
 * @see https://dom.spec.whatwg.org/#abortsignal
 */
export default class AbortSignal
  extends EventTarget<Events>
  implements EventAttributes
{
  onabort: Event<"abort">;

  /** AbortSignal cannot be constructed directly. */
  public constructor() {
    super();
    throw new Error("AbortSignal cannot be constructed directly");
  }

  /**
   * Returns `true` if this `AbortSignal`'s `AbortController` has signaled to
   * abort, and `false` otherwise.
   */
  public getAborted(): boolean {
    const aborted = abortedFlags.get(this);
    if (!typeIs(aborted, "boolean")) {
      throw new Error(
        `Expected 'this' to be an 'AbortSignal' object, but got ${this}`,
      );
    }
    return aborted;
  }
}
defineEventAttribute(getmetatable(abortSignal) as AbortSignal, "abort");

const eventTargetConstructor = (
  getmetatable(EventTarget) as LuaMetatable<EventTarget>
)["__index"]!["constructor" as never] as Callback;

/** Create an AbortSignal object. */
export function createAbortSignal(): AbortSignal {
  const signal = setmetatable({}, AbortSignal as never) as AbortSignal;
  eventTargetConstructor(signal);
  abortedFlags.set(signal, false);
  return signal;
}

/** Abort a given signal. */
export function abortSignal(signal: AbortSignal): void {
  if (abortedFlags.get(signal) !== false) {
    return;
  }

  abortedFlags.set(signal, true);
  signal.dispatchEvent({ type: "abort" } as never);
}

/** Aborted flag for each instances. */
const abortedFlags = new WeakMap<AbortSignal, boolean>();
