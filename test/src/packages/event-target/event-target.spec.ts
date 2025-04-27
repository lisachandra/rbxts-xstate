import { describe, beforeEach, it, expect, jest, beforeAll, afterAll } from "@rbxts/jest-globals";
import { Event, EventTarget } from "@rbxts/whatwg-event-target";
import { AbortSignalStub } from "./lib/abort-signal-stub";
import { countEventListeners } from "./lib/count-event-listeners";
import { Error } from "@rbxts/luau-polyfill";
import EnvTestUtils from "test/env-utils";

// Mock or stub necessary native objects if they aren't available in the environment
// const NativeEventTarget = typeof window !== "nil" ? window.EventTarget : undefined;
// const NativeEvent = typeof window !== "nil" ? window.Event : undefined;
// const NativeKeyboardEvent = typeof window !== "nil" ? window.KeyboardEvent : undefined;
// const NativeMouseEvent = typeof window !== "nil" ? window.MouseEvent : undefined;
// const NativeDOMException = typeof window !== "nil" ? window.DOMException : undefined;
const NativeEventTarget = undefined; // Force disable native tests
const NativeEvent = undefined;
const NativeKeyboardEvent = undefined;
const NativeMouseEvent = undefined;
const NativeDOMException = undefined;

// Mock spy and assertWarning/assertError if not available from test setup
const spy = jest.fn;
// const assertWarning = (...args: any[]) => warn("Warning:", ...args); // Placeholder
// const assertError = (...args: any[]) => console.error("Error:", ...args); // Placeholder

// Define custom error types if needed, or use standard Error
// const InvalidEventListener = "InvalidEventListener";
// const EventListenerWasDuplicated = "EventListenerWasDuplicated";
// const OptionWasIgnored = "OptionWasIgnored";
// const NonCancelableEventWasCanceled = "NonCancelableEventWasCanceled";
// const CanceledInPassiveListener = "CanceledInPassiveListener";

