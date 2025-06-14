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
import { sleep } from "test/env-utils";
import {
	AnyObject,
	assign,
	createActor,
	createMachine,
	fromCallback,
	fromPromise,
	fromTransition,
} from "@rbxts/xstate";
import { Error, Object, setTimeout } from "@rbxts/luau-polyfill";
import { EventTarget, Event } from "@rbxts/whatwg-event-target";

class ErrorEvent extends Event<"error"> {
	// @ts-expect-error
	error: Error;
	constructor(err: Error) {
		super("error");
		rawset(this, "error", err);
	}
}
const ev = new ErrorEvent(undefined as never);

const originalConsoleError = (jest as never as { globalEnv: { error: jest.Mock } }).globalEnv.error;
const window = new EventTarget<{ error: ErrorEvent }, "strict">();

const cleanups: (() => void)[] = [];
function installGlobalOnErrorHandler(handler: () => void) {
	const spy = jest
		.spyOn((jest as never as { globalEnv: { error: jest.Mock } }).globalEnv, "error")
		.mockImplementation((err: unknown) => {
			if (ev.defaultPrevented()) {
				return;
			}

			if (err instanceof Error) {
				rawset(ev, "error", err);
				window.dispatchEvent(ev);
				return;
			}

			originalConsoleError(err);
		});

	window.addEventListener("error", handler);
	cleanups.push(() => {
		window.removeEventListener("error", handler);
		spy.mockRestore();
		ev.initEvent("error");
	});
}

afterEach(() => {
	cleanups.forEach(cleanup => cleanup());
	cleanups.clear();
});

