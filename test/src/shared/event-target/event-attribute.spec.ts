import { describe, beforeEach, it, expect, jest, beforeAll, afterAll } from "@rbxts/jest-globals";
import {
	Event,
	EventTarget,
	getEventAttributeValue,
	setEventAttributeValue,
} from "@rbxts/whatwg-event-target";
import { countEventListeners } from "./lib/count-event-listeners";
import EnvTestUtils from "test/env-utils";

describe("Event attribute handlers", () => {
	beforeAll(() => {
		EnvTestUtils.silenceConsole = true;
	});

	afterAll(() => {
		EnvTestUtils.silenceConsole = false;
	});

	let target: EventTarget;
	beforeEach(() => {
		target = new EventTarget();
	});

	describe("'getEventAttributeValue' function", () => {
		it("should throw a TypeError if non-EventTarget object is present", () => {
			expect(() => {
				// @ts-expect-error
				getEventAttributeValue();
			}).toThrow();
			expect(() => {
				// @ts-expect-error
				getEventAttributeValue(undefined);
			}).toThrow();
			expect(() => {
				// @ts-expect-error
				getEventAttributeValue({});
			}).toThrow();
		});

		it("should return undefined if any handlers are not set.", () => {
			expect(getEventAttributeValue(target, "foo")).toBe(undefined);
		});

		it("should return undefined if any handlers are not set, even if listeners are added by 'addEventListener'.", () => {
			target.addEventListener("foo", () => {});
			expect(getEventAttributeValue(target, "foo")).toBe(undefined);
		});

		it("should return undefined if listeners are set to a different event by 'setEventAttributeValue'.", () => {
			const f = () => {};
			setEventAttributeValue(target, "bar", f);
			expect(getEventAttributeValue(target, "foo")).toBe(undefined);
		});

		it("should return the set function if listeners are set by 'setEventAttributeValue'.", () => {
			const f = () => {};
			setEventAttributeValue(target, "foo", f);
			expect(getEventAttributeValue(target, "foo")).toBe(f);
		});

		it("should return the set object if listeners are set by 'setEventAttributeValue'.", () => {
			const f = {};
			// @ts-expect-error
			setEventAttributeValue(target, "foo", f);
			expect(getEventAttributeValue(target, "foo")).toBe(f);
		});

		it("should return the last set function if listeners are set by 'setEventAttributeValue' multiple times.", () => {
			const f = () => {};
			setEventAttributeValue(target, "foo", () => {});
			setEventAttributeValue(target, "foo", undefined);
			setEventAttributeValue(target, "foo", () => {});
			setEventAttributeValue(target, "foo", f);
			expect(getEventAttributeValue(target, "foo")).toBe(f);
		});

		it("should handle the string representation of the type argument", () => {
			const f = () => {};
			setEventAttributeValue(target, "1000", f);
			// @ts-expect-error
			expect(getEventAttributeValue(target, 1000)).toBe(f);
		});
	});

	describe("'setEventAttributeValue' function", () => {
		it("should throw a TypeError if non-EventTarget object is present", () => {
			expect(() => {
				// @ts-expect-error
				setEventAttributeValue();
			}).toThrow();
			expect(() => {
				// @ts-expect-error
				setEventAttributeValue(undefined);
			}).toThrow();
			expect(() => {
				// @ts-expect-error
				setEventAttributeValue({});
			}).toThrow();
		});

		it("should add an event listener if a function is given.", () => {
			setEventAttributeValue(target, "foo", () => {});
			expect(countEventListeners(target)).toBe(1);
			expect(countEventListeners(target, "foo")).toBe(1);
		});

		it("should add an event listener if an object is given.", () => {
			const f = {};
			// @ts-expect-error
			setEventAttributeValue(target, "foo", f);
			expect(countEventListeners(target)).toBe(1);
			expect(countEventListeners(target, "foo")).toBe(1);
		});

		it("should remove an event listener if undefined is given.", () => {
			setEventAttributeValue(target, "foo", () => {});
			expect(countEventListeners(target, "foo")).toBe(1);
			setEventAttributeValue(target, "foo", undefined);
			expect(countEventListeners(target, "foo")).toBe(0);
		});

		it("should remove an event listener if primitive is given.", () => {
			setEventAttributeValue(target, "foo", () => {});
			expect(countEventListeners(target, "foo")).toBe(1);
			// @ts-expect-error
			setEventAttributeValue(target, "foo", 3);
			expect(countEventListeners(target, "foo")).toBe(0);
		});

		it("should do nothing if primitive is given and the target doesn't have listeners.", () => {
			setEventAttributeValue(target, "foo", undefined);
			expect(countEventListeners(target, "foo")).toBe(0);
		});

		it("should handle the string representation of the type argument", () => {
			const f = () => {};
			// @ts-expect-error
			setEventAttributeValue(target, 1000, f);

			expect(countEventListeners(target)).toBe(1);
			expect(countEventListeners(target, "1000")).toBe(1);
		});

		it("should keep the added order: attr, normal, capture", () => {
			const list: string[] = [];
			const f1 = () => {
				list.push("f1");
			};
			const f2 = () => {
				list.push("f2");
			};
			const f3 = () => {
				list.push("f3");
			};

			setEventAttributeValue(target, "foo", f1);
			target.addEventListener("foo", f2);
			target.addEventListener("foo", f3, { capture: true });
			target.dispatchEvent(new Event("foo"));

			expect(list).toEqual(["f1", "f2", "f3"]);
		});

		it("should keep the added order: normal, capture, attr", () => {
			const list: string[] = [];
			const f1 = () => {
				list.push("f1");
			};
			const f2 = () => {
				list.push("f2");
			};
			const f3 = () => {
				list.push("f3");
			};

			target.addEventListener("foo", f1);
			target.addEventListener("foo", f2, { capture: true });
			setEventAttributeValue(target, "foo", f3);
			target.dispatchEvent(new Event("foo"));

			expect(list).toEqual(["f1", "f2", "f3"]);
		});

		it("should keep the added order: capture, attr, normal", () => {
			const list: string[] = [];
			const f1 = () => {
				list.push("f1");
			};
			const f2 = () => {
				list.push("f2");
			};
			const f3 = () => {
				list.push("f3");
			};

			target.addEventListener("foo", f1, { capture: true });
			setEventAttributeValue(target, "foo", f2);
			target.addEventListener("foo", f3);
			target.dispatchEvent(new Event("foo"));

			expect(list).toEqual(["f1", "f2", "f3"]);
		});

		it.skip("should not be called by 'dispatchEvent' if the listener is object listener", () => {
			const f = { handleEvent: jest.fn() };
			// @ts-expect-error
			setEventAttributeValue(target, "foo", f);
			target.dispatchEvent(new Event("foo"));

			expect(f.handleEvent.mock.calls).toHaveLength(0);
		});
	});
});
