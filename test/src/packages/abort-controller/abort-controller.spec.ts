/**
 * @author Toru Nagashima
 *   [https://github.com/mysticatea](https://github.com/mysticatea) See LICENSE
 *   file in root directory for full license.
 */
import { describe, beforeEach, it, expect, jest, beforeAll, afterAll } from "@rbxts/jest-globals";
import { AbortController, AbortSignal } from "@rbxts/whatwg-abort-controller";
import EnvTestUtils from "test/env-utils";

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("AbortController", () => {
	beforeAll(() => {
		EnvTestUtils.silenceConsole = true;
	});

	afterAll(() => {
		EnvTestUtils.silenceConsole = false;
	});

	let controller: AbortController;

	beforeEach(() => {
		controller = new AbortController();
	});

	it("should not be callable", () => {
		// @ts-expect-error
		expect(() => AbortController()).toThrow();
	});

	it.skip("should have 2 properties", () => {
		// IE does not support Set constructor.
		const keys = new Set();
		keys.add("signal");
		keys.add("abort");

		for (const [key] of pairs(controller)) {
			expect(keys.has(key)).toBe(true);
			keys.delete(key);
		}

		keys.forEach(key => {
			expect(false).toBe(true);
		});
	});

	/*
	(SUPPORTS_TOSTRINGTAG ? it : xit)("should be stringified as [object AbortController]", () => {
		assert(controller.toString() === "[object AbortController]");
	});
	*/

	describe("'signal' property", () => {
		let signal: AbortSignal;

		beforeEach(() => {
			signal = controller.getSignal();
		});

		it("should return the same instance always", () => {
			expect(signal).toBe(controller.getSignal());
		});

		/*
		it("should be a AbortSignal object", () => {
			assert(signal instanceof AbortSignal);
		});
		(HAS_EVENT_TARGET_INTERFACE ? it : xit)("should be a EventTarget object", () => {
			assert(signal instanceof EventTarget);
		});
		*/

		it.skip("should have 5 properties", () => {
			// IE does not support Set constructor.
			const keys = new Set();
			keys.add("addEventListener");
			keys.add("removeEventListener");
			keys.add("dispatchEvent");
			keys.add("aborted");
			keys.add("onabort");

			for (const [key] of pairs(signal)) {
				expect(keys.has(key)).toBe(true);
				keys.delete(key);
			}

			keys.forEach(key => {
				expect(false).toBe(true);
			});
		});

		it("should have 'aborted' property which is false by default", () => {
			expect(signal.getAborted()).toBe(false);
		});

		it("should have 'onabort' property which is undefined by default", () => {
			expect(signal.getOnabort()).toBe(undefined);
		});

		it("should throw a TypeError if 'signal.aborted' getter is called with non AbortSignal object", () => {
			/*
			const getAborted = Object.getOwnPropertyDescriptor(
				(signal as AnyObject).__proto__,
				"aborted",
			)!.get;
			*/
			expect(() => (signal["getAborted" as never] as Callback)({})).toThrow();
		});
		/*
		(SUPPORTS_TOSTRINGTAG ? it : xit)("should be stringified as [object AbortSignal]", () => {
			assert(signal.toString() === "[object AbortSignal]");
		});
		*/
	});

	describe("'abort' method", () => {
		it("should set true to 'signal.aborted' property", () => {
			controller.abort();
			expect(controller.getSignal().getAborted()).toBe(true);
		});

		it("should fire 'abort' event on 'signal' (addEventListener)", () => {
			const listener = jest.fn();
			controller.getSignal().addEventListener("abort", listener);
			controller.abort();

			expect(listener).toBeCalled();
		});

		it("should fire 'abort' event on 'signal' (onabort)", () => {
			const listener = jest.fn();
			controller.getSignal().setOnabort(listener as never);
			controller.abort();

			expect(listener).toBeCalled();
		});

		it("should not fire 'abort' event twice", () => {
			const listener = jest.fn();
			controller.getSignal().addEventListener("abort", listener);
			controller.abort();
			controller.abort();
			controller.abort();

			expect(listener).toBeCalled();
		});

		it("should throw a TypeError if 'this' is not an AbortController object", () => {
			expect(() => (controller["abort" as never] as Callback)({})).toThrow();
		});
	});
});

describe("AbortSignal", () => {
	it("should not be callable", () => {
		// @ts-expect-error
		expect(() => AbortSignal()).toThrow();
	});

	it("should throw a TypeError when it's constructed directly", () => {
		expect(() => new AbortSignal()).toThrow();
	});
});
