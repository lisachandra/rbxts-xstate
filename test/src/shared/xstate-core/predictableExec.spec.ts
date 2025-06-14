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
import {
	AnyActor,
	assign,
	createMachine,
	createActor,
	sendTo,
	waitFor,
	AnyObject,
} from "@rbxts/xstate";
import { raise, sendParent, stopChild } from "@rbxts/xstate/out/actions";
import { fromCallback, fromPromise } from "@rbxts/xstate/out/actors/index";

describe("predictableExec", () => {
	it("should call mixed custom and builtin actions in the definitions order", () => {
		const actual: string[] = [];

		const machine = createMachine({
			initial: "a",
			context: {},
			states: {
				a: {
					on: { NEXT: "b" },
				},
				b: {
					entry: [
						() => {
							actual.push("custom");
						},
						assign(() => {
							actual.push("assign");
							return {};
						}),
					],
				},
			},
		});

		const service = createActor(machine).start();
		service.send({ type: "NEXT" });

		expect(actual).toEqual(["custom", "assign"]);
	});

	it("should call initial custom actions when starting a service", () => {
		let called = false;
		const machine = createMachine({
			entry: () => {
				called = true;
			},
		});

		expect(called).toBe(false);

		createActor(machine).start();

		expect(called).toBe(true);
	});

	it("should resolve initial assign actions before starting a service", () => {
		const machine = createMachine({
			context: {
				called: false,
			},
			entry: [
				assign({
					called: true,
				}),
			],
		});

		expect(createActor(machine).getSnapshot().context.called).toBe(true);
	});

	it("should call raised transition custom actions with raised event", () => {
		let eventArg: defined = undefined as never;
		const machine = createMachine({
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					on: {
						RAISED: {
							target: "c",
							actions: ({ event }) => (eventArg = event),
						},
					},
					entry: raise({ type: "RAISED" }),
				},
				c: {},
			},
		});

		const service = createActor(machine).start();
		service.send({ type: "NEXT" });

		expect((eventArg as AnyObject).type).toBe("RAISED");
	});

	it("should call raised transition builtin actions with raised event", () => {
		let eventArg: defined = undefined as never;
		const machine = createMachine({
			context: {},
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					on: {
						RAISED: {
							target: "c",
							actions: assign(({ event }) => {
								eventArg = event;
								return {};
							}),
						},
					},
					entry: raise({ type: "RAISED" }),
				},
				c: {},
			},
		});

		const service = createActor(machine).start();
		service.send({ type: "NEXT" });

		expect((eventArg as AnyObject).type).toBe("RAISED");
	});

	it("should call invoke creator with raised event", () => {
		let eventArg: any;
		const machine = createMachine({
			context: {},
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					on: {
						RAISED: "c",
					},
					entry: raise({ type: "RAISED" }),
				},
				c: {
					invoke: {
						src: fromCallback(({ input }) => {
							eventArg = (input as AnyObject).event;
						}),
						input: ({ event }: AnyObject) => ({ event }),
					},
				},
			},
		});

		const service = createActor(machine).start();
		service.send({ type: "NEXT" });

		expect((eventArg as AnyObject).type).toBe("RAISED");
	});

	it("invoked child should be available on the new state", () => {
		const machine = createMachine({
			context: {},
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					invoke: {
						id: "myChild",
						src: fromCallback(() => {}),
					},
				},
			},
		});

		const service = createActor(machine).start();
		service.send({ type: "NEXT" });

		expect(service.getSnapshot().children.myChild).toBeDefined();
	});

	it("invoked child should not be available on the state after leaving invoking state", () => {
		const machine = createMachine({
			context: {},
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					invoke: {
						id: "myChild",
						src: fromCallback(() => {}),
					},
					on: {
						NEXT: "c",
					},
				},
				c: {},
			},
		});

		const service = createActor(machine).start();
		service.send({ type: "NEXT" });
		service.send({ type: "NEXT" });

		expect(service.getSnapshot().children.myChild).never.toBeDefined();
	});

	it("should correctly provide intermediate context value to a custom action executed in between assign actions", () => {
		let calledWith = 0;
		const machine = createMachine({
			context: {
				counter: 0,
			},
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					entry: [
						assign({ counter: 1 }),
						({ context }) => (calledWith = context.counter),
						assign({ counter: 2 }),
					],
				},
			},
		});

		const service = createActor(machine).start();
		service.send({ type: "NEXT" });

		expect(calledWith).toBe(1);
	});

	it("initial actions should receive context updated only by preceding assign actions", () => {
		const actual: number[] = [];

		const machine = createMachine({
			context: { count: 0 },
			entry: [
				({ context }) => actual.push(context.count),
				assign({ count: 1 }),
				({ context }) => actual.push(context.count),
				assign({ count: 2 }),
				({ context }) => actual.push(context.count),
			],
		});

		createActor(machine).start();

		expect(actual).toEqual([0, 1, 2]);
	});

	it("parent should be able to read the updated state of a child when receiving an event from it", (_, done) => {
		const child = createMachine({
			initial: "a",
			states: {
				a: {
					// we need to clear the call stack before we send the event to the parent
					after: {
						1: "b",
					},
				},
				b: {
					entry: sendParent({ type: "CHILD_UPDATED" }),
				},
			},
		});

		let service: AnyActor = undefined as never;

		const machine = createMachine({
			invoke: {
				id: "myChild",
				src: child,
			},
			initial: "initial",
			states: {
				initial: {
					on: {
						CHILD_UPDATED: [
							{
								guard: () => {
									return (
										(
											service.getSnapshot() as {
												children: { myChild: { getSnapshot(): AnyObject } };
											}
										).children.myChild.getSnapshot().value === "b"
									);
								},
								target: "success",
							},
							{
								target: "fail",
							},
						],
					},
				},
				success: {
					type: "final",
				},
				fail: {
					type: "final",
				},
			},
		});

		service = createActor(machine);
		service.subscribe({
			complete: () => {
				expect((service.getSnapshot() as AnyObject).value).toBe("success");
				done();
			},
		});
		service.start();
	});

	it("should be possible to send immediate events to initially invoked actors", () => {
		const child = createMachine({
			on: {
				PING: {
					actions: sendParent({ type: "PONG" }),
				},
			},
		});

		const machine = createMachine({
			initial: "waiting",
			states: {
				waiting: {
					invoke: {
						id: "ponger",
						src: child,
					},
					entry: sendTo("ponger", { type: "PING" }),
					on: {
						PONG: "done",
					},
				},
				done: {
					type: "final",
				},
			},
		});

		const service = createActor(machine).start();

		expect(service.getSnapshot().value).toBe("done");
	});

	it("should create invoke based on context updated by entry actions of the same state", (_, done) => {
		const machine = createMachine({
			context: {
				updated: false,
			},
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					entry: assign({ updated: true }),
					invoke: {
						src: fromPromise(({ input }) => {
							expect((input as AnyObject).updated).toBe(true);
							done();
							return Promise.resolve();
						}),
						input: ({ context }: AnyObject) => ({
							updated: (context as AnyObject).updated,
						}),
					},
				},
			},
		});

		const actorRef = createActor(machine).start();
		actorRef.send({ type: "NEXT" });
	});

	it("should deliver events sent from the entry actions to a service invoked in the same state", () => {
		let received: any;

		const machine = createMachine({
			context: {
				updated: false,
			},
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					entry: sendTo("myChild", { type: "KNOCK_KNOCK" }),
					invoke: {
						id: "myChild",
						src: createMachine({
							on: {
								"*": {
									actions: ({ event }) => {
										received = event;
									},
								},
							},
						}),
					},
				},
			},
		});

		const service = createActor(machine).start();
		service.send({ type: "NEXT" });

		expect(received).toEqual({ type: "KNOCK_KNOCK" });
	});

	it("parent should be able to read the updated state of a child when receiving an event from it", (_, done) => {
		const child = createMachine({
			initial: "a",
			states: {
				a: {
					// we need to clear the call stack before we send the event to the parent
					after: {
						1: "b",
					},
				},
				b: {
					entry: sendParent({ type: "CHILD_UPDATED" }),
				},
			},
		});

		let service: AnyActor = undefined as never;

		const machine = createMachine({
			invoke: {
				id: "myChild",
				src: child,
			},
			initial: "initial",
			states: {
				initial: {
					on: {
						CHILD_UPDATED: [
							{
								guard: () =>
									(
										service.getSnapshot() as {
											children: { myChild: { getSnapshot(): AnyObject } };
										}
									).children.myChild.getSnapshot().value === "b",
								target: "success",
							},
							{
								target: "fail",
							},
						],
					},
				},
				success: {
					type: "final",
				},
				fail: {
					type: "final",
				},
			},
		});

		service = createActor(machine);
		service.subscribe({
			complete: () => {
				expect((service.getSnapshot() as AnyObject).value).toBe("success");
				done();
			},
		});
		service.start();
	});

	it("should be possible to send immediate events to initially invoked actors", () => {
		const child = createMachine({
			on: {
				PING: {
					actions: sendParent({ type: "PONG" }),
				},
			},
		});

		const machine = createMachine({
			initial: "waiting",
			states: {
				waiting: {
					invoke: {
						id: "ponger",
						src: child,
					},
					entry: sendTo("ponger", { type: "PING" }),
					on: {
						PONG: "done",
					},
				},
				done: {
					type: "final",
				},
			},
		});

		const service = createActor(machine).start();

		expect(service.getSnapshot().value).toBe("done");
	});

	// https://github.com/statelyai/xstate/issues/3617
	it("should deliver events sent from the exit actions to a service invoked in the same state", (_, done) => {
		const machine = createMachine({
			initial: "active",
			states: {
				active: {
					invoke: {
						id: "my-service",
						src: fromCallback(({ receive }) => {
							receive(event => {
								if ((event as AnyObject).type === "MY_EVENT") {
									done();
								}
							});
						}),
					},
					exit: sendTo("my-service", { type: "MY_EVENT" }),
					on: {
						TOGGLE: "inactive",
					},
				},
				inactive: {},
			},
		});

		const actor = createActor(machine).start();

		actor.send({ type: "TOGGLE" });
	});
});
