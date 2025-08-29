import { beforeEach, describe, it, expect, jest, afterEach } from "@rbxts/jest-globals";

import * as LuauPolyfill from "@rbxts/luau-polyfill";
const { Error, Object, setTimeout } = LuauPolyfill;

beforeEach(() => {
	jest.mock<typeof import("@rbxts/luau-polyfill")>(polyfillModule, () => LuauPolyfill);
});

import { EventTarget, Event } from "@rbxts/whatwg-event-target";
import { getModuleByTree } from "test/utils";

import { sleep } from "test/env-utils";
import {
	ActorLogicFrom,
	ActorRefFrom,
	AnyActor,
	AnyEventObject,
	assign,
	createActor,
	createMachine,
	emit,
	fromCallback,
	fromPromise,
	fromTransition,
	setup,
} from "@rbxts/xstate";

const polyfillModule = getModuleByTree(...$getModuleTree("@rbxts/luau-polyfill"));

class ErrorEvent extends Event<"error"> {
	// @ts-expect-error
	error: Error;
	constructor(err: LuauPolyfill.Error) {
		super("error", { cancelable: true });
		rawset(this, "error", err);
	}
}

const window = new EventTarget<{ error: ErrorEvent }, "strict">();

const cleanups: (() => void)[] = [];
function installGlobalOnErrorHandler(handler: (self: typeof window, ev: ErrorEvent) => void) {
	const { Error: errorConstructor } = LuauPolyfill;
	const originalErrorConstructor = errorConstructor["new" as never];

	// FIXME: Prevent default doesn't do anything here?
	// let allowed = true;
	const errorSpy = jest.fn(message => {
		const errorObject = errorConstructor(message);

		// if (allowed) {
		const ev = new ErrorEvent(errorObject);
		window.dispatchEvent(ev);
		// 	allowed = ev.defaultPrevented()
		// }

		return errorObject;
	});

	errorConstructor["new" as never] = errorSpy as never;

	window.addEventListener("error", handler);
	cleanups.push(() => {
		window.removeEventListener("error", handler);
		errorConstructor["new" as never] = originalErrorConstructor as never;
		errorSpy.mockRestore();
	});
}

