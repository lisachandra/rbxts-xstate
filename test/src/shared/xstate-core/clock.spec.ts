import {
	describe,
	beforeEach,
	it,
	expect,
	afterAll,
	beforeAll,
	jest,
	test,
} from "@rbxts/jest-globals";
import { AnyObject, createActor, createMachine, SimulatedClock } from "@rbxts/xstate";

describe("clock", () => {
	it("system clock should be default clock for actors (invoked from machine)", () => {
		const clock = new SimulatedClock();

		const machine = createMachine({
			invoke: {
				id: "child",
				src: createMachine({
					initial: "a",
					states: {
						a: {
							after: {
								10_000: "b",
							},
						},
						b: {},
					},
				}),
			},
		});

		const actor = createActor(machine, {
			clock,
		}).start();

		expect((actor.getSnapshot().children.child.getSnapshot() as AnyObject).value).toEqual("a");

		clock.increment(10_000);

		expect((actor.getSnapshot().children.child.getSnapshot() as AnyObject).value).toEqual("b");
	});
});
