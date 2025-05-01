import { describe, it, expect, beforeAll, afterAll } from "@rbxts/jest-globals";
import { Event } from "@rbxts/whatwg-event-target";
import { Error } from "@rbxts/luau-polyfill";
import EnvTestUtils from "test/env-utils";

// Mock native browser APIs that don't exist in Roblox
const NativeEvent = undefined;

describe("'Event' class", () => {
	beforeAll(() => {
		EnvTestUtils.silenceConsole = true;
	});

	afterAll(() => {
		EnvTestUtils.silenceConsole = false;
	});

	describe("constructor", () => {
		it("should return an Event object", () => {
			expect(new Event("")).toBeInstanceOf(Event);
		});

		it("should throw a TypeError if called as a function", () => {
			expect(() => {
				// @ts-expect-error
				Event("");
			}).toThrow();
		});

		/*
		const nativeDescribe = NativeEvent ? describe : xdescribe;
		nativeDescribe("if native Event class is present", () => {
			it("`event instanceof window.Event` should be true", () => {
				const event = new Event("");
				expect(event).toBeInstanceOf(NativeEvent);
			});
		});
		*/
	});

	describe("'type' property", () => {
		it("should be the value of the constructor's first argument", () => {
			const event = new Event("foo");
			expect(event.type()).toBe("foo");
		});

		it("should be the string representation of the constructor's first argument", () => {
			expect(new Event(undefined as never).type()).toBe("nil");
			// expect(new Event(undefined).type()).toBe("undefined");
			expect(new Event(1000 as never).type()).toBe("1000");
		});

		it("should be readonly", () => {
			const event = new Event("foo");
			expect(() => {
				event["type" as never] = "bar" as never;
			}).toThrow();
		});
	});

	describe("'bubbles' property", () => {
		it("should be false by default", () => {
			expect(new Event("foo").bubbles()).toBe(false);
		});

		it("should be the value of the constructor's second argument's 'bubbles' property", () => {
			expect(new Event("foo", { bubbles: true }).bubbles()).toBe(true);
			expect(new Event("foo", { bubbles: false }).bubbles()).toBe(false);
		});

		it("should be readonly", () => {
			const event = new Event("foo");
			expect(() => {
				// @ts-expect-error
				event.bubbles = true;
			}).toThrow();
		});
	});

	describe("'cancelable' property", () => {
		it("should be false by default", () => {
			expect(new Event("foo").cancelable()).toBe(false);
		});

		it("should be the value of the constructor's second argument's 'cancelable' property", () => {
			expect(new Event("foo", { cancelable: true }).cancelable()).toBe(true);
			expect(new Event("foo", { cancelable: false }).cancelable()).toBe(false);
		});

		it("should be readonly", () => {
			const event = new Event("foo");
			expect(() => {
				// @ts-expect-error
				event.cancelable = true;
			}).toThrow();
		});
	});

	describe("'composed' property", () => {
		it("should be false by default", () => {
			expect(new Event("foo").composed()).toBe(false);
		});

		it("should be the value of the constructor's second argument's 'composed' property", () => {
			expect(new Event("foo", { composed: true }).composed()).toBe(true);
			expect(new Event("foo", { composed: false }).composed()).toBe(false);
		});

		it("should be readonly", () => {
			const event = new Event("foo");
			expect(() => {
				// @ts-expect-error
				event.composed = true;
			}).toThrow();
		});
	});

	describe("'stopPropagation()' method", () => {
		it("should set 'cancelBubble' to true", () => {
			const event = new Event("foo");
			expect(event.cancelBubble()).toBe(false);
			event.stopPropagation();
			expect(event.cancelBubble()).toBe(true);
		});

		it("should not throw any error even if called twice", () => {
			const event = new Event("foo");
			expect(() => {
				event.stopPropagation();
				event.stopPropagation();
			}).never.toThrow();
		});
	});

	describe("'stopImmediatePropagation()' method", () => {
		it("should set 'cancelBubble' to true", () => {
			const event = new Event("foo");
			expect(event.cancelBubble()).toBe(false);
			event.stopImmediatePropagation();
			expect(event.cancelBubble()).toBe(true);
		});

		it("should not throw any error even if called twice", () => {
			const event = new Event("foo");
			expect(() => {
				event.stopImmediatePropagation();
				event.stopImmediatePropagation();
			}).never.toThrow();
		});
	});

	describe("'preventDefault()' method", () => {
		it("should set 'defaultPrevented' to true if the event is cancelable", () => {
			const event = new Event("foo", { cancelable: true });
			expect(event.defaultPrevented()).toBe(false);
			event.preventDefault();
			expect(event.defaultPrevented()).toBe(true);
		});

		it("should not set 'defaultPrevented' to true if the event is not cancelable", () => {
			const event = new Event("foo");
			expect(event.defaultPrevented()).toBe(false);
			event.preventDefault();
			expect(event.defaultPrevented()).toBe(false);
			// assertWarning("NonCancelableEventWasCanceled");
		});

		it("should not throw any error even if called twice", () => {
			const event = new Event("foo", { cancelable: true });
			expect(() => {
				event.preventDefault();
				event.preventDefault();
			}).never.toThrow();
		});
	});

	describe("'returnValue' property", () => {
		it("should be true by default", () => {
			expect(new Event("foo").returnValue()).toBe(true);
		});

		it("should be false after 'preventDefault()' was called if the event is cancelable", () => {
			const event = new Event("foo", { cancelable: true });
			event.preventDefault();
			expect(event.returnValue()).toBe(false);
		});

		it("should not be false after 'preventDefault()' was called if the event is not cancelable", () => {
			const event = new Event("foo");
			event.preventDefault();
			expect(event.returnValue()).toBe(true);
		});

		it("should set 'defaultPrevented' to true if set to false and the event is cancelable", () => {
			const event = new Event("foo", { cancelable: true });
			event.setReturnValue(false);
			expect(event.defaultPrevented()).toBe(true);
		});

		it("should not set 'defaultPrevented' to true if set to false and the event is not cancelable", () => {
			const event = new Event("foo");
			event.setReturnValue(false);
			expect(event.defaultPrevented()).toBe(false);
		});
	});

	describe("Custom Event types", () => {
		class CustomEvent extends Event {
			// @ts-expect-error
			readonly detail: number;
			constructor(kind: string, eventInitDict?: { detail?: number } & Event.EventInit) {
				super(kind, eventInitDict);
				rawset(this, "detail", eventInitDict?.detail ?? 0);
			}
		}

		it("should allow extending the Event class", () => {
			const event = new CustomEvent("custom");
			expect(event).toBeInstanceOf(Event);
			expect(event).toBeInstanceOf(CustomEvent);
			expect(event.type()).toBe("custom");
			expect(event.detail).toBe(0);
		});

		it("should pass through custom properties", () => {
			const event = new CustomEvent("custom", { detail: 42 });
			expect(event.detail).toBe(42);
		});

		it("should maintain all base Event functionality", () => {
			const event = new CustomEvent("custom", { bubbles: true, cancelable: true });
			expect(event.bubbles()).toBe(true);
			expect(event.cancelable()).toBe(true);
			event.preventDefault();
			expect(event.defaultPrevented()).toBe(true);
		});
	});

	describe("Edge cases", () => {
		it("should handle events with undefined prototype", () => {
			const event = {
				type: "foo",
				bubbles: false,
				cancelable: false,
			};
			expect(() => new Event("foo", event)).never.toThrow();
		});

		it("should handle missing properties on init dict", () => {
			expect(() => new Event("foo", undefined)).never.toThrow();
			expect(() => new Event("foo", {})).never.toThrow();
		});

		it("should handle invalid property values", () => {
			// @ts-expect-error
			const event = new Event("foo", { bubbles: "true", cancelable: 1 });
			expect(event.bubbles()).toBe(true);
			expect(event.cancelable()).toBe(true);
		});
	});
});
