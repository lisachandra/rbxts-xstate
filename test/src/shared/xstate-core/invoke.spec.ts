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
import { JSON } from "@rbxts/xstate/out/utils/polyfill/json";
// import { interval, of } from "rxjs";
// import { map, take } from "rxjs/operators";
import { forwardTo, raise, sendTo } from "@rbxts/xstate/out/actions";
import {
	PromiseActorLogic,
	fromCallback,
	fromEventObservable,
	fromObservable,
	fromPromise,
	fromTransition,
} from "@rbxts/xstate/out/actors/index";
import {
	ActorLogic,
	ActorScope,
	EventObject,
	SpecialTargets,
	StateValue,
	assign,
	createMachine,
	createActor,
	sendParent,
	Snapshot,
	ActorRef,
	AnyEventObject,
	AnyObject,
} from "@rbxts/xstate";
import { sleep } from "test/env-utils";
import { clearInterval, Error, setInterval, setTimeout } from "@rbxts/luau-polyfill";
import { HttpService } from "@rbxts/services";

const user = { name: "David" };

describe("invoke", () => {
	it("child can immediately respond to the parent with multiple events", () => {
		const childMachine = createMachine({
			types: {} as {
				events: { type: "FORWARD_DEC" };
			},
			id: "child",
			initial: "init",
			states: {
				init: {
					on: {
						FORWARD_DEC: {
							actions: [
								sendParent({ type: "DEC" }),
								sendParent({ type: "DEC" }),
								sendParent({ type: "DEC" }),
							],
						},
					},
				},
			},
		});

		const someParentMachine = createMachine(
			{
				id: "parent",
				types: {} as {
					context: { count: number };
					actors: {
						src: "child";
						id: "someService";
						logic: typeof childMachine;
					};
				},
				context: { count: 0 },
				initial: "start",
				states: {
					start: {
						invoke: {
							src: "child",
							id: "someService",
						},
						always: {
							target: "stop",
							guard: ({ context }) => context.count === -3,
						},
						on: {
							DEC: {
								actions: assign({ count: ({ context }) => context.count - 1 }),
							},
							FORWARD_DEC: {
								actions: sendTo("someService", { type: "FORWARD_DEC" }),
							},
						},
					},
					stop: {
						type: "final",
					},
				},
			},
			{
				actors: {
					child: childMachine,
				},
			},
		);

		const actorRef = createActor(someParentMachine).start();
		actorRef.send({ type: "FORWARD_DEC" });

		// 1. The 'parent' machine will not do anything (inert transition)
		// 2. The 'FORWARD_DEC' event will be "forwarded" to the child machine
		// 3. On the child machine, the 'FORWARD_DEC' event sends the 'DEC' action to the parent thrice
		// 4. The context of the 'parent' machine will be updated from 0 to -3
		expect(actorRef.getSnapshot().context).toEqual({ count: -3 });
	});

	it("should start services (explicit machine, invoke = config)", (_, done) => {
		const childMachine = createMachine({
			id: "fetch",
			types: {} as {
				context: { userId: string | undefined; user?: typeof user | undefined };
				events: {
					type: "RESOLVE";
					user: typeof user;
				};
				input: { userId: string };
			},
			context: ({ input }) => ({
				userId: input.userId,
			}),
			initial: "pending",
			states: {
				pending: {
					entry: raise({ type: "RESOLVE", user }),
					on: {
						RESOLVE: {
							target: "success",
							guard: ({ context }) => {
								return context.userId !== undefined;
							},
						},
					},
				},
				success: {
					type: "final",
					entry: assign({
						user: ({ event }) => event.user,
					}),
				},
				failure: {
					entry: sendParent({ type: "REJECT" }),
				},
			},
			output: ({ context }) => ({ user: context.user }),
		});

		const machine = createMachine({
			types: {} as {
				context: {
					selectedUserId: string;
					user?: typeof user;
				};
			},
			id: "fetcher",
			initial: "idle",
			context: {
				selectedUserId: "42",
				user: undefined,
			},
			states: {
				idle: {
					on: {
						GO_TO_WAITING: "waiting",
					},
				},
				waiting: {
					invoke: {
						src: childMachine,
						input: ({ context }: AnyObject) => ({
							userId: (context as AnyObject).selectedUserId,
						}),
						onDone: {
							target: "received",
							guard: ({ event }) => {
								// Should receive { user: { name: 'David' } } as event data
								return (
									(event.output as { user: { name: string } }).user.name ===
									"David"
								);
							},
						},
					},
				},
				received: {
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
		actor.send({ type: "GO_TO_WAITING" });
	});

	it("should start services (explicit machine, invoke = machine)", (_, done) => {
		const childMachine = createMachine({
			types: {} as {
				events: { type: "RESOLVE" };
				input: { userId: string };
			},
			initial: "pending",
			states: {
				pending: {
					entry: raise({ type: "RESOLVE" }),
					on: {
						RESOLVE: {
							target: "success",
						},
					},
				},
				success: {
					type: "final",
				},
			},
		});

		const machine = createMachine({
			initial: "idle",
			states: {
				idle: {
					on: {
						GO_TO_WAITING: "waiting",
					},
				},
				waiting: {
					invoke: {
						src: childMachine,
						onDone: "received",
					},
				},
				received: {
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
		actor.send({ type: "GO_TO_WAITING" });
	});

	it("should start services (machine as invoke config)", (_, done) => {
		const machineInvokeMachine = createMachine({
			types: {} as {
				events: {
					type: "SUCCESS";
					data: number;
				};
			},
			id: "machine-invoke",
			initial: "pending",
			states: {
				pending: {
					invoke: {
						src: createMachine({
							id: "child",
							initial: "sending",
							states: {
								sending: {
									entry: sendParent({ type: "SUCCESS", data: 42 }),
								},
							},
						}),
					},
					on: {
						SUCCESS: {
							target: "success",
							guard: ({ event }) => {
								return event.data === 42;
							},
						},
					},
				},
				success: {
					type: "final",
				},
			},
		});
		const actor = createActor(machineInvokeMachine);
		actor.subscribe({ complete: () => done() });
		actor.start();
	});

	it("should start deeply nested service (machine as invoke config)", (_, done) => {
		const machineInvokeMachine = createMachine({
			types: {} as {
				events: {
					type: "SUCCESS";
					data: number;
				};
			},
			id: "parent",
			initial: "a",
			states: {
				a: {
					initial: "b",
					states: {
						b: {
							invoke: {
								src: createMachine({
									id: "child",
									initial: "sending",
									states: {
										sending: {
											entry: sendParent({ type: "SUCCESS", data: 42 }),
										},
									},
								}),
							},
						},
					},
				},
				success: {
					id: "success",
					type: "final",
				},
			},
			on: {
				SUCCESS: {
					target: ".success",
					guard: ({ event }) => {
						return event.data === 42;
					},
				},
			},
		});
		const actor = createActor(machineInvokeMachine);
		actor.subscribe({ complete: () => done() });
		actor.start();
	});

	it("should use the service overwritten by .provide(...)", (_, done) => {
		const childMachine = createMachine({
			id: "child",
			initial: "init",
			states: {
				init: {},
			},
		});

		const someParentMachine = createMachine(
			{
				id: "parent",
				types: {} as {
					context: { count: number };
					actors: {
						src: "child";
						id: "someService";
						logic: typeof childMachine;
					};
				},
				context: { count: 0 },
				initial: "start",
				states: {
					start: {
						invoke: {
							src: "child",
							id: "someService",
						},
						on: {
							STOP: "stop",
						},
					},
					stop: {
						type: "final",
					},
				},
			},
			{
				actors: {
					child: childMachine,
				},
			},
		);

		const actor = createActor(
			someParentMachine.provide({
				actors: {
					child: createMachine({
						id: "child",
						initial: "init",
						states: {
							init: {
								entry: [sendParent({ type: "STOP" })],
							},
						},
					}),
				},
			}),
		);
		actor.subscribe({
			complete: () => {
				done();
			},
		});
		actor.start();
	});

	describe("parent to child", () => {
		const subMachine = createMachine({
			id: "child",
			initial: "one",
			states: {
				one: {
					on: { NEXT: "two" },
				},
				two: {
					entry: sendParent({ type: "NEXT" }),
				},
			},
		});

		it("should communicate with the child machine (invoke on machine)", (_, done) => {
			const mainMachine = createMachine({
				id: "parent",
				initial: "one",
				invoke: {
					id: "foo-child",
					src: subMachine,
				},
				states: {
					one: {
						entry: sendTo("foo-child", { type: "NEXT" }),
						on: { NEXT: "two" },
					},
					two: {
						type: "final",
					},
				},
			});

			const actor = createActor(mainMachine);
			actor.subscribe({
				complete: () => {
					done();
				},
			});
			actor.start();
		});

		it("should communicate with the child machine (invoke on state)", (_, done) => {
			const mainMachine = createMachine({
				id: "parent",
				initial: "one",
				states: {
					one: {
						invoke: {
							id: "foo-child",
							src: subMachine,
						},
						entry: sendTo("foo-child", { type: "NEXT" }),
						on: { NEXT: "two" },
					},
					two: {
						type: "final",
					},
				},
			});

			const actor = createActor(mainMachine);
			actor.subscribe({
				complete: () => {
					done();
				},
			});
			actor.start();
		});

		it("should transition correctly if child invocation causes it to directly go to final state", () => {
			const doneSubMachine = createMachine({
				id: "child",
				initial: "one",
				states: {
					one: {
						on: { NEXT: "two" },
					},
					two: {
						type: "final",
					},
				},
			});

			const mainMachine = createMachine({
				id: "parent",
				initial: "one",
				states: {
					one: {
						invoke: {
							id: "foo-child",
							src: doneSubMachine,
							onDone: "two",
						},
						entry: sendTo("foo-child", { type: "NEXT" }),
					},
					two: {
						on: { NEXT: "three" },
					},
					three: {
						type: "final",
					},
				},
			});

			const actor = createActor(mainMachine).start();

			expect(actor.getSnapshot().value).toBe("two");
		});

		it("should work with invocations defined in orthogonal state nodes", (_, done) => {
			const pongMachine = createMachine({
				id: "pong",
				initial: "active",
				states: {
					active: {
						type: "final",
					},
				},
				output: { secret: "pingpong" },
			});

			const pingMachine = createMachine({
				id: "ping",
				type: "parallel",
				states: {
					one: {
						initial: "active",
						states: {
							active: {
								invoke: {
									id: "pong",
									src: pongMachine,
									onDone: {
										target: "success",
										guard: ({ event }) =>
											(event.output as AnyObject).secret === "pingpong",
									},
								},
							},
							success: {
								type: "final",
							},
						},
					},
				},
			});

			const actor = createActor(pingMachine);
			actor.subscribe({
				complete: () => {
					done();
				},
			});
			actor.start();
		});

		it("should not reinvoke root-level invocations on root non-reentering transitions", () => {
			// https://github.com/statelyai/xstate/issues/2147

			let invokeCount = 0;
			let invokeDisposeCount = 0;
			let actionsCount = 0;
			let entryActionsCount = 0;

			const machine = createMachine({
				invoke: {
					src: fromCallback(() => {
						invokeCount++;

						return () => {
							invokeDisposeCount++;
						};
					}),
				},
				entry: () => entryActionsCount++,
				on: {
					UPDATE: {
						actions: () => {
							actionsCount++;
						},
					},
				},
			});

			const service = createActor(machine).start();
			expect(entryActionsCount).toEqual(1);
			expect(invokeCount).toEqual(1);
			expect(invokeDisposeCount).toEqual(0);
			expect(actionsCount).toEqual(0);

			service.send({ type: "UPDATE" });
			expect(entryActionsCount).toEqual(1);
			expect(invokeCount).toEqual(1);
			expect(invokeDisposeCount).toEqual(0);
			expect(actionsCount).toEqual(1);

			service.send({ type: "UPDATE" });
			expect(entryActionsCount).toEqual(1);
			expect(invokeCount).toEqual(1);
			expect(invokeDisposeCount).toEqual(0);
			expect(actionsCount).toEqual(2);
		});

		it("should stop a child actor when reaching a final state", () => {
			let actorStopped = false;

			const machine = createMachine({
				id: "machine",
				invoke: {
					src: fromCallback(() => () => (actorStopped = true)),
				},
				initial: "running",
				states: {
					running: {
						on: {
							finished: "complete",
						},
					},
					complete: { type: "final" },
				},
			});

			const service = createActor(machine).start();

			service.send({
				type: "finished",
			});

			expect(actorStopped).toBe(true);
		});

		it("child should not invoke an actor when it transitions to an invoking state when it gets stopped by its parent", (_, done) => {
			let invokeCount = 0;

			const child = createMachine({
				id: "child",
				initial: "idle",
				states: {
					idle: {
						invoke: {
							src: fromCallback(({ sendBack }) => {
								invokeCount++;

								if (invokeCount > 1) {
									// prevent a potential infinite loop
									throw new Error("This should be impossible.");
								}

								// it's important for this test to send the event back when the parent is *not* currently processing an event
								// this ensures that the parent can process the received event immediately and can stop the child immediately
								setTimeout(() => sendBack({ type: "STARTED" }));
							}),
						},
						on: {
							STARTED: "active",
						},
					},
					active: {
						invoke: {
							src: fromCallback(({ sendBack }) => {
								sendBack({ type: "STOPPED" });
							}),
						},
						on: {
							STOPPED: {
								target: "idle",
								actions: forwardTo(SpecialTargets.Parent),
							},
						},
					},
				},
			});
			const parent = createMachine({
				id: "parent",
				initial: "idle",
				states: {
					idle: {
						on: {
							START: "active",
						},
					},
					active: {
						invoke: { src: child },
						on: {
							STOPPED: "done",
						},
					},
					done: {
						type: "final",
					},
				},
			});

			const service = createActor(parent);
			service.subscribe({
				complete: () => {
					expect(invokeCount).toBe(1);
					done();
				},
			});
			service.start();

			service.send({ type: "START" });
		});
	});

	type PromiseExecutor = (resolve: (value?: any) => void, reject: (reason?: any) => void) => void;

	const promiseTypes = [
		{
			type: "Promise",
			createPromise(executor: PromiseExecutor): Promise<any> {
				return new Promise(executor);
			},
		},
		/*
		{
			type: "PromiseLike",
			createPromise(executor: PromiseExecutor): PromiseLike<any> {
				// Simulate a Promise/A+ thenable / polyfilled Promise.
				function createThenable(promise: Promise<any>): PromiseLike<any> {
					return {
						then(onfulfilled: any, onrejected: any) {
							return createThenable(promise.then(onfulfilled, onrejected));
						},
					} as never;
				}
				return createThenable(new Promise(executor));
			},
		},
		*/
	];

	promiseTypes.forEach(t => {
		const kind = t.type;

		describe(`with promises (${kind})`, () => {
			const invokePromiseMachine = createMachine({
				types: {} as { context: { id: number; succeed: boolean } },
				id: "invokePromise",
				initial: "pending",
				context: ({ input }: { input: { id?: number; succeed?: boolean } }) => ({
					id: 42,
					succeed: true,
					...input,
				}),
				states: {
					pending: {
						invoke: {
							src: fromPromise(({ input }) =>
								t.createPromise(resolve => {
									if ((input as AnyObject).succeed) {
										resolve((input as AnyObject).id);
									} else {
										throw new Error(
											`failed on purpose for: ${(input as AnyObject).id}`,
										);
									}
								}),
							),
							input: ({ context }: AnyObject) => context,
							onDone: {
								target: "success",
								guard: ({ context, event }) => {
									return (event.output as unknown) === context.id;
								},
							},
							onError: "failure",
						},
					},
					success: {
						type: "final",
					},
					failure: {
						type: "final",
					},
				},
			});

			it("should be invoked with a promise factory and resolve through onDone", (_, done) => {
				const machine = createMachine({
					initial: "pending",
					states: {
						pending: {
							invoke: {
								src: fromPromise(() =>
									t.createPromise(resolve => {
										resolve();
									}),
								),
								onDone: "success",
							},
						},
						success: {
							type: "final",
						},
					},
				});
				const service = createActor(machine);
				service.subscribe({
					complete: () => {
						done();
					},
				});
				service.start();
			});

			it("should be invoked with a promise factory and reject with ErrorExecution", (_, done) => {
				const actor = createActor(invokePromiseMachine, {
					input: { id: 31, succeed: false },
				});
				actor.subscribe({ complete: () => done() });
				actor.start();
			});

			it("should be invoked with a promise factory and surface any unhandled errors", (_, done) => {
				const promiseMachine = createMachine({
					id: "invokePromise",
					initial: "pending",
					states: {
						pending: {
							invoke: {
								src: fromPromise(() =>
									t.createPromise(() => {
										throw new Error("test");
									}),
								),
								onDone: "success",
							},
						},
						success: {
							type: "final",
						},
					},
				});

				const service = createActor(promiseMachine);
				service.subscribe({
					error: err => {
						expect((err as AnyObject).message).toEqual(expect.stringMatching("test"));
						done();
					},
				});

				service.start();
			});

			it("should be invoked with a promise factory and stop on unhandled onError target", (_, done) => {
				const completeSpy = jest.fn();

				const promiseMachine = createMachine({
					id: "invokePromise",
					initial: "pending",
					states: {
						pending: {
							invoke: {
								src: fromPromise(() =>
									t.createPromise(() => {
										throw new Error("test");
									}),
								),
								onDone: "success",
							},
						},
						success: {
							type: "final",
						},
					},
				});

				const actor = createActor(promiseMachine);

				actor.subscribe({
					error: err => {
						expect(err).toBeInstanceOf(Error);
						expect((err as AnyObject).message).toBe("test");
						expect(completeSpy).never.toHaveBeenCalled();
						done();
					},
					complete: completeSpy,
				});
				actor.start();
			});

			it("should be invoked with a promise factory and resolve through onDone for compound state nodes", (_, done) => {
				const promiseMachine = createMachine({
					id: "promise",
					initial: "parent",
					states: {
						parent: {
							initial: "pending",
							states: {
								pending: {
									invoke: {
										src: fromPromise(() =>
											t.createPromise(resolve => resolve()),
										),
										onDone: "success",
									},
								},
								success: {
									type: "final",
								},
							},
							onDone: "success",
						},
						success: {
							type: "final",
						},
					},
				});
				const actor = createActor(promiseMachine);
				actor.subscribe({ complete: () => done() });
				actor.start();
			});

			it("should be invoked with a promise service and resolve through onDone for compound state nodes", (_, done) => {
				const promiseMachine = createMachine(
					{
						id: "promise",
						initial: "parent",
						states: {
							parent: {
								initial: "pending",
								states: {
									pending: {
										invoke: {
											src: "somePromise",
											onDone: "success",
										},
									},
									success: {
										type: "final",
									},
								},
								onDone: "success",
							},
							success: {
								type: "final",
							},
						},
					},
					{
						actors: {
							somePromise: fromPromise(() => t.createPromise(resolve => resolve())),
						},
					},
				);
				const actor = createActor(promiseMachine);
				actor.subscribe({ complete: () => done() });
				actor.start();
			});
			it("should assign the resolved data when invoked with a promise factory", (_, done) => {
				const promiseMachine = createMachine({
					types: {} as { context: { count: number } },
					id: "promise",
					context: { count: 0 },
					initial: "pending",
					states: {
						pending: {
							invoke: {
								src: fromPromise(() =>
									t.createPromise(resolve => resolve({ count: 1 })),
								),
								onDone: {
									target: "success",
									actions: assign({
										count: ({ event }) =>
											(event.output as { count: number }).count,
									}),
								},
							},
						},
						success: {
							type: "final",
						},
					},
				});

				const actor = createActor(promiseMachine);
				actor.subscribe({
					complete: () => {
						expect(actor.getSnapshot().context.count).toEqual(1);
						done();
					},
				});
				actor.start();
			});

			it("should assign the resolved data when invoked with a promise service", (_, done) => {
				const promiseMachine = createMachine(
					{
						types: {} as { context: { count: number } },
						id: "promise",
						context: { count: 0 },
						initial: "pending",
						states: {
							pending: {
								invoke: {
									src: "somePromise",
									onDone: {
										target: "success",
										actions: assign({
											count: ({ event }) =>
												(event.output as AnyObject).count as number,
										}),
									},
								},
							},
							success: {
								type: "final",
							},
						},
					},
					{
						actors: {
							somePromise: fromPromise(() =>
								t.createPromise(resolve => resolve({ count: 1 })),
							),
						},
					},
				);

				const actor = createActor(promiseMachine);
				actor.subscribe({
					complete: () => {
						expect(actor.getSnapshot().context.count).toEqual(1);
						done();
					},
				});
				actor.start();
			});

			it("should provide the resolved data when invoked with a promise factory", (_, done) => {
				let count = 0;

				const promiseMachine = createMachine({
					id: "promise",
					context: { count: 0 },
					initial: "pending",
					states: {
						pending: {
							invoke: {
								src: fromPromise(() =>
									t.createPromise(resolve => resolve({ count: 1 })),
								),
								onDone: {
									target: "success",
									actions: ({ event }) => {
										count = (event.output as AnyObject).count as number;
									},
								},
							},
						},
						success: {
							type: "final",
						},
					},
				});

				const actor = createActor(promiseMachine);
				actor.subscribe({
					complete: () => {
						expect(count).toEqual(1);
						done();
					},
				});
				actor.start();
			});

			it("should provide the resolved data when invoked with a promise service", (_, done) => {
				let count = 0;

				const promiseMachine = createMachine(
					{
						id: "promise",
						initial: "pending",
						states: {
							pending: {
								invoke: {
									src: "somePromise",
									onDone: {
										target: "success",
										actions: ({ event }) => {
											count = (event.output as AnyObject).count as number;
										},
									},
								},
							},
							success: {
								type: "final",
							},
						},
					},
					{
						actors: {
							somePromise: fromPromise(() =>
								t.createPromise(resolve => resolve({ count: 1 })),
							),
						},
					},
				);

				const actor = createActor(promiseMachine);
				actor.subscribe({
					complete: () => {
						expect(count).toEqual(1);
						done();
					},
				});
				actor.start();
			});

			it("should be able to specify a Promise as a service", (_, done) => {
				interface BeginEvent {
					type: "BEGIN";
					payload: boolean;
				}

				const promiseActor = fromPromise(
					({ input }: { input: { foo: boolean; event: { payload: any } } }) => {
						return t.createPromise((resolve, reject) => {
							input.foo && (input.event.payload as unknown) ? resolve() : reject();
						});
					},
				);

				const promiseMachine = createMachine(
					{
						id: "promise",
						types: {} as {
							context: { foo: boolean };
							events: BeginEvent;
							actors: {
								src: "somePromise";
								logic: typeof promiseActor;
							};
						},
						initial: "pending",
						context: {
							foo: true,
						},
						states: {
							pending: {
								on: {
									BEGIN: "first",
								},
							},
							first: {
								invoke: {
									src: "somePromise",
									input: ({ context, event }) => ({
										foo: context.foo,
										event: event,
									}),
									onDone: "last",
								},
							},
							last: {
								type: "final",
							},
						},
					},
					{
						actors: {
							somePromise: promiseActor,
						},
					},
				);

				const actor = createActor(promiseMachine);
				actor.subscribe({ complete: () => done() });
				actor.start();
				actor.send({
					type: "BEGIN",
					payload: true,
				});
			});

			it("should be able to reuse the same promise logic multiple times and create unique promise for each created actor", (_, done) => {
				const machine = createMachine(
					{
						types: {} as {
							context: {
								result1: number | undefined;
								result2: number | undefined;
							};
							actors: {
								src: "getRandomNumber";
								logic: PromiseActorLogic<{ result: number }>;
							};
						},
						context: {
							result1: undefined,
							result2: undefined,
						},
						initial: "pending",
						states: {
							pending: {
								type: "parallel",
								states: {
									state1: {
										initial: "active",
										states: {
											active: {
												invoke: {
													src: "getRandomNumber",
													onDone: {
														target: "success",
														// TODO: we get DoneInvokeEvent<any> here, this gets fixed with https://github.com/microsoft/TypeScript/pull/48838
														actions: assign(({ event }) => ({
															result1: (event.output as AnyObject)
																.result as never,
														})),
													},
												},
											},
											success: {
												type: "final",
											},
										},
									},
									state2: {
										initial: "active",
										states: {
											active: {
												invoke: {
													src: "getRandomNumber",
													onDone: {
														target: "success",
														actions: assign(({ event }) => ({
															result2: (event.output as AnyObject)
																.result as never,
														})),
													},
												},
											},
											success: {
												type: "final",
											},
										},
									},
								},
								onDone: "done",
							},
							done: {
								type: "final",
							},
						},
					},
					{
						actors: {
							// it's important for this actor to be reused, this test shouldn't use a factory or anything like that
							getRandomNumber: fromPromise(() => {
								return t.createPromise(resolve =>
									resolve({ result: math.random() }),
								);
							}),
						},
					},
				);

				const service = createActor(machine);
				service.subscribe({
					complete: () => {
						const snapshot = service.getSnapshot();
						expect(type(snapshot.context.result1)).toBe("number");
						expect(type(snapshot.context.result2)).toBe("number");
						expect(snapshot.context.result1).never.toBe(snapshot.context.result2);
						done();
					},
				});
				service.start();
			});

			it("should not emit onSnapshot if stopped", (_, done) => {
				const machine = createMachine({
					initial: "active",
					states: {
						active: {
							invoke: {
								src: fromPromise(() =>
									t.createPromise(res => {
										setTimeout(() => res(42), 5);
									}),
								),
								onSnapshot: {},
							},
							on: {
								deactivate: "inactive",
							},
						},
						inactive: {
							on: {
								"*": {
									actions: ({ event }) => {
										if (event.snapshot) {
											throw new Error(
												`Received unexpected event: ${event.type}`,
											);
										}
									},
								},
							},
						},
					},
				});

				const actor = createActor(machine).start();
				actor.send({ type: "deactivate" });

				setTimeout(() => {
					done();
				}, 10);
			});
		});
	});

	describe("with callbacks", () => {
		it("should be able to specify a callback as a service", (_, done) => {
			interface BeginEvent {
				type: "BEGIN";
				payload: boolean;
			}
			interface CallbackEvent {
				type: "CALLBACK";
				data: number;
			}

			const someCallback = fromCallback(
				({
					sendBack,
					input,
				}: {
					sendBack: (event: BeginEvent | CallbackEvent) => void;
					input: { foo: boolean; event: BeginEvent | CallbackEvent };
				}) => {
					if (input.foo && input.event.type === "BEGIN") {
						sendBack({
							type: "CALLBACK",
							data: 40,
						});
						sendBack({
							type: "CALLBACK",
							data: 41,
						});
						sendBack({
							type: "CALLBACK",
							data: 42,
						});
					}
				},
			);

			const callbackMachine = createMachine(
				{
					id: "callback",
					types: {} as {
						context: { foo: boolean };
						events: BeginEvent | CallbackEvent;
						actors: {
							src: "someCallback";
							logic: typeof someCallback;
						};
					},
					initial: "pending",
					context: {
						foo: true,
					},
					states: {
						pending: {
							on: {
								BEGIN: "first",
							},
						},
						first: {
							invoke: {
								src: "someCallback",
								input: ({ context, event }) => ({
									foo: context.foo,
									event: event,
								}),
							},
							on: {
								CALLBACK: {
									target: "last",
									guard: ({ event }) => event.data === 42,
								},
							},
						},
						last: {
							type: "final",
						},
					},
				},
				{
					actors: {
						someCallback,
					},
				},
			);

			const actor = createActor(callbackMachine);
			actor.subscribe({ complete: () => done() });
			actor.start();
			actor.send({
				type: "BEGIN",
				payload: true,
			});
		});

		it("should transition correctly if callback function sends an event", () => {
			const callbackMachine = createMachine(
				{
					id: "callback",
					initial: "pending",
					context: { foo: true },
					states: {
						pending: {
							on: { BEGIN: "first" },
						},
						first: {
							invoke: {
								src: "someCallback",
							},
							on: { CALLBACK: "intermediate" },
						},
						intermediate: {
							on: { NEXT: "last" },
						},
						last: {
							type: "final",
						},
					},
				},
				{
					actors: {
						someCallback: fromCallback(({ sendBack }) => {
							sendBack({ type: "CALLBACK" });
						}),
					},
				},
			);

			const expectedStateValues = ["pending", "first", "intermediate"];
			const stateValues: StateValue[] = [];
			const actor = createActor(callbackMachine);
			actor.subscribe(current => stateValues.push(current.value));
			actor.start().send({ type: "BEGIN" });
			for (let i = 0; i < expectedStateValues.size(); i++) {
				expect(stateValues[i]).toEqual(expectedStateValues[i]);
			}
		});

		it("should transition correctly if callback function invoked from start and sends an event", () => {
			const callbackMachine = createMachine(
				{
					id: "callback",
					initial: "idle",
					context: { foo: true },
					states: {
						idle: {
							invoke: {
								src: "someCallback",
							},
							on: { CALLBACK: "intermediate" },
						},
						intermediate: {
							on: { NEXT: "last" },
						},
						last: {
							type: "final",
						},
					},
				},
				{
					actors: {
						someCallback: fromCallback(({ sendBack }) => {
							sendBack({ type: "CALLBACK" });
						}),
					},
				},
			);

			const expectedStateValues = ["idle", "intermediate"];
			const stateValues: StateValue[] = [];
			const actor = createActor(callbackMachine);
			actor.subscribe(current => stateValues.push(current.value));
			actor.start().send({ type: "BEGIN" });
			for (let i = 0; i < expectedStateValues.size(); i++) {
				expect(stateValues[i]).toEqual(expectedStateValues[i]);
			}
		});

		// tslint:disable-next-line:max-line-length
		it("should transition correctly if transient transition happens before current state invokes callback function and sends an event", () => {
			const callbackMachine = createMachine(
				{
					id: "callback",
					initial: "pending",
					context: { foo: true },
					states: {
						pending: {
							on: { BEGIN: "first" },
						},
						first: {
							always: "second",
						},
						second: {
							invoke: {
								src: "someCallback",
							},
							on: { CALLBACK: "third" },
						},
						third: {
							on: { NEXT: "last" },
						},
						last: {
							type: "final",
						},
					},
				},
				{
					actors: {
						someCallback: fromCallback(({ sendBack }) => {
							sendBack({ type: "CALLBACK" });
						}),
					},
				},
			);

			const expectedStateValues = ["pending", "second", "third"];
			const stateValues: StateValue[] = [];
			const actor = createActor(callbackMachine);
			actor.subscribe(current => {
				stateValues.push(current.value);
			});
			actor.start().send({ type: "BEGIN" });

			for (let i = 0; i < expectedStateValues.size(); i++) {
				expect(stateValues[i]).toEqual(expectedStateValues[i]);
			}
		});

		it("should treat a callback source as an event stream", (_, done) => {
			const intervalMachine = createMachine({
				types: {} as { context: { count: number } },
				id: "interval",
				initial: "counting",
				context: {
					count: 0,
				},
				states: {
					counting: {
						invoke: {
							id: "intervalService",
							src: fromCallback(({ sendBack }) => {
								const ivl = setInterval(() => {
									sendBack({ type: "INC" });
								}, 10);

								return () => clearInterval(ivl);
							}),
						},
						always: {
							target: "finished",
							guard: ({ context }) => context.count === 3,
						},
						on: {
							INC: {
								actions: assign({ count: ({ context }) => context.count + 1 }),
							},
						},
					},
					finished: {
						type: "final",
					},
				},
			});
			const actor = createActor(intervalMachine);
			actor.subscribe({ complete: () => done() });
			actor.start();
		});

		it("should dispose of the callback (if disposal function provided)", () => {
			const spy = jest.fn();
			const intervalMachine = createMachine({
				id: "interval",
				initial: "counting",
				states: {
					counting: {
						invoke: {
							id: "intervalService",
							src: fromCallback(() => spy),
						},
						on: {
							NEXT: "idle",
						},
					},
					idle: {},
				},
			});
			const actorRef = createActor(intervalMachine).start();

			actorRef.send({ type: "NEXT" });

			expect(spy).toHaveBeenCalled();
		});

		it("callback should be able to receive messages from parent", (_, done) => {
			const pingPongMachine = createMachine({
				id: "ping-pong",
				initial: "active",
				states: {
					active: {
						invoke: {
							id: "child",
							src: fromCallback(({ sendBack, receive }) => {
								receive(e => {
									if ((e as AnyObject).type === "PING") {
										sendBack({ type: "PONG" });
									}
								});
							}),
						},
						entry: sendTo("child", { type: "PING" }),
						on: {
							PONG: "done",
						},
					},
					done: {
						type: "final",
					},
				},
			});
			const actor = createActor(pingPongMachine);
			actor.subscribe({ complete: () => done() });
			actor.start();
		});

		it("should call onError upon error (sync)", (_, done) => {
			const errorMachine = createMachine({
				id: "error",
				initial: "safe",
				states: {
					safe: {
						invoke: {
							src: fromCallback(() => {
								throw new Error("test");
							}),
							onError: {
								target: "failed",
								guard: ({ event }) => {
									return (
										event.error instanceof Error &&
										(event.error as Error).message === "test"
									);
								},
							},
						},
					},
					failed: {
						type: "final",
					},
				},
			});
			const actor = createActor(errorMachine);
			actor.subscribe({ complete: () => done() });
			actor.start();
		});

		it("should transition correctly upon error (sync)", () => {
			const errorMachine = createMachine({
				id: "error",
				initial: "safe",
				states: {
					safe: {
						invoke: {
							src: fromCallback(() => {
								throw new Error("test");
							}),
							onError: "failed",
						},
					},
					failed: {
						on: { RETRY: "safe" },
					},
				},
			});

			const expectedStateValue = "failed";
			const service = createActor(errorMachine).start();
			expect(service.getSnapshot().value).toEqual(expectedStateValue);
		});

		it("should call onError only on the state which has invoked failed service", () => {
			const errorMachine = createMachine({
				initial: "start",
				states: {
					start: {
						on: {
							FETCH: "fetch",
						},
					},
					fetch: {
						type: "parallel",
						states: {
							first: {
								initial: "waiting",
								states: {
									waiting: {
										invoke: {
											src: fromCallback(() => {
												throw new Error("test");
											}),
											onError: {
												target: "failed",
											},
										},
									},
									failed: {},
								},
							},
							second: {
								initial: "waiting",
								states: {
									waiting: {
										invoke: {
											src: fromCallback(() => {
												// empty
												return () => {};
											}),
											onError: {
												target: "failed",
											},
										},
									},
									failed: {},
								},
							},
						},
					},
				},
			});

			const actorRef = createActor(errorMachine).start();
			actorRef.send({ type: "FETCH" });

			expect(actorRef.getSnapshot().value).toEqual({
				fetch: { first: "failed", second: "waiting" },
			});
		});

		it("should be able to be stringified", () => {
			const machine = createMachine({
				initial: "idle",
				states: {
					idle: {
						on: {
							GO_TO_WAITING: "waiting",
						},
					},
					waiting: {
						invoke: {
							src: fromCallback(() => {}),
						},
					},
				},
			});
			const actorRef = createActor(machine).start();
			actorRef.send({ type: "GO_TO_WAITING" });
			const waitingState = actorRef.getSnapshot();

			expect(() => {
				JSON.stringify(waitingState);
			}).never.toThrow();
		});

		it("should result in an error notification if callback actor throws when it starts and the error stays unhandled by the machine", () => {
			const errorMachine = createMachine({
				initial: "safe",
				states: {
					safe: {
						invoke: {
							src: fromCallback(() => {
								throw new Error("test");
							}),
						},
					},
					failed: {
						type: "final",
					},
				},
			});
			const spy = jest.fn();

			const actorRef = createActor(errorMachine);
			actorRef.subscribe({
				error: spy,
			});
			actorRef.start();
			/*
			expect(spy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            [Error: test],
          ],
        ]
      `);
	  */
		});

		it("should work with input", (_, done) => {
			const machine = createMachine({
				types: {} as {
					context: { foo: string };
				},
				initial: "start",
				context: { foo: "bar" },
				states: {
					start: {
						invoke: {
							src: fromCallback(({ input }) => {
								expect(input).toEqual({ foo: "bar" });
								done();
							}),
							input: ({ context }: AnyObject) => context,
						},
					},
				},
			});

			createActor(machine).start();
		});

		it("sub invoke race condition ends on the completed state", () => {
			const anotherChildMachine = createMachine({
				id: "child",
				initial: "start",
				states: {
					start: {
						on: { STOP: "end" },
					},
					end: {
						type: "final",
					},
				},
			});

			const anotherParentMachine = createMachine({
				id: "parent",
				initial: "begin",
				states: {
					begin: {
						invoke: {
							src: anotherChildMachine,
							id: "invoked.child",
							onDone: "completed",
						},
						on: {
							STOPCHILD: {
								actions: sendTo("invoked.child", { type: "STOP" }),
							},
						},
					},
					completed: {
						type: "final",
					},
				},
			});

			const actorRef = createActor(anotherParentMachine).start();
			actorRef.send({ type: "STOPCHILD" });

			expect(actorRef.getSnapshot().value).toEqual("completed");
		});
	});

	/*
	describe("with observables", () => {
		it("should work with an infinite observable", (_, done) => {
			interface Events {
				type: "COUNT";
				value: number;
			}
			const obsMachine = createMachine({
				types: {} as { context: { count: number | undefined }; events: Events },
				id: "infiniteObs",
				initial: "counting",
				context: { count: undefined },
				states: {
					counting: {
						invoke: {
							src: fromObservable(() => interval(10)),
							onSnapshot: {
								actions: assign({
									count: ({ event }) => event.snapshot.context,
								}),
							},
						},
						always: {
							target: "counted",
							guard: ({ context }) => context.count === 5,
						},
					},
					counted: {
						type: "final",
					},
				},
			});

			const service = createActor(obsMachine);
			service.subscribe({
				complete: () => {
					done();
				},
			});
			service.start();
		});

		it("should work with a finite observable", (_, done) => {
			interface Ctx {
				count: number | undefined;
			}
			interface Events {
				type: "COUNT";
				value: number;
			}
			const obsMachine = createMachine({
				types: {} as { context: Ctx; events: Events },
				id: "obs",
				initial: "counting",
				context: {
					count: undefined,
				},
				states: {
					counting: {
						invoke: {
							src: fromObservable(() => interval(10).pipe(take(5))),
							onSnapshot: {
								actions: assign({
									count: ({ event }) => event.snapshot.context,
								}),
							},
							onDone: {
								target: "counted",
								guard: ({ context }) => context.count === 4,
							},
						},
					},
					counted: {
						type: "final",
					},
				},
			});

			const actor = createActor(obsMachine);
			actor.subscribe({
				complete: () => {
					done();
				},
			});
			actor.start();
		});

		it("should receive an emitted error", (_, done) => {
			interface Ctx {
				count: number | undefined;
			}
			interface Events {
				type: "COUNT";
				value: number;
			}
			const obsMachine = createMachine({
				types: {} as { context: Ctx; events: Events },
				id: "obs",
				initial: "counting",
				context: { count: undefined },
				states: {
					counting: {
						invoke: {
							src: fromObservable(() =>
								interval(10).pipe(
									map(value => {
										if (value === 5) {
											throw new Error("some error");
										}

										return value;
									}),
								),
							),
							onSnapshot: {
								actions: assign({
									count: ({ event }) => event.snapshot.context,
								}),
							},
							onError: {
								target: "success",
								guard: ({ context, event }) => {
									expect((event.error as AnyObject).message).toEqual("some error");
									return (
										context.count === 4 &&
										(event.error as AnyObject).message === "some error"
									);
								},
							},
						},
					},
					success: {
						type: "final",
					},
				},
			});

			const actor = createActor(obsMachine);
			actor.subscribe({
				complete: () => {
					done();
				},
			});
			actor.start();
		});

		it("should work with input", (_, done) => {
			const childLogic = fromObservable(({ input }: { input: number }) => of(input));

			const machine = createMachine(
				{
					types: {} as {
						actors: {
							src: "childLogic";
							logic: typeof childLogic;
						};
					},
					context: { received: undefined },
					invoke: {
						src: "childLogic",
						input: 42,
						onSnapshot: {
							actions: ({ event }) => {
								if (
									event.snapshot.status === "active" &&
									event.snapshot.context === 42
								) {
									done();
								}
							},
						},
					},
				},
				{
					actors: {
						childLogic,
					},
				},
			);

			createActor(machine).start();
		});
	});
	*/

	/*
	describe("with event observables", () => {
		it("should work with an infinite event observable", (_, done) => {
			interface Events {
				type: "COUNT";
				value: number;
			}
			const obsMachine = createMachine({
				types: {} as { context: { count: number | undefined }; events: Events },
				id: "obs",
				initial: "counting",
				context: { count: undefined },
				states: {
					counting: {
						invoke: {
							src: fromEventObservable(() =>
								interval(10).pipe(map(value => ({ type: "COUNT", value }))),
							),
						},
						on: {
							COUNT: {
								actions: assign({ count: ({ event }) => event.value }),
							},
						},
						always: {
							target: "counted",
							guard: ({ context }) => context.count === 5,
						},
					},
					counted: {
						type: "final",
					},
				},
			});

			const service = createActor(obsMachine);
			service.subscribe({
				complete: () => {
					done();
				},
			});
			service.start();
		});

		it("should work with a finite event observable", (_, done) => {
			interface Ctx {
				count: number | undefined;
			}
			interface Events {
				type: "COUNT";
				value: number;
			}
			const obsMachine = createMachine({
				types: {} as { context: Ctx; events: Events },
				id: "obs",
				initial: "counting",
				context: {
					count: undefined,
				},
				states: {
					counting: {
						invoke: {
							src: fromEventObservable(() =>
								interval(10).pipe(
									take(5),
									map(value => ({ type: "COUNT", value })),
								),
							),
							onDone: {
								target: "counted",
								guard: ({ context }) => context.count === 4,
							},
						},
						on: {
							COUNT: {
								actions: assign({
									count: ({ event }) => event.value,
								}),
							},
						},
					},
					counted: {
						type: "final",
					},
				},
			});

			const actor = createActor(obsMachine);
			actor.subscribe({
				complete: () => {
					done();
				},
			});
			actor.start();
		});

		it("should receive an emitted error", (_, done) => {
			interface Ctx {
				count: number | undefined;
			}
			interface Events {
				type: "COUNT";
				value: number;
			}
			const obsMachine = createMachine({
				types: {} as { context: Ctx; events: Events },
				id: "obs",
				initial: "counting",
				context: { count: undefined },
				states: {
					counting: {
						invoke: {
							src: fromEventObservable(() =>
								interval(10).pipe(
									map(value => {
										if (value === 5) {
											throw new Error("some error");
										}

										return { type: "COUNT", value };
									}),
								),
							),
							onError: {
								target: "success",
								guard: ({ context, event }) => {
									expect((event.error as AnyObject).message).toEqual("some error");
									return (
										context.count === 4 &&
										(event.error as AnyObject).message === "some error"
									);
								},
							},
						},
						on: {
							COUNT: {
								actions: assign({ count: ({ event }) => event.value }),
							},
						},
					},
					success: {
						type: "final",
					},
				},
			});

			const actor = createActor(obsMachine);
			actor.subscribe({
				complete: () => {
					done();
				},
			});
			actor.start();
		});

		it("should work with input", (_, done) => {
			const machine = createMachine({
				invoke: {
					src: fromEventObservable(({ input }) =>
						of({
							type: "obs.event",
							value: input,
						}),
					),
					input: 42,
				},
				on: {
					"obs.event": {
						actions: ({ event }) => {
							expect(event.value).toEqual(42);
							done();
						},
					},
				},
			});

			createActor(machine).start();
		});
	});
	*/

	describe("with logic", () => {
		it("should work with actor logic", (_, done) => {
			const countLogic: ActorLogic<Snapshot<undefined> & { context: number }, EventObject> = {
				transition(state, event) {
					if (event.type === "INC") {
						return {
							...state,
							context: state.context + 1,
						};
					} else if (event.type === "DEC") {
						return {
							...state,
							context: state.context - 1,
						};
					}
					return state;
				},
				getInitialSnapshot() {
					return {
						status: "active",
						output: undefined,
						error: undefined,
						context: 0,
					};
				},
				getPersistedSnapshot(s) {
					return s;
				},
			};

			const countMachine = createMachine({
				invoke: {
					id: "count",
					src: countLogic,
				},
				on: {
					INC: {
						actions: forwardTo("count"),
					},
				},
			});

			const countService = createActor(countMachine);
			countService.subscribe(state => {
				if ((state.children["count"]?.getSnapshot() as { context: number }).context === 2) {
					done();
				}
			});
			countService.start();

			countService.send({ type: "INC" });
			countService.send({ type: "INC" });
		});

		it("logic should have reference to the parent", (_, done) => {
			const pongLogic: ActorLogic<Snapshot<undefined>, EventObject> = {
				transition(state, event, { self: itself }) {
					if (event.type === "PING") {
						itself._parent?.send({ type: "PONG" });
					}

					return state;
				},
				getInitialSnapshot() {
					return {
						status: "active",
						output: undefined,
						error: undefined,
					};
				},
				getPersistedSnapshot(s) {
					return s;
				},
			};

			const pingMachine = createMachine({
				initial: "waiting",
				states: {
					waiting: {
						entry: sendTo("ponger", { type: "PING" }),
						invoke: {
							id: "ponger",
							src: pongLogic,
						},
						on: {
							PONG: "success",
						},
					},
					success: {
						type: "final",
					},
				},
			});

			const pingService = createActor(pingMachine);
			pingService.subscribe({
				complete: () => {
					done();
				},
			});
			pingService.start();
		});
	});

	describe("with transition functions", () => {
		it("should work with a transition function", (_, done) => {
			const countReducer = (
				count: number,
				event: { type: "INC" } | { type: "DEC" },
			): number => {
				if (event.type === "INC") {
					return count + 1;
				} else if (event.type === "DEC") {
					return count - 1;
				}
				return count;
			};

			const countMachine = createMachine({
				invoke: {
					id: "count",
					src: fromTransition(countReducer, 0),
				},
				on: {
					INC: {
						actions: forwardTo("count"),
					},
				},
			});

			const countService = createActor(countMachine);
			countService.subscribe(state => {
				if ((state.children["count"]?.getSnapshot() as { context: number }).context === 2) {
					done();
				}
			});
			countService.start();

			countService.send({ type: "INC" });
			countService.send({ type: "INC" });
		});

		it("should schedule events in a FIFO queue", (_, done) => {
			type CountEvents = { type: "INC" } | { type: "DOUBLE" };

			const countReducer = (
				count: number,
				event: CountEvents,
				{ self: itself }: ActorScope<any, CountEvents>,
			): number => {
				if (event.type === "INC") {
					itself.send({ type: "DOUBLE" });
					return count + 1;
				}
				if (event.type === "DOUBLE") {
					return count * 2;
				}

				return count;
			};

			const countMachine = createMachine({
				invoke: {
					id: "count",
					src: fromTransition(countReducer, 0),
				},
				on: {
					INC: {
						actions: forwardTo("count"),
					},
				},
			});

			const countService = createActor(countMachine);
			countService.subscribe(state => {
				if ((state.children["count"]?.getSnapshot() as { context: number }).context === 2) {
					done();
				}
			});
			countService.start();

			countService.send({ type: "INC" });
		});

		it("should emit onSnapshot", (_, done) => {
			const doublerLogic = fromTransition(
				(_, event: { type: "update"; value: number }) => event.value * 2,
				0,
			);
			const machine = createMachine(
				{
					types: {} as {
						actors: { src: "doublerLogic"; logic: typeof doublerLogic };
					},
					invoke: {
						id: "doubler",
						src: "doublerLogic",
						onSnapshot: {
							actions: ({ event }) => {
								if (event.snapshot.context === 42) {
									done();
								}
							},
						},
					},
					entry: sendTo("doubler", { type: "update", value: 21 }, { delay: 10 }),
				},
				{
					actors: {
						doublerLogic,
					},
				},
			);

			createActor(machine).start();
		});
	});

	describe("with machines", () => {
		const pongMachine = createMachine({
			id: "pong",
			initial: "active",
			states: {
				active: {
					on: {
						PING: {
							// Sends 'PONG' event to parent machine
							actions: sendParent({ type: "PONG" }),
						},
					},
				},
			},
		});

		// Parent machine
		const pingMachine = createMachine({
			id: "ping",
			initial: "innerMachine",
			states: {
				innerMachine: {
					initial: "active",
					states: {
						active: {
							invoke: {
								id: "pong",
								src: pongMachine,
							},
							// Sends 'PING' event to child machine with ID 'pong'
							entry: sendTo("pong", { type: "PING" }),
							on: {
								PONG: "innerSuccess",
							},
						},
						innerSuccess: {
							type: "final",
						},
					},
					onDone: "success",
				},
				success: { type: "final" },
			},
		});

		it("should create invocations from machines in nested states", (_, done) => {
			const actor = createActor(pingMachine);
			actor.subscribe({ complete: () => done() });
			actor.start();
		});

		it("should emit onSnapshot", (_, done) => {
			const childMachine = createMachine({
				initial: "a",
				states: {
					a: {
						after: {
							10: "b",
						},
					},
					b: {},
				},
			});
			const machine = createMachine(
				{
					types: {} as {
						actors: { src: "childMachine"; logic: typeof childMachine };
					},
					invoke: {
						src: "childMachine",
						onSnapshot: {
							actions: ({ event }) => {
								if (event.snapshot.value === "b") {
									done();
								}
							},
						},
					},
				},
				{
					actors: {
						childMachine,
					},
				},
			);

			createActor(machine).start();
		});
	});

	describe("multiple simultaneous services", () => {
		const multiple = createMachine({
			types: {} as { context: { one?: string; two?: string } },
			id: "machine",
			initial: "one",

			context: {},

			on: {
				ONE: {
					actions: assign({
						one: "one",
					}),
				},

				TWO: {
					actions: assign({
						two: "two",
					}),
					target: ".three",
				},
			},

			states: {
				one: {
					initial: "two",
					states: {
						two: {
							invoke: [
								{
									id: "child",
									src: fromCallback(({ sendBack }) => sendBack({ type: "ONE" })),
								},
								{
									id: "child2",
									src: fromCallback(({ sendBack }) => sendBack({ type: "TWO" })),
								},
							],
						},
					},
				},
				three: {
					type: "final",
				},
			},
		});

		it("should start all services at once", (_, done) => {
			const service = createActor(multiple);
			service.subscribe({
				complete: () => {
					expect(service.getSnapshot().context).toEqual({
						one: "one",
						two: "two",
					});
					done();
				},
			});

			service.start();
		});

		const parallel = createMachine({
			types: {} as { context: { one?: string; two?: string } },
			id: "machine",
			initial: "one",

			context: {},

			on: {
				ONE: {
					actions: assign({
						one: "one",
					}),
				},

				TWO: {
					actions: assign({
						two: "two",
					}),
				},
			},

			after: {
				// allow both invoked services to get a chance to send their events
				// and don't depend on a potential race condition (with an immediate transition)
				10: ".three",
			},

			states: {
				one: {
					initial: "two",
					states: {
						two: {
							type: "parallel",
							states: {
								a: {
									invoke: {
										id: "child",
										src: fromCallback(({ sendBack }) =>
											sendBack({ type: "ONE" }),
										),
									},
								},
								b: {
									invoke: {
										id: "child2",
										src: fromCallback(({ sendBack }) =>
											sendBack({ type: "TWO" }),
										),
									},
								},
							},
						},
					},
				},
				three: {
					type: "final",
				},
			},
		});

		it("should run services in parallel", (_, done) => {
			const service = createActor(parallel);
			service.subscribe({
				complete: () => {
					expect(service.getSnapshot().context).toEqual({
						one: "one",
						two: "two",
					});
					done();
				},
			});

			service.start();
		});

		it("should not invoke an actor if it gets stopped immediately by transitioning away in immediate microstep", () => {
			// Since an actor will be canceled when the state machine leaves the invoking state
			// it does not make sense to start an actor in a state that will be exited immediately
			let actorStarted = false;

			const transientMachine = createMachine({
				id: "transient",
				initial: "active",
				states: {
					active: {
						invoke: {
							id: "doNotInvoke",
							src: fromCallback(() => {
								actorStarted = true;
							}),
						},
						always: "inactive",
					},
					inactive: {},
				},
			});

			const service = createActor(transientMachine);

			service.start();

			expect(actorStarted).toBe(false);
		});

		// tslint:disable-next-line: max-line-length
		it("should not invoke an actor if it gets stopped immediately by transitioning away in subsequent microstep", () => {
			// Since an actor will be canceled when the state machine leaves the invoking state
			// it does not make sense to start an actor in a state that will be exited immediately
			let actorStarted = false;

			const transientMachine = createMachine({
				initial: "withNonLeafInvoke",
				states: {
					withNonLeafInvoke: {
						invoke: {
							id: "doNotInvoke",
							src: fromCallback(() => {
								actorStarted = true;
							}),
						},
						initial: "first",
						states: {
							first: {
								always: "second",
							},
							second: {
								always: "#inactive",
							},
						},
					},
					inactive: {
						id: "inactive",
					},
				},
			});

			const service = createActor(transientMachine);

			service.start();

			expect(actorStarted).toBe(false);
		});

		it("should invoke a service if other service gets stopped in subsequent microstep (#1180)", (_, done) => {
			const machine = createMachine({
				initial: "running",
				states: {
					running: {
						type: "parallel",
						states: {
							one: {
								initial: "active",
								on: {
									STOP_ONE: ".idle",
								},
								states: {
									idle: {},
									active: {
										invoke: {
											id: "active",
											src: fromCallback(() => {
												/* ... */
											}),
										},
										on: {
											NEXT: {
												actions: raise({ type: "STOP_ONE" }),
											},
										},
									},
								},
							},
							two: {
								initial: "idle",
								on: {
									NEXT: ".active",
								},
								states: {
									idle: {},
									active: {
										invoke: {
											id: "post",
											src: fromPromise(() => Promise.resolve(42)),
											onDone: "#done",
										},
									},
								},
							},
						},
					},
					done: {
						id: "done",
						type: "final",
					},
				},
			});

			const service = createActor(machine);
			service.subscribe({ complete: () => done() });
			service.start();

			service.send({ type: "NEXT" });
		});

		it("should invoke an actor when reentering invoking state within a single macrostep", () => {
			let actorStartedCount = 0;

			const transientMachine = createMachine({
				types: {} as { context: { counter: number } },
				initial: "active",
				context: { counter: 0 },
				states: {
					active: {
						invoke: {
							src: fromCallback(() => {
								actorStartedCount++;
							}),
						},
						always: [
							{
								guard: ({ context }) => context.counter === 0,
								target: "inactive",
							},
						],
					},
					inactive: {
						entry: assign({ counter: ({ context }) => ++context.counter }),
						always: "active",
					},
				},
			});

			const service = createActor(transientMachine);

			service.start();

			expect(actorStartedCount).toBe(1);
		});
	});

	it("invoke `src` can be used with invoke `input`", (_, done) => {
		const machine = createMachine(
			{
				types: {} as {
					actors: {
						src: "search";
						logic: PromiseActorLogic<
							number,
							{
								endpoint: string;
							}
						>;
					};
				},
				initial: "searching",
				states: {
					searching: {
						invoke: {
							src: "search",
							input: {
								endpoint: "example.com",
							},
							onDone: "success",
						},
					},
					success: {
						type: "final",
					},
				},
			},
			{
				actors: {
					search: fromPromise(async ({ input }) => {
						expect(input.endpoint).toEqual("example.com");

						return 42;
					}),
				},
			},
		);
		const actor = createActor(machine);
		actor.subscribe({ complete: () => done() });
		actor.start();
	});

	it("invoke `src` can be used with dynamic invoke `input`", async () => {
		const machine = createMachine(
			{
				types: {} as {
					context: { url: string };
					actors: {
						src: "search";
						logic: PromiseActorLogic<
							number,
							{
								endpoint: string;
							}
						>;
					};
				},
				initial: "searching",
				context: {
					url: "example.com",
				},
				states: {
					searching: {
						invoke: {
							src: "search",
							input: ({ context }) => ({ endpoint: context.url }),
							onDone: "success",
						},
					},
					success: {
						type: "final",
					},
				},
			},
			{
				actors: {
					search: fromPromise(async ({ input }) => {
						expect(input.endpoint).toEqual("example.com");

						return 42;
					}),
				},
			},
		);

		await new Promise<void>(res => {
			const actor = createActor(machine);
			actor.subscribe({ complete: () => res() });
			actor.start();
		});
	});

	it("invoke generated ID should be predictable based on the state node where it is defined", (_, done) => {
		const machine = createMachine(
			{
				initial: "a",
				states: {
					a: {
						invoke: {
							src: "someSrc",
							onDone: {
								guard: ({ event }) => {
									// invoke ID should not be 'someSrc'
									const expectedType = "xstate.done.actor.0.(machine).a";
									expect(event.type).toEqual(expectedType);
									return event.type === expectedType;
								},
								target: "b",
							},
						},
					},
					b: {
						type: "final",
					},
				},
			},
			{
				actors: {
					someSrc: fromPromise(() => Promise.resolve()),
				},
			},
		);

		const actor = createActor(machine);
		actor.subscribe({
			complete: () => {
				done();
			},
		});
		actor.start();
	});

	it.each([
		["src with string reference", { src: "someSrc" }],
		// ['machine', createMachine({ id: 'someId' })],
		["src containing a machine directly", { src: createMachine({ id: "someId" }) }],
		[
			"src containing a callback actor directly",
			{
				src: fromCallback(() => {
					/* ... */
				}),
			},
		],
	])(
		"invoke config defined as %s should register unique and predictable child in state",
		(_type, invokeConfig) => {
			const machine = createMachine(
				{
					id: "machine",
					initial: "a",
					states: {
						a: {
							invoke: invokeConfig,
						},
					},
				},
				{
					actors: {
						someSrc: fromCallback(() => {
							/* ... */
						}),
					},
				},
			);

			expect(createActor(machine).getSnapshot().children["0.machine.a"]).toBeDefined();
		},
	);

	// https://github.com/statelyai/xstate/issues/464
	it("xstate.done.actor events should only select onDone transition on the invoking state when invokee is referenced using a string", (_, done) => {
		let counter = 0;
		let invoked = false;

		const createSingleState = (): any => ({
			initial: "fetch",
			states: {
				fetch: {
					invoke: {
						src: "fetchSmth",
						onDone: {
							actions: "handleSuccess",
						},
					},
				},
			},
		});

		const testMachine = createMachine(
			{
				type: "parallel",
				states: {
					first: createSingleState(),
					second: createSingleState(),
				},
			},
			{
				actions: {
					handleSuccess: () => {
						++counter;
					},
				},
				actors: {
					fetchSmth: fromPromise(() => {
						if (invoked) {
							// create a promise that won't ever resolve for the second invoking state
							return new Promise(() => {
								/* ... */
							});
						}
						invoked = true;
						return Promise.resolve(42);
					}),
				},
			},
		);

		createActor(testMachine).start();

		// check within a macrotask so all promise-induced microtasks have a chance to resolve first
		setTimeout(() => {
			expect(counter).toEqual(1);
			done();
		}, 0);
	});

	it("xstate.done.actor events should have unique names when invokee is a machine with an id property", (_, done) => {
		const actual: AnyEventObject[] = [];

		const childMachine = createMachine({
			id: "child",
			initial: "a",
			states: {
				a: {
					invoke: {
						src: fromPromise(() => {
							return Promise.resolve(42);
						}),
						onDone: "b",
					},
				},
				b: {
					type: "final",
				},
			},
		});

		const createSingleState = (): any => ({
			initial: "fetch",
			states: {
				fetch: {
					invoke: {
						src: childMachine,
					},
				},
			},
		});

		const testMachine = createMachine({
			type: "parallel",
			states: {
				first: createSingleState(),
				second: createSingleState(),
			},
			on: {
				"*": {
					actions: ({ event }) => {
						actual.push(event);
					},
				},
			},
		});

		createActor(testMachine).start();

		// check within a macrotask so all promise-induced microtasks have a chance to resolve first
		setTimeout(() => {
			expect(actual).toEqual([
				{
					type: "xstate.done.actor.0.(machine).first.fetch",
					output: undefined,
					actorId: "0.(machine).first.fetch",
				},
				{
					type: "xstate.done.actor.0.(machine).second.fetch",
					output: undefined,
					actorId: "0.(machine).second.fetch",
				},
			]);
			done();
		}, 100);
	});

	it("should get reinstantiated after reentering the invoking state in a microstep", () => {
		let invokeCount = 0;

		const machine = createMachine({
			initial: "a",
			states: {
				a: {
					invoke: {
						src: fromCallback(() => {
							invokeCount++;
						}),
					},
					on: {
						GO_AWAY_AND_REENTER: "b",
					},
				},
				b: {
					always: "a",
				},
			},
		});
		const service = createActor(machine).start();

		service.send({ type: "GO_AWAY_AND_REENTER" });

		expect(invokeCount).toBe(2);
	});

	it("invocations should be stopped when the machine reaches done state", () => {
		let disposed = false;
		const machine = createMachine({
			initial: "a",
			invoke: {
				src: fromCallback(() => {
					return () => {
						disposed = true;
					};
				}),
			},
			states: {
				a: {
					on: {
						FINISH: "b",
					},
				},
				b: {
					type: "final",
				},
			},
		});
		const service = createActor(machine).start();

		service.send({ type: "FINISH" });
		expect(disposed).toBe(true);
	});

	it("deep invocations should be stopped when the machine reaches done state", () => {
		let disposed = false;
		const childMachine = createMachine({
			invoke: {
				src: fromCallback(() => {
					return () => {
						disposed = true;
					};
				}),
			},
		});

		const machine = createMachine({
			initial: "a",
			invoke: {
				src: childMachine,
			},
			states: {
				a: {
					on: {
						FINISH: "b",
					},
				},
				b: {
					type: "final",
				},
			},
		});
		const service = createActor(machine).start();

		service.send({ type: "FINISH" });
		expect(disposed).toBe(true);
	});

	it("root invocations should restart on root reentering transitions", () => {
		let count = 0;

		const machine = createMachine({
			id: "root",
			invoke: {
				src: fromPromise(() => {
					count++;
					return Promise.resolve(42);
				}),
			},
			on: {
				EVENT: {
					target: "#two",
					reenter: true,
				},
			},
			initial: "one",
			states: {
				one: {},
				two: {
					id: "two",
				},
			},
		});

		const service = createActor(machine).start();

		service.send({ type: "EVENT" });

		expect(count).toEqual(2);
	});

	it("should be able to restart an invoke when reentering the invoking state", () => {
		const actual: string[] = [];
		let invokeCounter = 0;

		const machine = createMachine({
			initial: "inactive",
			states: {
				inactive: {
					on: { ACTIVATE: "active" },
				},
				active: {
					invoke: {
						src: fromCallback(() => {
							const localId = ++invokeCounter;
							actual.push(`start ${localId}`);
							return () => {
								actual.push(`stop ${localId}`);
							};
						}),
					},
					on: {
						REENTER: {
							target: "active",
							reenter: true,
						},
					},
				},
			},
		});

		const service = createActor(machine).start();

		service.send({
			type: "ACTIVATE",
		});

		actual.clear();

		service.send({
			type: "REENTER",
		});

		expect(actual).toEqual(["stop 1", "start 2"]);
	});

	it("should be able to receive a delayed event sent by the entry action of the invoking state", async () => {
		const child = createMachine({
			types: {} as {
				events: {
					type: "PING";
					origin: ActorRef<Snapshot<unknown>, { type: "PONG" }>;
				};
			},
			on: {
				PING: {
					actions: sendTo(({ event }) => event.origin, { type: "PONG" }),
				},
			},
		});
		const machine = createMachine({
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					invoke: {
						id: "foo",
						src: child,
					},
					entry: sendTo(
						"foo",
						({ self: itself }: { self: unknown }) => ({ type: "PING", origin: itself }),
						{
							delay: 1,
						},
					),
					on: {
						PONG: "c",
					},
				},
				c: {
					type: "final",
				},
			},
		});

		const actorRef = createActor(machine).start();
		actorRef.send({ type: "NEXT" });
		await sleep(3);
		expect(actorRef.getSnapshot().status).toBe("done");
	});
});

describe("invoke input", () => {
	it("should provide input to an actor creator", (_, done) => {
		const machine = createMachine(
			{
				types: {} as {
					context: { count: number };
					actors: {
						src: "stringService";
						logic: PromiseActorLogic<
							boolean,
							{
								staticVal: string;
								newCount: number;
							}
						>;
					};
				},
				initial: "pending",
				context: {
					count: 42,
				},
				states: {
					pending: {
						invoke: {
							src: "stringService",
							input: ({ context }) => ({
								staticVal: "hello",
								newCount: context.count * 2,
							}),
							onDone: "success",
						},
					},
					success: {
						type: "final",
					},
				},
			},
			{
				actors: {
					stringService: fromPromise(({ input }) => {
						expect(input).toEqual({ newCount: 84, staticVal: "hello" });

						return Promise.resolve(true);
					}),
				},
			},
		);

		const service = createActor(machine);
		service.subscribe({
			complete: () => {
				done();
			},
		});

		service.start();
	});

	it("should provide self to input mapper", (_, done) => {
		const machine = createMachine({
			invoke: {
				src: fromCallback(({ input }) => {
					expect((input as { responder: AnyObject }).responder.send).toBeDefined();
					done();
				}),
				input: ({ self: itself }) => ({
					responder: itself,
				}),
			},
		});

		createActor(machine).start();
	});
});