describe("error handling", () => {
	// https://github.com/statelyai/xstate/issues/4004
	it("does not cause an infinite loop when an error is thrown in subscribe", (_, done) => {
		const machine = createMachine({
			id: "machine",
			initial: "initial",
			context: {
				count: 0,
			},
			states: {
				initial: {
					on: { activate: "active" },
				},
				active: {},
			},
		});

		const spy = jest.fn().mockImplementation(() => {
			throw new Error("no_infinite_loop_when_error_is_thrown_in_subscribe");
		});

		const actor = createActor(machine).start();

		actor.subscribe(spy);

		actor.send({ type: "activate" });

		expect(spy).toHaveBeenCalledTimes(1);

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("no_infinite_loop_when_error_is_thrown_in_subscribe");
			done();
		});
	});

	it(`doesn't crash the actor when an error is thrown in subscribe`, (_, done) => {
		const spy = jest.fn();

		const machine = createMachine({
			id: "machine",
			initial: "initial",
			context: {
				count: 0,
			},
			states: {
				initial: {
					on: { activate: "active" },
				},
				active: {
					on: {
						do: {
							actions: spy,
						},
					},
				},
			},
		});

		const subscriber = jest.fn().mockImplementationOnce(() => {
			throw new Error("doesnt_crash_actor_when_error_is_thrown_in_subscribe");
		});

		const actor = createActor(machine).start();

		actor.subscribe(subscriber);

		actor.send({ type: "activate" });

		expect(subscriber).toHaveBeenCalledTimes(1);
		expect(actor.getSnapshot().status).toEqual("active");

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual(
				"doesnt_crash_actor_when_error_is_thrown_in_subscribe",
			);

			actor.send({ type: "do" });
			expect(spy).toHaveBeenCalledTimes(1);

			done();
		});
	});

	it(`doesn't notify error listener when an error is thrown in subscribe`, (_, done) => {
		const machine = createMachine({
			id: "machine",
			initial: "initial",
			context: {
				count: 0,
			},
			states: {
				initial: {
					on: { activate: "active" },
				},
				active: {},
			},
		});

		const nextSpy = jest.fn().mockImplementation(() => {
			throw new Error("doesnt_notify_error_listener_when_error_is_thrown_in_subscribe");
		});
		const errorSpy = jest.fn();

		const actor = createActor(machine).start();

		actor.subscribe({
			next: nextSpy,
			error: errorSpy,
		});

		actor.send({ type: "activate" });

		expect(nextSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy).toHaveBeenCalledTimes(0);

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual(
				"doesnt_notify_error_listener_when_error_is_thrown_in_subscribe",
			);
			done();
		});
	});

	it("unhandled sync errors thrown when starting a child actor should be reported globally", (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("unhandled_sync_error_in_actor_start");
						}),
						onDone: "success",
					},
				},
				success: {
					type: "final",
				},
			},
		});

		createActor(machine).start();

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("unhandled_sync_error_in_actor_start");
			done();
		});
	});

	it("unhandled rejection of a promise actor should be reported globally in absence of error listener", (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromPromise(() =>
							Promise.reject(
								new Error(
									"unhandled_rejection_in_promise_actor_without_error_listener",
								),
							),
						),
						onDone: "success",
					},
				},
				success: {
					type: "final",
				},
			},
		});

		createActor(machine).start();

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual(
				"unhandled_rejection_in_promise_actor_without_error_listener",
			);
			done();
		});
	});

	it("unhandled rejection of a promise actor should be reported to the existing error listener of its parent", async () => {
		const errorSpy = jest.fn();

		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromPromise(() =>
							Promise.reject(
								new Error(
									"unhandled_rejection_in_promise_actor_with_parent_listener",
								),
							),
						),
						onDone: "success",
					},
				},
				success: {
					type: "final",
				},
			},
		});

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		await sleep(0);

		expect((errorSpy as jest.Mock).mock.calls).toEqual([
			[["Error: unhandled_rejection_in_promise_actor_with_parent_listener"]],
		]);
	});

	it("unhandled rejection of a promise actor should be reported to the existing error listener of its grandparent", async () => {
		const errorSpy = jest.fn();

		const child = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromPromise(() =>
							Promise.reject(
								new Error(
									"unhandled_rejection_in_promise_actor_with_grandparent_listener",
								),
							),
						),
						onDone: "success",
					},
				},
				success: {
					type: "final",
				},
			},
		});

		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: child,
						onDone: "success",
					},
				},
				success: {
					type: "final",
				},
			},
		});

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		await sleep(0);

		expect((errorSpy as jest.Mock).mock.calls).toEqual([
			[["Error: unhandled_rejection_in_promise_actor_with_grandparent_listener"]],
		]);
	});

	it("handled sync errors thrown when starting a child actor should not be reported globally", (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("handled_sync_error_in_actor_start");
						}),
						onError: "failed",
					},
				},
				failed: {
					type: "final",
				},
			},
		});

		createActor(machine).start();

		installGlobalOnErrorHandler(() => {
			done(new Error());
		});

		setTimeout(() => {
			done();
		}, 10);
	});

	it("handled sync errors thrown when starting a child actor should be reported globally when not all of its own observers come with an error listener", (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("handled_sync_error_in_actor_start");
						}),
						onError: "failed",
					},
				},
				failed: {
					type: "final",
				},
			},
		});

		const actorRef = createActor(machine);
		const childActorRef = Object.values(actorRef.getSnapshot().children)[0];
		childActorRef.subscribe({
			error: () => {},
		});
		childActorRef.subscribe(() => {});
		actorRef.start();

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("handled_sync_error_in_actor_start");
			done();
		});
	});

	it("handled sync errors thrown when starting a child actor should not be reported globally when all of its own observers come with an error listener", (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("handled_sync_error_in_actor_start");
						}),
						onError: "failed",
					},
				},
				failed: {
					type: "final",
				},
			},
		});

		const actorRef = createActor(machine);
		const childActorRef = Object.values(actorRef.getSnapshot().children)[0];
		childActorRef.subscribe({
			error: () => {},
		});
		childActorRef.subscribe({
			error: () => {},
		});
		actorRef.start();

		installGlobalOnErrorHandler(() => {
			done(new Error());
		});

		setTimeout(() => {
			done();
		}, 10);
	});

	it("unhandled sync errors thrown when starting a child actor should be reported twice globally when not all of its own observers come with an error listener and when the root has no error listener of its own", (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("handled_sync_error_in_actor_start");
						}),
					},
				},
			},
		});

		const actorRef = createActor(machine);
		const childActorRef = Object.values(actorRef.getSnapshot().children)[0];
		childActorRef.subscribe({
			error: () => {},
		});
		childActorRef.subscribe({});
		actorRef.start();

		const actual: string[] = [];

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			actual.push(ev.error.message);

			if (actual.size() === 2) {
				expect(actual).toEqual([
					"handled_sync_error_in_actor_start",
					"handled_sync_error_in_actor_start",
				]);
				done();
			}
		});
	});

	it(`handled sync errors shouldn't notify the error listener`, () => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("handled_sync_error_in_actor_start");
						}),
						onError: "failed",
					},
				},
				failed: {
					type: "final",
				},
			},
		});

		const errorSpy = jest.fn();

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		expect(errorSpy).toHaveBeenCalledTimes(0);
	});

	it(`unhandled sync errors should notify the root error listener`, () => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error(
								"unhandled_sync_error_in_actor_start_with_root_error_listener",
							);
						}),
						onDone: "success",
					},
				},
				success: {
					type: "final",
				},
			},
		});

		const errorSpy = jest.fn();

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		expect((errorSpy as jest.Mock).mock.calls).toEqual([
			[["Error: unhandled_sync_error_in_actor_start_with_root_error_listener"]],
		]);
	});

	it(`unhandled sync errors should not notify the global listener when the root error listener is present`, (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error(
								"unhandled_sync_error_in_actor_start_with_root_error_listener",
							);
						}),
						onDone: "success",
					},
				},
				success: {
					type: "final",
				},
			},
		});

		const errorSpy = jest.fn();

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		expect(errorSpy).toHaveBeenCalledTimes(1);

		installGlobalOnErrorHandler(() => {
			done(new Error());
		});

		setTimeout(() => {
			done();
		}, 10);
	});

	it(`handled sync errors thrown when starting an actor shouldn't crash the parent`, () => {
		const spy = jest.fn();

		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("handled_sync_error_in_actor_start");
						}),
						onError: "failed",
					},
				},
				failed: {
					on: {
						do: {
							actions: spy,
						},
					},
				},
			},
		});

		const actorRef = createActor(machine);
		actorRef.start();

		expect(actorRef.getSnapshot().status).toBe("active");

		actorRef.send({ type: "do" });
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it(`unhandled sync errors thrown when starting an actor should crash the parent`, (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("unhandled_sync_error_in_actor_start");
						}),
					},
				},
			},
		});

		const actorRef = createActor(machine);
		actorRef.start();

		expect(actorRef.getSnapshot().status).toBe("error");

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("unhandled_sync_error_in_actor_start");
			done();
		});
	});

	it(`error thrown by the error listener should be reported globally`, (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error("handled_sync_error_in_actor_start");
						}),
					},
				},
			},
		});

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: () => {
				throw new Error("error_thrown_by_error_listener");
			},
		});
		actorRef.start();

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("error_thrown_by_error_listener");
			done();
		});
	});

	it(`error should be reported globally if not every observer comes with an error listener`, (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error(
								"error_thrown_when_not_every_observer_comes_with_an_error_listener",
							);
						}),
					},
				},
			},
		});

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: () => {},
		});
		actorRef.subscribe(() => {});
		actorRef.start();

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			expect(ev.error.message).toEqual(
				"error_thrown_when_not_every_observer_comes_with_an_error_listener",
			);
			done();
		});
	});

	it(`uncaught error and an error thrown by the error listener should both be reported globally when not every observer comes with an error listener`, (_, done) => {
		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							throw new Error(
								"error_thrown_when_not_every_observer_comes_with_an_error_listener",
							);
						}),
					},
				},
			},
		});

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: () => {
				throw new Error("error_thrown_by_error_listener");
			},
		});
		actorRef.subscribe(() => {});
		actorRef.start();

		const actual: string[] = [];

		installGlobalOnErrorHandler(() => {
			ev.preventDefault();
			actual.push(ev.error.message);

			if (actual.size() === 2) {
				expect(actual).toEqual([
					"error_thrown_by_error_listener",
					"error_thrown_when_not_every_observer_comes_with_an_error_listener",
				]);
				done();
			}
		});
	});

	it("error thrown in initial custom entry action should error the actor", () => {
		const machine = createMachine({
			entry: () => {
				throw new Error("error_thrown_in_initial_entry_action");
			},
		});

		const errorSpy = jest.fn();

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		const snapshot = actorRef.getSnapshot();
		expect(snapshot.status).toBe("error");

		expect(snapshot.error).toEqual(`[Error: error_thrown_in_initial_entry_action]`);

		expect((errorSpy as jest.Mock).mock.calls).toEqual([
			[["Error: error_thrown_in_initial_entry_action"]],
		]);
	});

	it("error thrown when resolving initial builtin entry action should error the actor immediately", () => {
		const machine = createMachine({
			entry: assign(() => {
				throw new Error("error_thrown_when_resolving_initial_entry_action");
			}),
		});

		const errorSpy = jest.fn();

		const actorRef = createActor(machine);

		const snapshot = actorRef.getSnapshot();
		expect(snapshot.status).toBe("error");

		expect(snapshot.error).toEqual(`[Error: error_thrown_when_resolving_initial_entry_action]`);

		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		expect((errorSpy as jest.Mock).mock.calls).toEqual([
			[["Error: error_thrown_when_resolving_initial_entry_action"]],
		]);
	});

	it("error thrown by a custom entry action when transitioning should error the actor", () => {
		const machine = createMachine({
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					entry: () => {
						throw new Error("error_thrown_in_a_custom_entry_action_when_transitioning");
					},
				},
			},
		});

		const errorSpy = jest.fn();

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		actorRef.send({ type: "NEXT" });

		const snapshot = actorRef.getSnapshot();
		expect(snapshot.status).toBe("error");

		expect(snapshot.error).toEqual(
			`[Error: error_thrown_in_a_custom_entry_action_when_transitioning]`,
		);

		expect((errorSpy as jest.Mock).mock.calls).toEqual([
			[["Error: error_thrown_in_a_custom_entry_action_when_transitioning"]],
		]);
	});

	it(`shouldn't execute deferred initial actions that come after an action that errors`, () => {
		const spy = jest.fn();

		const machine = createMachine({
			entry: [
				() => {
					throw new Error("error_thrown_in_initial_entry_action");
				},
				spy,
			],
		});

		const actorRef = createActor(machine);
		actorRef.subscribe({ error: () => {} });
		actorRef.start();

		expect(spy).toHaveBeenCalledTimes(0);
	});

	it("should error the parent on errored initial state of a child", async () => {
		const immediateFailure = fromTransition(_ => undefined, undefined);
		immediateFailure.getInitialSnapshot = () => ({
			status: "error",
			output: undefined,
			error: "immediate error!",
			context: undefined,
			trace: "",
		});

		const machine = createMachine(
			{
				invoke: {
					src: "failure",
				},
			},
			{
				actors: {
					failure: immediateFailure,
				},
			},
		);

		const actorRef = createActor(machine);
		actorRef.subscribe({ error: () => {} });
		actorRef.start();

		const snapshot = actorRef.getSnapshot();

		expect(snapshot.status).toBe("error");
		expect(snapshot.error).toBe("immediate error!");
	});

	it("should error when a guard throws when transitioning", () => {
		const spy = jest.fn();
		const machine = createMachine({
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: {
							guard: () => {
								throw new Error("error_thrown_in_guard_when_transitioning");
							},
							target: "b",
						},
					},
				},
				b: {},
			},
		});

		const actorRef = createActor(machine);
		actorRef.subscribe({
			error: spy,
		});
		actorRef.start();

		actorRef.send({ type: "NEXT" });

		const snapshot = actorRef.getSnapshot();
		expect(snapshot.status).toBe("error");

		expect(snapshot.error).toEqual([
			`Error: Unable to evaluate guard in transition for event 'NEXT' in state node '(machine).a':
      error_thrown_in_guard_when_transitioning`,
		]);
	});
});
