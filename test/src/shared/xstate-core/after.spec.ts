import {
	describe,
	beforeEach,
	it,
	expect,
	afterAll,
	beforeAll,
	jest,
	test,
	afterEach,
} from "@rbxts/jest-globals";
import { JSON } from "@rbxts/xstate/out/utils/polyfill/json";
import { sleep } from "test/env-utils";
import { createMachine, createActor, cancel, Snapshot } from "@rbxts/xstate";
import { Object, setTimeout } from "@rbxts/luau-polyfill";
import { HttpService } from "@rbxts/services";

const lightMachine = createMachine({
	id: "light",
	initial: "green",
	context: {
		canTurnGreen: true,
	},
	states: {
		green: {
			after: {
				1000: "yellow",
			},
		},
		yellow: {
			after: {
				1000: [{ target: "red" }],
			},
		},
		red: {
			after: {
				1000: "green",
			},
		},
	},
});

afterEach(() => {
	jest.useRealTimers();
});

describe("delayed transitions", () => {
	it("should transition after delay", () => {
		jest.useFakeTimers();

		const actorRef = createActor(lightMachine).start();
		expect(actorRef.getSnapshot().value).toBe("green");

		jest.advanceTimersByTime(500);
		expect(actorRef.getSnapshot().value).toBe("green");

		jest.advanceTimersByTime(510);
		expect(actorRef.getSnapshot().value).toBe("yellow");
	});

	it("should not try to clear an undefined timeout when exiting source state of a delayed transition", async () => {
		// https://github.com/statelyai/xstate/issues/5001
		const spy = jest.fn();

		const machine = createMachine({
			initial: "green",
			states: {
				green: {
					after: {
						1: "yellow",
					},
				},
				yellow: {},
			},
		});

		const luaUnpack: Callback = getfenv(0)["unpack" as never];
		const actorRef = createActor(machine, {
			clock: {
				setTimeout(...args: defined[]) {
					return setTimeout(luaUnpack(args));
				},
				clearTimeout: spy as never,
			},
		}).start();

		// when the after transition gets executed it tries to clear its own timer when exiting its source state
		await sleep(5);
		expect(actorRef.getSnapshot().value).toBe("yellow");
		expect(spy.mock.calls).toHaveLength(0);
	});

	it("should format transitions properly", () => {
		const greenNode = lightMachine.states.green;

		const transitions = greenNode.transitions;

		expect([...Object.keys(transitions)]).toEqual(["xstate.after.1000.light.green"]);
	});

	it("should be able to transition with delay from nested initial state", (_, done) => {
		const machine = createMachine({
			initial: "nested",
			states: {
				nested: {
					initial: "wait",
					states: {
						wait: {
							after: {
								10: "#end",
							},
						},
					},
				},
				end: {
					id: "end",
					type: "final",
				},
			},
		});

		const actor = createActor(machine);
		actor.subscribe({
			complete: () => {
				done();
			},
		});
		actor.start();
	});

	it("parent state should enter child state without re-entering self (relative target)", (_, done) => {
		const actual: string[] = [];
		const machine = createMachine({
			initial: "one",
			states: {
				one: {
					initial: "two",
					entry: () => actual.push("entered one"),
					states: {
						two: {
							entry: () => actual.push("entered two"),
						},
						three: {
							entry: () => actual.push("entered three"),
							always: "#end",
						},
					},
					after: {
						10: ".three",
					},
				},
				end: {
					id: "end",
					type: "final",
				},
			},
		});

		const actor = createActor(machine);
		actor.subscribe({
			complete: () => {
				expect(actual).toEqual(["entered one", "entered two", "entered three"]);
				done();
			},
		});
		actor.start();
	});

	it("should defer a single send event for a delayed conditional transition (#886)", () => {
		jest.useFakeTimers();
		const spy = jest.fn();
		const machine = createMachine({
			initial: "X",
			states: {
				X: {
					after: {
						1: [
							{
								target: "Y",
								guard: () => true,
							},
							{
								target: "Z",
							},
						],
					},
				},
				Y: {
					on: {
						"*": {
							actions: spy,
						},
					},
				},
				Z: {},
			},
		});

		createActor(machine).start();

		jest.advanceTimersByTime(10);
		expect(spy).never.toHaveBeenCalled();
	});

	// TODO: figure out correct behavior for restoring delayed transitions
	it.skip("should execute an after transition after starting from a state resolved using `.getPersistedSnapshot`", (_, done) => {
		const machine = createMachine({
			id: "machine",
			initial: "a",
			states: {
				a: {
					on: { next: "withAfter" },
				},

				withAfter: {
					after: {
						1: { target: "done" },
					},
				},

				done: {
					type: "final",
				},
			},
		});

		const actorRef1 = createActor(machine).start();
		actorRef1.send({ type: "next" });
		const withAfterState = actorRef1.getPersistedSnapshot();

		const actorRef2 = createActor(machine, { snapshot: withAfterState });
		actorRef2.subscribe({ complete: () => done() });
		actorRef2.start();
	});

	it("should execute an after transition after starting from a persisted state", (_, done) => {
		const createMyMachine = () =>
			createMachine({
				initial: "A",
				states: {
					A: {
						on: {
							NEXT: "B",
						},
					},
					B: {
						after: {
							1: "C",
						},
					},
					C: {
						type: "final",
					},
				},
			});

		let service = createActor(createMyMachine()).start();

		const persistedSnapshot = JSON.parse(JSON.stringify(service.getSnapshot()));

		service = createActor(createMyMachine(), {
			snapshot: persistedSnapshot as Snapshot<unknown>,
		}).start();

		service.send({ type: "NEXT" });

		service.subscribe({ complete: () => done() });
	});

	describe("delay expressions", () => {
		it("should evaluate the expression (function) to determine the delay", () => {
			jest.useFakeTimers();
			const spy = jest.fn();
			const context = {
				delay: 500,
			};
			const machine = createMachine(
				{
					initial: "inactive",
					context,
					states: {
						inactive: {
							after: { myDelay: "active" },
						},
						active: {},
					},
				},
				{
					delays: {
						myDelay: ({ context }) => {
							spy(context);
							return context.delay;
						},
					},
				},
			);

			const actor = createActor(machine).start();

			expect(spy).toBeCalledWith(context);
			expect(actor.getSnapshot().value).toBe("inactive");

			jest.advanceTimersByTime(300);
			expect(actor.getSnapshot().value).toBe("inactive");

			jest.advanceTimersByTime(200);
			expect(actor.getSnapshot().value).toBe("active");
		});

		it("should evaluate the expression (string) to determine the delay", () => {
			jest.useFakeTimers();
			const spy = jest.fn();
			const machine = createMachine(
				{
					initial: "inactive",
					states: {
						inactive: {
							on: {
								ACTIVATE: "active",
							},
						},
						active: {
							after: {
								someDelay: "inactive",
							},
						},
					},
				},
				{
					delays: {
						someDelay: ({ event }) => {
							spy(event);
							return event.delay;
						},
					},
				},
			);

			const actor = createActor(machine).start();

			const event = {
				type: "ACTIVATE",
				delay: 500,
			} as const;
			actor.send(event);

			expect(spy).toBeCalledWith(event);
			expect(actor.getSnapshot().value).toBe("active");

			jest.advanceTimersByTime(300);
			expect(actor.getSnapshot().value).toBe("active");

			jest.advanceTimersByTime(200);
			expect(actor.getSnapshot().value).toBe("inactive");
		});
	});
});