describe("error handling", () => {
	afterEach(() => {
		cleanups.forEach(cleanup => cleanup());
		cleanups.clear();
	});

	// https://github.com/statelyai/xstate/issues/4004
	it("does not cause an infinite loop when an error is thrown in subscribe", (_, done) => {
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("no_infinite_loop_when_error_is_thrown_in_subscribe");
			done();
		});

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

		const errorSpy = jest.fn().mockImplementation(() => {
			throw new Error("no_infinite_loop_when_error_is_thrown_in_subscribe");
		});

		const actor = createActor(machine).start();

		actor.subscribe(errorSpy);

		actor.send({ type: "activate" });

		expect(errorSpy).toHaveBeenCalledTimes(1);
	});

	it(`doesn't crash the actor when an error is thrown in subscribe`, (_, done) => {
		const errorSpy = jest.fn();

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
							actions: errorSpy,
						},
					},
				},
			},
		});

		// eslint-disable-next-line prefer-const
		let actor: ActorRefFrom<typeof machine>;
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual(
				"doesnt_crash_actor_when_error_is_thrown_in_subscribe",
			);

			sleep(0).await();

			actor.send({ type: "do" });
			expect(errorSpy).toHaveBeenCalledTimes(1);

			done();
		});

		const subscriber = jest.fn().mockImplementationOnce(() => {
			throw new Error("doesnt_crash_actor_when_error_is_thrown_in_subscribe");
		});

		actor = createActor(machine).start();

		actor.subscribe(subscriber);

		actor.send({ type: "activate" });

		expect(subscriber).toHaveBeenCalledTimes(1);
		expect(actor.getSnapshot().status).toEqual("active");
	});

	it(`doesn't notify error listener when an error is thrown in subscribe`, (_, done) => {
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual(
				"doesnt_notify_error_listener_when_error_is_thrown_in_subscribe",
			);
			done();
		});

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
	});

	it("unhandled sync errors thrown when starting a child actor should be reported globally", (_, done) => {
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("unhandled_sync_error_in_actor_start");
			done();
		});

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
	});

	it("unhandled rejection of a promise actor should be reported globally in absence of error listener", (_, done) => {
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual(
				"unhandled_rejection_in_promise_actor_without_error_listener",
			);
			done();
		});

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

		const snapshot = actorRef.getSnapshot();
		const expectedErrorMessage = `unhandled_rejection_in_promise_actor_with_parent_listener`;

		expect(snapshot.status).toBe("error");
		expect(snapshot.error).toHaveProperty("message", expectedErrorMessage);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect((errorSpy.mock.calls as any[][][])[0][0]).toHaveProperty(
			"message",
			expectedErrorMessage,
		);
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

		const snapshot = actorRef.getSnapshot();
		const expectedErrorMessage = `unhandled_rejection_in_promise_actor_with_grandparent_listener`;

		expect(snapshot.status).toBe("error");
		expect(snapshot.error).toHaveProperty("message", expectedErrorMessage);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect((errorSpy.mock.calls as any[][][])[0][0]).toHaveProperty(
			"message",
			expectedErrorMessage,
		);
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

		/*
		installGlobalOnErrorHandler((_, ev) => {
			done(new Error());
		});
		*/

		setTimeout(() => {
			done();
		}, 10);
	});

	it("handled sync errors thrown when starting a child actor should be reported globally when not all of its own observers come with an error listener", (_, done) => {
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("handled_sync_error_in_actor_start");
			done();
		});

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

		/*
		installGlobalOnErrorHandler((_, ev) => {
			done(new Error());
		});
		*/

		setTimeout(() => {
			done();
		}, 10);
	});

	it("unhandled sync errors thrown when starting a child actor should be reported twice globally when not all of its own observers come with an error listener and when the root has no error listener of its own", (_, done) => {
		const actual: string[] = [];
		installGlobalOnErrorHandler((_, ev) => {
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

		const machine = createMachine({
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: fromCallback(() => {
							// FIXME: Error is created once but reported twice in the original tests, figure out a way to solve this
							new Error("handled_sync_error_in_actor_start");
							// fixme end
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

		const snapshot = actorRef.getSnapshot();
		const expectedErrorMessage = `unhandled_sync_error_in_actor_start_with_root_error_listener`;

		expect(snapshot.status).toBe("error");
		expect(snapshot.error).toHaveProperty("message", expectedErrorMessage);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect((errorSpy.mock.calls as any[][][])[0][0]).toHaveProperty(
			"message",
			expectedErrorMessage,
		);
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

		/*
		installGlobalOnErrorHandler((_, ev) => {
			done(new Error());
		});
		*/

		setTimeout(() => {
			done();
		}, 10);
	});

	it(`handled sync errors thrown when starting an actor shouldn't crash the parent`, () => {
		const errorSpy = jest.fn();

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
							actions: errorSpy,
						},
					},
				},
			},
		});

		const actorRef = createActor(machine);
		actorRef.start();

		expect(actorRef.getSnapshot().status).toBe("active");

		actorRef.send({ type: "do" });
		expect(errorSpy).toHaveBeenCalledTimes(1);
	});

	it(`unhandled sync errors thrown when starting an actor should crash the parent`, (_, done) => {
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("unhandled_sync_error_in_actor_start");
			done();
		});

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
	});

	it(`error thrown by the error listener should be reported globally`, (_, done) => {
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual("error_thrown_by_error_listener");
			done();
		});

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
	});

	it(`error should be reported globally if not every observer comes with an error listener`, (_, done) => {
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			expect(ev.error.message).toEqual(
				"error_thrown_when_not_every_observer_comes_with_an_error_listener",
			);
			done();
		});

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
	});

	it(`uncaught error and an error thrown by the error listener should both be reported globally when not every observer comes with an error listener`, (_, done) => {
		const actual: string[] = [];
		installGlobalOnErrorHandler((_, ev) => {
			ev.preventDefault();
			actual.push(ev.error.message);

			if (actual.size() === 2) {
				const sortedActual = [...actual].sort();
				const sortedExpected = [
					"error_thrown_by_error_listener",
					"error_thrown_when_not_every_observer_comes_with_an_error_listener",
				].sort();

				expect(sortedActual).toEqual(sortedExpected);
				done();
			}
		});

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
		const expectedErrorMessage = `error_thrown_in_initial_entry_action`;

		expect(snapshot.status).toBe("error");
		expect(snapshot.error).toHaveProperty("message", expectedErrorMessage);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect((errorSpy.mock.calls as any[][][])[0][0]).toHaveProperty(
			"message",
			expectedErrorMessage,
		);
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
		const expectedErrorMessage = `error_thrown_when_resolving_initial_entry_action`;

		expect(snapshot.status).toBe("error");
		expect(snapshot.error).toHaveProperty("message", expectedErrorMessage);

		actorRef.subscribe({
			error: errorSpy,
		});
		actorRef.start();

		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect((errorSpy.mock.calls as any[][][])[0][0]).toHaveProperty(
			"message",
			expectedErrorMessage,
		);
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
		const expectedErrorMessage = `error_thrown_in_a_custom_entry_action_when_transitioning`;

		expect(snapshot.status).toBe("error");
		expect(snapshot.error).toHaveProperty("message", expectedErrorMessage);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect((errorSpy.mock.calls as any[][][])[0][0]).toHaveProperty(
			"message",
			expectedErrorMessage,
		);
	});

	it(`shouldn't execute deferred initial actions that come after an action that errors`, () => {
		const errorSpy = jest.fn();

		const machine = createMachine({
			entry: [
				() => {
					throw new Error("error_thrown_in_initial_entry_action");
				},
				errorSpy,
			],
		});

		const actorRef = createActor(machine);
		actorRef.subscribe({ error: () => {} });
		actorRef.start();

		expect(errorSpy).toHaveBeenCalledTimes(0);
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
		const errorSpy = jest.fn();
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
			error: errorSpy,
		});
		actorRef.start();

		actorRef.send({ type: "NEXT" });

		const snapshot = actorRef.getSnapshot();
		const expectedErrorMessage = `Unable to evaluate guard in transition for event 'NEXT' in state node '(machine).a':
Error: error_thrown_in_guard_when_transitioning`;

		expect(snapshot.status).toBe("error");
		expect(snapshot.error).toHaveProperty("message", expectedErrorMessage);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect((errorSpy.mock.calls as any[][][])[0][0]).toHaveProperty(
			"message",
			expectedErrorMessage,
		);
	});

	it("actor continues to work normally after emit callback errors", async () => {
		const machine = setup({
			types: {
				emitted: {} as { type: "emitted"; foo: string },
			},
		}).createMachine({
			on: {
				someEvent: {
					actions: emit({ type: "emitted", foo: "bar" }),
				},
			},
		});

		const actor = createActor(machine).start();

		let errorThrown = false;

		actor.on("emitted", () => {
			errorThrown = true;

			throw new Error("oops");
		});

		// Send first event - should trigger error but actor should remain active

		actor.send({ type: "someEvent" });

		await new Promise(resolve => setTimeout(resolve, 10, undefined));

		expect(errorThrown).toBe(true);

		expect(actor.getSnapshot().status).toEqual("active");

		// Send second event - should work normally without error

		const event = await new Promise<AnyEventObject>(res => {
			actor.on("emitted", res);

			actor.send({ type: "someEvent" });
		});

		expect(event.foo).toBe("bar");

		expect(actor.getSnapshot().status).toEqual("active");
	});
});