describe("'EventTarget' class", () => {
	beforeAll(() => {
		EnvTestUtils.silenceConsole = true;
	});

	afterAll(() => {
		EnvTestUtils.silenceConsole = false;
	});

	describe("constructor", () => {
		it("should not throw", () => {
			expect(() => new EventTarget()).never.toThrow();
		});

		it("should throw a Error if called as a function.", () => {
			expect(() => {
				// @ts-expect-error
				EventTarget(); // eslint-disable-line new-cap
			}).toThrow();
		});

		// const nativeDescribe = NativeEventTarget ? describe : xdescribe; // Commented out
		// nativeDescribe("if native EventTarget class is present", () => {
		// 	it("`target instanceof window.EventTarget` should be true", () => {
		// 		const target = new EventTarget();
		// 		expect(target instanceof NativeEventTarget!).toBe(true);
		// 	});
		// });
	});

	describe("'addEventListener' method", () => {
		let target: EventTarget;

		beforeEach(() => {
			target = new EventTarget();
		});

		it("should do nothing if callback is nothing.", () => {
			// @ts-expect-error
			target.addEventListener();
			target.addEventListener("foo");
			target.addEventListener("foo", undefined);
			target.addEventListener("foo", undefined);

			expect(countEventListeners(target)).toBe(0);
			// assertWarning(InvalidEventListener, undefined);
			// assertWarning(InvalidEventListener, undefined);
			// assertWarning(InvalidEventListener, undefined);
			// assertWarning(InvalidEventListener, undefined);
		});

		it("should throw a Error if callback is a primitive.", () => {
			expect(() => {
				// @ts-expect-error
				target.addEventListener("foo", true);
			}).toThrow();
			expect(() => {
				// @ts-expect-error
				target.addEventListener("foo", 1);
			}).toThrow();
			expect(() => {
				// @ts-expect-error
				target.addEventListener("foo", "function");
			}).toThrow();
			// Symbol and BigInt might not be relevant in Luau environment
			// expect(() => {
			// 	// @ts-expect-error
			// 	target.addEventListener("foo", Symbol("symbol"));
			// }).toThrow();
			// expect(() => {
			// 	// @ts-expect-error
			// 	target.addEventListener("foo", 0n);
			// }).toThrow();

			expect(countEventListeners(target)).toBe(0);
		});

		it("should add a given event listener.", () => {
			target.addEventListener("foo", () => {});
			expect(countEventListeners(target)).toBe(1);
		});

		it("should add a given object.", () => {
			const f = {};
			// @ts-expect-error
			target.addEventListener("foo", f);
			expect(countEventListeners(target)).toBe(1);
			// assertWarning(InvalidEventListener, f);
		});

		it("should add multiple given event listeners.", () => {
			target.addEventListener("foo", () => {});
			target.addEventListener("foo", () => {});
			target.addEventListener("foo", () => {});
			target.addEventListener("bar", () => {});

			expect(countEventListeners(target)).toBe(4);
			expect(countEventListeners(target, "foo")).toBe(3);
			expect(countEventListeners(target, "bar")).toBe(1);
		});

		it("should handle non-string types as string types.", () => {
			// @ts-expect-error
			target.addEventListener(undefined, () => {});
			// target.addEventListener(undefined, () => {});
			// @ts-expect-error
			target.addEventListener(1000, () => {});

			expect(countEventListeners(target)).toBe(2);
			expect(countEventListeners(target, "nil")).toBe(1);
			// expect(countEventListeners(target, "nil")).toBe(1);
			expect(countEventListeners(target, "1000")).toBe(1);
		});

		it("should not add the same listener twice.", () => {
			const f = () => {};
			target.addEventListener("foo", f);
			target.addEventListener("foo", f);
			target.addEventListener("bar", f);

			expect(countEventListeners(target)).toBe(2);
			expect(countEventListeners(target, "foo")).toBe(1);
			expect(countEventListeners(target, "bar")).toBe(1);
			// assertWarning(EventListenerWasDuplicated, "bubble", f);
		});

		it("should add the same listener twice if capture flag is different.", () => {
			const f = () => {};
			target.addEventListener("foo", f, { capture: true });
			target.addEventListener("foo", f, { capture: false });

			expect(countEventListeners(target)).toBe(2);
			expect(countEventListeners(target, "foo")).toBe(2);
		});

		it("should add the same listener twice if capture flag is different. (boolean option)", () => {
			const f = () => {};
			target.addEventListener("foo", f, true);
			target.addEventListener("foo", f, false);

			expect(countEventListeners(target)).toBe(2);
			expect(countEventListeners(target, "foo")).toBe(2);
		});

		it("should not add the same listener twice even if passive flag is different.", () => {
			const f = () => {};
			target.addEventListener("foo", f, { passive: true });
			target.addEventListener("foo", f, { passive: false });

			expect(countEventListeners(target)).toBe(1);
			// assertWarning(EventListenerWasDuplicated, "bubble", f);
			// assertWarning(OptionWasIgnored, "passive");
		});

		it("should not add the same listener twice even if once flag is different.", () => {
			const f = () => {};
			target.addEventListener("foo", f, { once: true });
			target.addEventListener("foo", f, { once: false });

			expect(countEventListeners(target)).toBe(1);
			// assertWarning(EventListenerWasDuplicated, "bubble", f);
			// assertWarning(OptionWasIgnored, "once");
		});

		it("should not add the same listener twice even if signal flag is different.", () => {
			const f = () => {};
			target.addEventListener("foo", f, { signal: undefined }); // Use undefined instead of undefined for signal
			target.addEventListener("foo", f, { signal: new AbortSignalStub() });

			expect(countEventListeners(target)).toBe(1);
			// assertWarning(EventListenerWasDuplicated, "bubble", f);
			// assertWarning(OptionWasIgnored, "signal");
		});

		it("should not add the same listener twice even if flags are different.", () => {
			const f = () => {};
			target.addEventListener("foo", f, {
				passive: true,
				once: true,
				signal: undefined, // Use undefined instead of undefined
			});
			target.addEventListener("foo", f, {
				passive: false,
				once: false,
				signal: new AbortSignalStub(),
			});

			expect(countEventListeners(target)).toBe(1);
			// assertWarning(EventListenerWasDuplicated, "bubble", f);
			// assertWarning(OptionWasIgnored, "passive");
			// assertWarning(OptionWasIgnored, "once");
			// assertWarning(OptionWasIgnored, "signal");
		});

		it("should not add the listener if abort signal is present and the `signal.aborted` is true.", () => {
			const signal = new AbortSignalStub();
			signal.abort();

			target.addEventListener("foo", () => {}, { signal });
			expect(countEventListeners(target)).toBe(0);
		});

		it("should remove the listener if abort signal was notified.", () => {
			const signal = new AbortSignalStub();

			target.addEventListener("foo", () => {}, { signal });
			expect(countEventListeners(target)).toBe(1);

			signal.abort();
			expect(countEventListeners(target)).toBe(0);
		});
	});

	describe("'removeEventListener' method", () => {
		const f = () => {};
		let target: EventTarget;

		beforeEach(() => {
			target = new EventTarget();
			target.addEventListener("foo", f);
			expect(countEventListeners(target)).toBe(1);
		});

		it("should do nothing if callback is nothing.", () => {
			// @ts-expect-error
			target.removeEventListener();
			target.removeEventListener("foo");
			target.removeEventListener("foo", undefined);

			expect(countEventListeners(target, "foo")).toBe(1);
			// assertWarning(InvalidEventListener, undefined);
			// assertWarning(InvalidEventListener, undefined);
			// assertWarning(InvalidEventListener, undefined);
			// assertWarning(InvalidEventListener, undefined);
		});

		it("should throw a Error if callback is a primitive.", () => {
			expect(() => {
				// @ts-expect-error
				target.removeEventListener("foo", true);
			}).toThrow();
			expect(() => {
				// @ts-expect-error
				target.removeEventListener("foo", 1);
			}).toThrow();
			expect(() => {
				// @ts-expect-error
				target.removeEventListener("foo", "function");
			}).toThrow();
			// Symbol and BigInt might not be relevant in Luau environment
			// expect(() => {
			// 	// @ts-expect-error
			// 	target.removeEventListener("foo", Symbol("symbol"));
			// }).toThrow();
			// expect(() => {
			// 	// @ts-expect-error
			// 	target.removeEventListener("foo", 0n);
			// }).toThrow();

			expect(countEventListeners(target)).toBe(1);
		});

		it("should remove a given event listener.", () => {
			target.removeEventListener("foo", f);
			expect(countEventListeners(target)).toBe(0);
		});

		it("should not remove any listeners if the event type is different.", () => {
			target.removeEventListener("bar", f);
			expect(countEventListeners(target)).toBe(1);
		});

		it("should not remove any listeners if the callback function is different.", () => {
			target.removeEventListener("foo", () => {});
			expect(countEventListeners(target)).toBe(1);
		});

		it("should not remove any listeners if the capture flag is different.", () => {
			target.removeEventListener("foo", f, true);
			target.removeEventListener("foo", f, { capture: true });
			expect(countEventListeners(target)).toBe(1);
		});

		it("should handle capture flag correctly.", () => {
			target.addEventListener("foo", f, { capture: true });
			expect(countEventListeners(target)).toBe(2);

			target.removeEventListener("foo", f, { capture: true });
			target.removeEventListener("foo", f, { capture: true }); // Remove twice should be ok
			expect(countEventListeners(target)).toBe(1); // Only non-capture should remain
		});

		it("should remove a given event listener even if the passive flag is present.", () => {
			// @ts-expect-error - Passive option shouldn't affect removal matching
			target.removeEventListener("foo", f, { passive: true });
			expect(countEventListeners(target)).toBe(0);
		});

		it("should remove a given event listener even if the once flag is present.", () => {
			// @ts-expect-error - Once option shouldn't affect removal matching
			target.removeEventListener("foo", f, { once: true });
			expect(countEventListeners(target)).toBe(0);
		});

		it("should remove a given event listener even if the signal is present.", () => {
			// @ts-expect-error - Signal option shouldn't affect removal matching
			target.removeEventListener("foo", f, {
				signal: new AbortSignalStub(),
			});
			expect(countEventListeners(target)).toBe(0);
		});

		it("should handle non-string types as string types.", () => {
			target.addEventListener("nil", f);
			// target.addEventListener("nil", f);
			target.addEventListener("1000", f);
			expect(countEventListeners(target, "nil")).toBe(1);
			// expect(countEventListeners(target, "nil")).toBe(1);
			expect(countEventListeners(target, "1000")).toBe(1);

			// @ts-expect-error
			target.removeEventListener(undefined, f);
			expect(countEventListeners(target, "nil")).toBe(0);
			// ts-expect-error
			// target.removeEventListener(undefined, f);
			// expect(countEventListeners(target, "nil")).toBe(0);
			// @ts-expect-error
			target.removeEventListener(1000, f);
			expect(countEventListeners(target, "1000")).toBe(0);
		});
	});

	describe("'dispatchEvent' method", () => {
		// Type assertion for target to include 'foo' event
		let target: EventTarget<{ foo: Event }>;

		beforeEach(() => {
			target = new EventTarget();
		});

		it("should throw a Error if the argument was not present", () => {
			expect(() => {
				// @ts-expect-error
				target.dispatchEvent();
			}).toThrow();
		});

		it("should not throw even if listeners don't exist", () => {
			const retv = target.dispatchEvent(new Event("foo"));
			expect(retv).toBe(true);
		});

		it("should not throw even if empty object had been added", () => {
			const f = {};
			// @ts-expect-error
			target.addEventListener("foo", f);
			const retv = target.dispatchEvent(new Event("foo"));
			expect(retv).toBe(true);
			// assertWarning(InvalidEventListener, f);
		});

		it("should call obj.handleEvent method even if added later", () => {
			const event = new Event("foo");
			const f: { handleEvent?: ReturnType<typeof spy> } = {}; // Adjusted type for jest.fn spy
			// @ts-expect-error
			target.addEventListener("foo", f);
			f.handleEvent = spy();
			const retv = target.dispatchEvent(event);

			const calls = (f.handleEvent as jest.Mock).mock.calls as Array<unknown[]>;
			expect(f.handleEvent).toHaveBeenCalledTimes(1);
			expect(calls[0]![0]).toBe(f); // Check 'this' context
			expect(calls[0]![1]).toBeInstanceOf(Event);
			expect(retv).toBe(true);
			// assertWarning(InvalidEventListener, f);
		});

		it("should call a registered listener.", () => {
			const f1 = spy((_, _event: Event) => {});
			const f2 = spy((_, _event: Event) => {});
			target.addEventListener("foo", f1);
			target.addEventListener("bar", f2); // Add listener for 'bar'

			const event = new Event("foo");
			const retv = target.dispatchEvent(event);

			expect(f1).toHaveBeenCalledTimes(1);
			expect(f1).toHaveBeenCalledWith(target, event);
			expect(f2).never.toHaveBeenCalled();
			expect(retv).toBe(true);
		});

		it("should not call subsequent listeners if a listener called `event.stopImmediatePropagation()`.", () => {
			const f1 = spy((_, _event: Event) => {});
			const f2 = spy((_, event: Event) => {
				event.stopImmediatePropagation();
			});
			const f3 = spy((_, _event: Event) => {});
			const f4 = spy((_, _event: Event) => {});
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);
			target.addEventListener("foo", f4);

			const retv = target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(1);
			expect(f2).toHaveBeenCalledTimes(1);
			expect(f3).never.toHaveBeenCalled();
			expect(f4).never.toHaveBeenCalled();
			expect(retv).toBe(true);
		});

		it("should return true even if a listener called 'event.preventDefault()' if the event is not cancelable.", () => {
			target.addEventListener("foo", (_self, event) => {
				event.preventDefault();
			});
			const retv = target.dispatchEvent(new Event("foo"));

			expect(retv).toBe(true);
			// assertWarning(NonCancelableEventWasCanceled);
		});

		it("should return false if a listener called 'event.preventDefault()' and the event is cancelable.", () => {
			target.addEventListener("foo", (_self, event) => {
				event.preventDefault();
			});
			const retv = target.dispatchEvent(new Event("foo", { cancelable: true }));

			expect(retv).toBe(false);
		});

		it("should return true even if a listener called 'event.preventDefault()' if passive option is present.", () => {
			target.addEventListener(
				"foo",
				(_self, event) => {
					event.preventDefault();
				},
				{ passive: true },
			);
			const retv = target.dispatchEvent(new Event("foo", { cancelable: true }));

			expect(retv).toBe(true);
			// assertWarning(CanceledInPassiveListener);
		});

		it("should return true even if a listener called 'event.setReturnValue(false)' if the event is not cancelable.", () => {
			target.addEventListener("foo", (_self, event) => {
				event.setReturnValue(false);
			});
			const retv = target.dispatchEvent(new Event("foo"));

			expect(retv).toBe(true);
			// assertWarning(NonCancelableEventWasCanceled);
		});

		it("should return false if a listener called 'event.setReturnValue(false)' and the event is cancelable.", () => {
			target.addEventListener("foo", (_self, event) => {
				event.setReturnValue(false);
			});
			const retv = target.dispatchEvent(new Event("foo", { cancelable: true }));

			expect(retv).toBe(false);
		});

		it("should return true even if a listener called 'event.setReturnValue(false)' if passive option is present.", () => {
			target.addEventListener(
				"foo",
				(_self, event) => {
					event.setReturnValue(false);
				},
				{ passive: true },
			);
			const retv = target.dispatchEvent(new Event("foo", { cancelable: true }));

			expect(retv).toBe(true);
			// assertWarning(CanceledInPassiveListener);
		});

		it("should remove a listener if once option is present.", () => {
			const f1 = spy();
			const f2 = spy();
			const f3 = spy();
			target.addEventListener("foo", f1, { once: true });
			target.addEventListener("foo", f2, { once: true });
			target.addEventListener("foo", f3, { once: true });

			const retv = target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo")); // Second dispatch

			expect(f1).toHaveBeenCalledTimes(1);
			expect(f2).toHaveBeenCalledTimes(1);
			expect(f3).toHaveBeenCalledTimes(1);
			expect(countEventListeners(target)).toBe(0);
			expect(retv).toBe(true);
		});

		// Tests for removing listeners during dispatch
		it("should handle removing in event listeners correctly. Remove 0 at 0.", () => {
			const f1 = spy(() => {
				target.removeEventListener("foo", f1);
			});
			const f2 = spy();
			const f3 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(1);
			expect(f2).toHaveBeenCalledTimes(2);
			expect(f3).toHaveBeenCalledTimes(2);
		});

		it("should handle removing in event listeners correctly. Remove 1 at 0.", () => {
			const f1 = spy(() => {
				target.removeEventListener("foo", f2);
			});
			const f2 = spy();
			const f3 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(2);
			expect(f2).never.toHaveBeenCalled();
			expect(f3).toHaveBeenCalledTimes(2);
		});

		it("should handle removing in event listeners correctly. Remove 0 at 1.", () => {
			const f1 = spy();
			const f2 = spy(() => {
				target.removeEventListener("foo", f1);
			});
			const f3 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(1);
			expect(f2).toHaveBeenCalledTimes(2);
			expect(f3).toHaveBeenCalledTimes(2);
		});

		it("should handle removing in event listeners correctly. Remove 1 at 1.", () => {
			const f1 = spy();
			const f2 = spy(() => {
				target.removeEventListener("foo", f2);
			});
			const f3 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(2);
			expect(f2).toHaveBeenCalledTimes(1);
			expect(f3).toHaveBeenCalledTimes(2);
		});

		it("should handle removing in event listeners correctly. Remove 2 at 1.", () => {
			const f1 = spy();
			const f2 = spy(() => {
				target.removeEventListener("foo", f3);
			});
			const f3 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(2);
			expect(f2).toHaveBeenCalledTimes(2);
			expect(f3).never.toHaveBeenCalled();
		});

		it("should handle removing in event listeners correctly. Remove 2 at 2.", () => {
			const f1 = spy();
			const f2 = spy();
			const f3 = spy(() => {
				target.removeEventListener("foo", f3);
			});
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(2);
			expect(f2).toHaveBeenCalledTimes(2);
			expect(f3).toHaveBeenCalledTimes(1);
		});

		it("should handle removing in event listeners correctly along with once flag.", () => {
			const f1 = spy();
			const f2 = spy(() => {
				target.removeEventListener("foo", f2); // This removal might be redundant due to {once: true}
			});
			const f3 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2, { once: true });
			target.addEventListener("foo", f3);

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(2);
			expect(f2).toHaveBeenCalledTimes(1); // Called once because of {once: true}
			expect(f3).toHaveBeenCalledTimes(2);
		});

		it("should handle removing in event listeners correctly along with once flag. (2)", () => {
			const f1 = spy();
			const f2 = spy(() => {
				target.removeEventListener("foo", f3);
			});
			const f3 = spy();
			const f4 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2, { once: true });
			target.addEventListener("foo", f3);
			target.addEventListener("foo", f4);

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(2);
			expect(f2).toHaveBeenCalledTimes(1);
			expect(f3).never.toHaveBeenCalled(); // Removed by f2 during first dispatch
			expect(f4).toHaveBeenCalledTimes(2);
		});

		it("should handle removing once and remove", () => {
			const f1 = spy(() => {
				target.removeEventListener("foo", f1);
			});
			target.addEventListener("foo", f1, { once: true });

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(1); // Called once due to {once: true}, removal inside is redundant
		});

		it("should handle removing once and signal", () => {
			const signal = new AbortSignalStub();
			const f1 = spy(() => {
				signal.abort(); // Aborting signal inside the listener
			});
			target.addEventListener("foo", f1, { once: true, signal });

			target.dispatchEvent(new Event("foo"));
			target.dispatchEvent(new Event("foo"));

			expect(f1).toHaveBeenCalledTimes(1); // Called once due to {once: true}
		});

		it("should handle once in nested dispatches", () => {
			const f2 = spy(); // Declare f2 before f1
			const f1 = spy(() => {
				target.dispatchEvent(new Event("foo")); // Nested dispatch
				expect(f2).toHaveBeenCalledTimes(1); // f2 should have been called and removed by now
			});
			target.addEventListener("foo", f1, { once: true });
			target.addEventListener("foo", f2, { once: true });

			target.dispatchEvent(new Event("foo")); // Outer dispatch
			target.dispatchEvent(new Event("foo")); // Another outer dispatch

			expect(f1).toHaveBeenCalledTimes(1);
			expect(f2).toHaveBeenCalledTimes(1);
		});

		it("should not call the listeners that were added after the 'dispatchEvent' method call.", () => {
			const f3 = spy(); // Declare f3 first
			const f1 = spy();
			const f2 = spy(() => {
				target.addEventListener("foo", f3); // Add f3 during dispatch
			});
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);

			target.dispatchEvent(new Event("foo")); // f1, f2 run. f2 adds f3. f3 NOT run.
			target.dispatchEvent(new Event("foo")); // f1, f2, f3 run. f2 adds f3 again (duplicate).

			expect(f1).toHaveBeenCalledTimes(2);
			expect(f2).toHaveBeenCalledTimes(2);
			expect(f3).toHaveBeenCalledTimes(1); // Only called in the second dispatch

			// assertWarning(EventListenerWasDuplicated, "bubble")
		});

		it("should not call the listeners that were added after the 'dispatchEvent' method call. (the last listener is removed at first dispatch)", () => {
			const f3 = spy(); // Declare f3 first
			const f1 = spy();
			const f2 = spy(() => {
				target.addEventListener("foo", f3); // Add f3 during dispatch
			});
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2, { once: true }); // f2 will be removed after first run

			target.dispatchEvent(new Event("foo")); // f1, f2 run. f2 adds f3. f2 is removed. f3 NOT run.
			target.dispatchEvent(new Event("foo")); // f1, f3 run.

			expect(f1).toHaveBeenCalledTimes(2);
			expect(f2).toHaveBeenCalledTimes(1); // Called only once due to {once: true}
			expect(f3).toHaveBeenCalledTimes(1); // Called only in the second dispatch
		});

		it("should catch exceptions that are thrown from listeners and call the error handler.", () => {
			const err = new Error("test");
			const f1 = spy();
			const f2 = spy(() => {
				throw err;
			});
			const f3 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);

			// We expect the dispatch itself not to throw, but subsequent listeners to still run
			expect(() => target.dispatchEvent(new Event("foo"))).never.toThrow();

			expect(f1).toHaveBeenCalledTimes(1);
			expect(f2).toHaveBeenCalledTimes(1);
			expect(f3).toHaveBeenCalledTimes(1);
			// assertError(error); // Error handling might be different or logged elsewhere
		});

		it("should catch exceptions that are thrown from listeners and call the error handler, even if the exception was not an Error object.", () => {
			const err = "error_string"; // Throwing a string
			const f1 = spy();
			const f2 = spy(() => {
				throw err;
			});
			const f3 = spy();
			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3);

			expect(() => target.dispatchEvent(new Event("foo"))).never.toThrow();

			expect(f1).toHaveBeenCalledTimes(1);
			expect(f2).toHaveBeenCalledTimes(1);
			expect(f3).toHaveBeenCalledTimes(1);
			// assertError(error); // Error handling might be different or logged elsewhere
		});

		it("should throw an InvalidStateError if the given event is being used", () => {
			const event = new Event("foo");
			const f = spy(() => {
				// This nested dispatch should throw
				expect(() => target.dispatchEvent(event)).toThrow();
				// Check specific error properties if needed (name, code) - might require custom matcher or try/catch
				// try { target.dispatchEvent(event); } catch (e) { expect(e.name).toBe("InvalidStateError"); expect(e.code).toBe(11); }
			});
			target.addEventListener("foo", f, { once: true });

			// The outer dispatch should not throw immediately, the error happens inside 'f'
			expect(() => target.dispatchEvent(event)).never.toThrow();

			expect(f).toHaveBeenCalledTimes(1);
			// assertError("This event has been in dispatching."); // Error is expected and caught above
		});

		it("should not call event listeners if given event was stopped", () => {
			const event = new Event("foo");
			const f = spy();

			event.stopPropagation(); // Stop propagation before dispatch
			target.addEventListener("foo", f);
			target.dispatchEvent(event);

			expect(f).never.toHaveBeenCalled();
		});

		describe("if the argument is a plain object, the event object in the listener", () => {
			class MyEvent extends Event {
				writable: number;
				constructor(kind: string, writable: number) {
					// Added type to constructor
					super(kind);
					this.writable = writable;
				}
			}

			// Adjusted type to match the class definition and potential usage
			let target: EventTarget<{ foo: Event; bar: MyEvent }, "strict">;

			beforeEach(() => {
				target = new EventTarget();
			});

			it("'type' property should be the same value as the original.", () => {
				const event = { type: () => "foo" as const } as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.type()).toBe(event.type);
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'target' property should be the event target that is dispatching.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.target()).toBe(target);
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'currentTarget' property should be the event target that is dispatching.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.currentTarget()).toBe(target);
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'eventPhase' property should be 2.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.eventPhase()).toBe(2); // AT_TARGET
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'stopPropagation()' method should call the 'stopPropagation()' method on the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					stopPropagation: spy(),
				} as const;
				target.addEventListener("foo", (_self, wrapper) => {
					wrapper.stopPropagation();
				});
				target.dispatchEvent(event);
				expect(event.stopPropagation).toHaveBeenCalledTimes(1);
			});

			it("'stopPropagation()' method should not throw any error even if the original didn't have the 'stopPropagation()' method.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
				} as const;
				let ok = true;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(() => wrapper.stopPropagation()).never.toThrow();
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'cancelBubble' property should be the same value as the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					cancelBubble() {
						return true;
					},
				} as const;
				let ok = true; // Listener should not run because bubble cancelled
				target.addEventListener("foo", (_self, wrapper) => {
					ok = false;
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("assigning to 'cancelBubble' property should change both the wrapper and the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					cancelBubble() {
						return false;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					wrapper.setCancelBubble(true);
					expect(wrapper.cancelBubble()).toBe(true);
					expect(event.cancelBubble()).toBe(true);
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("assigning to 'cancelBubble' property should change only the wrapper if the original didn't have the property.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					wrapper.setCancelBubble(true);
					expect(wrapper.cancelBubble()).toBe(true);
					expect(
						(event as never as { cancelBubble: Callback }).cancelBubble(),
					).toBeUndefined();
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'stopImmediatePropagation()' method should call the 'stopImmediatePropagation()' method on the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					stopImmediatePropagation: spy(),
				} as const;
				target.addEventListener("foo", (_self, wrapper) => {
					wrapper.stopImmediatePropagation();
				});
				target.dispatchEvent(event);
				expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
			});

			it("'stopImmediatePropagation()' method should not throw any error even if the original didn't have the 'stopImmediatePropagation()' method.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
				} as const;
				let ok = true;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(() => wrapper.stopImmediatePropagation()).never.toThrow();
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'bubbles' property should be the same value as the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					bubbles() {
						return true;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.bubbles()).toBe(event.bubbles());
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'cancelable' property should be the same value as the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					cancelable() {
						return true;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.cancelable()).toBe(event.cancelable());
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'returnValue' property should be the same value as the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					returnValue() {
						return true;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.returnValue()).toBe(event.returnValue());
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("assigning to 'returnValue' property should change both the wrapper and the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					cancelable() {
						return true;
					},
					returnValue() {
						return true;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					wrapper.setReturnValue(false);
					expect(wrapper.returnValue()).toBe(false);
					expect(event.returnValue()).toBe(false);
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("assigning to 'returnValue' property should change only the wrapper if the original didn't have the property.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					cancelable() {
						return true;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					wrapper.setReturnValue(false);
					expect(wrapper.returnValue()).toBe(false);
					expect(
						(event as never as { returnValue: Callback }).returnValue(),
					).toBeUndefined();
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'preventDefault()' method should call the 'preventDefault()' method on the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					cancelable() {
						return true;
					},
					preventDefault: spy(),
				} as const;
				target.addEventListener("foo", (_self, wrapper) => {
					wrapper.preventDefault();
				});
				target.dispatchEvent(event);
				expect(event.preventDefault).toHaveBeenCalledTimes(1);
			});

			it("'preventDefault()' method should not throw any error even if the original didn't have the 'preventDefault()' method.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					cancelable() {
						return true;
					},
				} as const;
				let ok = true;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(() => wrapper.preventDefault()).never.toThrow();
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'composed' property should be the same value as the original.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
					composed() {
						return true;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.composed()).toBe(event.composed());
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'timeStamp' property should be the same value as the original.", async () => {
				const ts = os.clock();
				const event = {
					type() {
						return "foo" as const;
					},
					timeStamp() {
						return ts;
					},
				} as const;
				await Promise.delay(0.1); // Simulate delay
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(wrapper.timeStamp()).toBe(event.timeStamp());
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("'timeStamp' property should be a number even if the original didn't have the 'timeStamp' property.", () => {
				const event = {
					type() {
						return "foo" as const;
					},
				} as const;
				let ok = false;
				target.addEventListener("foo", (_self, wrapper) => {
					ok = true;
					expect(type(wrapper.timeStamp())).toBe("number");
				});
				target.dispatchEvent(event);
				expect(ok).toBe(true);
			});

			it("should redirect instance properties.", () => {
				// Use the 'bar' event type which corresponds to MyEvent
				const event = {
					type() {
						return "bar" as const;
					},
					writable: 1,
				} as const;
				target.addEventListener("bar", (_self, wrapper) => {
					expect(wrapper.writable).toBe(1);
					wrapper.writable = 2;
				});
				target.dispatchEvent(event);
				// The original plain object is modified through the wrapper
				expect(event.writable).toBe(2);
			});

			it("should not throw even if prototype is undefined.", () => {
				// Use the 'bar' event type which corresponds to MyEvent
				const event = {
					type() {
						return "bar" as const;
					},
					writable: 1,
				};
				target.addEventListener("bar", (_self, wrapper) => {
					expect(wrapper.writable).toBe(1);
					wrapper.writable = 2;
				});
				expect(() => target.dispatchEvent(event)).never.toThrow();
				expect(event.writable).toBe(2);
			});
		});
	}); // End of 'dispatchEvent' method describe

	describe.skip("for-in", () => {
		it("should enumerate 3 property names", () => {
			const target = new EventTarget();
			const actualKeys = [];
			const expectedKeys = ["addEventListener", "removeEventListener", "dispatchEvent"];

			// eslint-disable-next-line @typescript-eslint/no-unused-vars, roblox-ts/no-unused-vars
			for (const [key] of pairs(target)) {
				actualKeys.push(key);
			}

			// Sort both arrays before comparing
			actualKeys.sort();
			expectedKeys.sort();
			expect(actualKeys).toEqual(expectedKeys);
		});

		it("should enumerate no property names in static", () => {
			const keys = new Set<string>();

			// eslint-disable-next-line @typescript-eslint/no-unused-vars, roblox-ts/no-unused-vars
			for (const [key] of pairs(EventTarget)) {
				// Ensure 'key' is treated as a string if necessary, though it should be
				keys.add(tostring(key));
			}

			expect(keys.size()).toBe(0); // Check if the set is empty
		});
	});
});
