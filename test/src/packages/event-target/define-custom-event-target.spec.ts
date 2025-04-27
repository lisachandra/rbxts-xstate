import { describe, beforeEach, it, expect, afterAll, beforeAll } from "@rbxts/jest-globals";
import { defineCustomEventTarget, Event, EventTarget } from "@rbxts/whatwg-event-target";
import { countEventListeners } from "./lib/count-event-listeners";
import EnvTestUtils from "test/env-utils";

describe("'defineCustomEventTarget' function", () => {
	beforeAll(() => {
		EnvTestUtils.silenceConsole = true;
	});

	afterAll(() => {
		EnvTestUtils.silenceConsole = false;
	});

	describe("when '{foo:Event; bar:Event}' type argument is present, the returned value is", () => {
		const MyEventTarget = defineCustomEventTarget<{
			foo: Event<"foo">;
			bar: Event<"bar">;
		}>("foo", "bar");
		type MyEventTarget = InstanceType<typeof MyEventTarget>;

		it.skip("should be a function.", () => {
			expect(type(MyEventTarget)).toBe("function");
		});

		it("should throw a TypeError on function calls.", () => {
			expect(() => {
				// @ts-expect-error
				MyEventTarget();
			}).toThrow();
		});

		it.skip("should return an instance on constructor calls.", () => {
			const target = new MyEventTarget();
			expect(target).toBeInstanceOf(MyEventTarget);
			expect(target).toBeInstanceOf(EventTarget);
		});

		describe("the instance of MyEventTarget", () => {
			let target: MyEventTarget;
			beforeEach(() => {
				target = new MyEventTarget();
			});

			describe("'onfoo' property", () => {
				it("should be undefined at first", () => {
					expect(target.onfoo).toBe(undefined);
				});

				it("should be able to set a function", () => {
					const f = () => {};
					target.onfoo = f;
					expect(target.onfoo).toBe(f);
				});

				it("should add an listener on setting a function", () => {
					const f = () => {};
					target.onfoo = f;
					expect(countEventListeners(target, "foo")).toBe(1);
				});

				it("should remove the set listener on setting undefined", () => {
					const f = () => {};
					target.onfoo = f;
					expect(countEventListeners(target, "foo")).toBe(1);
					target.onfoo = undefined;
					expect(countEventListeners(target, "foo")).toBe(0);
				});
			});

			describe("'onbar' property", () => {
				it("should be undefined at first", () => {
					expect(target.onbar).toBe(undefined);
				});

				it("should be able to set a function", () => {
					const f = () => {};
					target.onbar = f;
					expect(target.onbar).toBe(f);
				});

				it("should add an listener on setting a function", () => {
					const f = () => {};
					target.onbar = f;
					expect(countEventListeners(target, "bar")).toBe(1);
				});

				it("should remove the set listener on setting undefined", () => {
					const f = () => {};
					target.onbar = f;
					expect(countEventListeners(target, "bar")).toBe(1);
					target.onbar = undefined;
					expect(countEventListeners(target, "bar")).toBe(0);
				});
			});

			describe.skip("for-in", () => {
				it("should enumerate 5 property names", () => {
					const actualKeys = [];
					const expectedKeys = [
						"addEventListener",
						"removeEventListener",
						"dispatchEvent",
						"onfoo",
						"onbar",
					];

					// eslint-disable-next-line @mysticatea/prefer-for-of
					for (const [key] of pairs(target)) {
						actualKeys.push(key);
					}

					expect(actualKeys.sort(undefined)).toEqual(expectedKeys.sort(undefined));
				});
			});
		});
	});
});
