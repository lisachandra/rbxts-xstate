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
import RegExp from "@rbxts/regexp";
import { JSON } from "@rbxts/xstate/out/utils/polyfill/json";
import { Array, Error, Object } from "@rbxts/luau-polyfill";
import { HttpService } from "@rbxts/services";
// import { BehaviorSubject } from "rxjs";
import {
	createMachine,
	createActor,
	fromPromise,
	fromObservable,
	assign,
	sendTo,
	AnyObject,
} from "@rbxts/xstate";
import { sleep } from "test/env-utils";
import { BehaviorSubjectStub } from "./utils";

describe("rehydration", () => {
	describe("using persisted state", () => {
		it("should be able to use `hasTag` immediately", () => {
			const machine = createMachine({
				initial: "a",
				states: {
					a: {
						tags: "foo",
					},
				},
			});

			const actorRef = createActor(machine).start();
			const persistedState = JSON.stringify(actorRef.getPersistedSnapshot());
			actorRef.stop();

			const service = createActor(machine, {
				snapshot: JSON.parse(persistedState) as never,
			}).start();

			expect(service.getSnapshot().hasTag("foo")).toBe(true);
		});

		it("should not call exit actions when machine gets stopped immediately", () => {
			const actual: string[] = [];
			const machine = createMachine({
				exit: () => actual.push("root"),
				initial: "a",
				states: {
					a: {
						exit: () => actual.push("a"),
					},
				},
			});

			const actorRef = createActor(machine).start();
			const persistedState = JSON.stringify(actorRef.getPersistedSnapshot());
			actorRef.stop();

			createActor(machine, { snapshot: JSON.parse(persistedState) as never })
				.start()
				.stop();

			expect(actual).toEqual([]);
		});

		it("should get correct result back from `can` immediately", () => {
			const machine = createMachine({
				on: {
					FOO: {
						actions: () => {},
					},
				},
			});

			const persistedState = JSON.stringify(createActor(machine).start().getSnapshot());
			const restoredState = JSON.parse(persistedState) as never;
			const service = createActor(machine, {
				snapshot: restoredState,
			}).start();

			expect(service.getSnapshot().can({ type: "FOO" })).toBe(true);
		});
	});

	describe("using state value", () => {
		it("should be able to use `hasTag` immediately", () => {
			const machine = createMachine({
				initial: "inactive",
				states: {
					inactive: {
						on: { NEXT: "active" },
					},
					active: {
						tags: "foo",
					},
				},
			});

			const activeState = machine.resolveState({ value: "active" });
			const service = createActor(machine, {
				snapshot: activeState,
			});

			service.start();

			expect(service.getSnapshot().hasTag("foo")).toBe(true);
		});

		it("should not call exit actions when machine gets stopped immediately", () => {
			const actual: string[] = [];
			const machine = createMachine({
				exit: () => actual.push("root"),
				initial: "inactive",
				states: {
					inactive: {
						on: { NEXT: "active" },
					},
					active: {
						exit: () => actual.push("active"),
					},
				},
			});

			createActor(machine, {
				snapshot: machine.resolveState({ value: "active" }),
			})
				.start()
				.stop();

			expect(actual).toEqual([]);
		});

		it("should error on incompatible state value (shallow)", () => {
			const machine = createMachine({
				initial: "valid",
				states: {
					valid: {},
				},
			});

			expect(() => {
				machine.resolveState({ value: "invalid" });
			}).toThrowError(RegExp("invalid"));
		});

		it("should error on incompatible state value (deep)", () => {
			const machine = createMachine({
				initial: "parent",
				states: {
					parent: {
						initial: "valid",
						states: {
							valid: {},
						},
					},
				},
			});

			expect(() => {
				machine.resolveState({ value: { parent: "invalid" } });
			}).toThrowError(RegExp("invalid"));
		});
	});

	it("should not replay actions when starting from a persisted state", () => {
		const entrySpy = jest.fn();
		const machine = createMachine({
			entry: entrySpy,
		});

		const actor = createActor(machine).start();

		expect(entrySpy).toHaveBeenCalledTimes(1);

		const persistedState = actor.getPersistedSnapshot();

		actor.stop();

		createActor(machine, { snapshot: persistedState }).start();

		expect(entrySpy).toHaveBeenCalledTimes(1);
	});

	it("should be able to stop a rehydrated child", async () => {
		const machine = createMachine({
			initial: "a",
			states: {
				a: {
					invoke: {
						src: fromPromise(() => Promise.resolve(11)),
						onDone: "b",
					},
					on: {
						NEXT: "c",
					},
				},
				b: {},
				c: {},
			},
		});

		const actor = createActor(machine).start();
		const persistedState = actor.getPersistedSnapshot();
		actor.stop();

		const rehydratedActor = createActor(machine, {
			snapshot: persistedState,
		}).start();

		expect(() =>
			rehydratedActor.send({
				type: "NEXT",
			}),
		).never.toThrow();

		expect(rehydratedActor.getSnapshot().value).toBe("c");
	});

	it("a rehydrated active child should be registered in the system", () => {
		const machine = createMachine(
			{
				context: ({ spawn }) => {
					spawn("foo", {
						systemId: "mySystemId",
					});
					return {};
				},
			},
			{
				actors: {
					foo: createMachine({}),
				},
			},
		);

		const actor = createActor(machine).start();
		const persistedState = actor.getPersistedSnapshot();
		actor.stop();

		const rehydratedActor = createActor(machine, {
			snapshot: persistedState,
		}).start();

		expect(rehydratedActor.system.get("mySystemId")).never.toBeUndefined();
	});

	it("a rehydrated done child should not be registered in the system", () => {
		const machine = createMachine(
			{
				context: ({ spawn }) => {
					spawn("foo", {
						systemId: "mySystemId",
					});
					return {};
				},
			},
			{
				actors: {
					foo: createMachine({ type: "final" }),
				},
			},
		);

		const actor = createActor(machine).start();
		const persistedState = actor.getPersistedSnapshot();
		actor.stop();

		const rehydratedActor = createActor(machine, {
			snapshot: persistedState,
		}).start();

		expect(rehydratedActor.system.get("mySystemId")).toBeUndefined();
	});

	it("a rehydrated done child should not re-notify the parent about its completion", () => {
		const spy = jest.fn();

		const machine = createMachine(
			{
				context: ({ spawn }) => {
					spawn("foo", {
						systemId: "mySystemId",
					});
					return {};
				},
				on: {
					"*": {
						actions: spy,
					},
				},
			},
			{
				actors: {
					foo: createMachine({ type: "final" }),
				},
			},
		);

		const actor = createActor(machine).start();
		const persistedState = actor.getPersistedSnapshot();
		actor.stop();

		spy.mockClear();

		createActor(machine, {
			snapshot: persistedState,
		}).start();

		expect(spy).never.toHaveBeenCalled();
	});

	it("should be possible to persist a rehydrated actor that got its children rehydrated", () => {
		const machine = createMachine(
			{
				invoke: {
					src: "foo",
				},
			},
			{
				actors: {
					foo: fromPromise(() => Promise.resolve(42)),
				},
			},
		);

		const actor = createActor(machine).start();

		const rehydratedActor = createActor(machine, {
			snapshot: actor.getPersistedSnapshot(),
		}).start();

		const persistedChildren = (rehydratedActor.getPersistedSnapshot() as AnyObject)
			.children as object;
		expect(Object.keys(persistedChildren)).toHaveLength(1);
		expect((Object.values(persistedChildren)[0] as AnyObject).src).toBe("foo");
	});

	it("should complete on a rehydrated final state", () => {
		const machine = createMachine({
			initial: "foo",
			states: {
				foo: {
					on: { NEXT: "bar" },
				},
				bar: {
					type: "final",
				},
			},
		});

		const actorRef = createActor(machine).start();
		actorRef.send({ type: "NEXT" });
		const persistedState = actorRef.getPersistedSnapshot();

		const spy = jest.fn();
		const actorRef2 = createActor(machine, { snapshot: persistedState });
		actorRef2.subscribe({
			complete: spy,
		});

		actorRef2.start();
		expect(spy).toHaveBeenCalled();
	});

	it("should error on a rehydrated error state", async () => {
		const machine = createMachine(
			{
				invoke: {
					src: "failure",
				},
			},
			{
				actors: {
					failure: fromPromise(() => Promise.reject(new Error("failure"))),
				},
			},
		);

		const actorRef = createActor(machine);
		actorRef.subscribe({ error: () => {} });
		actorRef.start();

		// wait a macrotask for the microtask related to the promise to be processed
		await sleep(0);

		const persistedState = actorRef.getPersistedSnapshot();

		const spy = jest.fn();
		const actorRef2 = createActor(machine, { snapshot: persistedState });
		actorRef2.subscribe({
			error: spy,
		});
		actorRef2.start();

		expect(spy).toHaveBeenCalled();
	});

	it(`shouldn't re-notify the parent about the error when rehydrating`, async () => {
		const spy = jest.fn();

		const machine = createMachine(
			{
				invoke: {
					src: "failure",
					onError: {
						actions: spy,
					},
				},
			},
			{
				actors: {
					failure: fromPromise(() => Promise.reject(new Error("failure"))),
				},
			},
		);

		const actorRef = createActor(machine);
		actorRef.start();

		// wait a macrotask for the microtask related to the promise to be processed
		await sleep(0);

		const persistedState = actorRef.getPersistedSnapshot();
		spy.mockClear();

		const actorRef2 = createActor(machine, { snapshot: persistedState });
		actorRef2.start();

		expect(spy).never.toHaveBeenCalled();
	});

	it("should continue syncing snapshots", () => {
		const subject = new BehaviorSubjectStub(0);
		const subjectLogic = fromObservable(() => subject);

		const spy = jest.fn();

		const machine = createMachine(
			{
				types: {} as {
					actors: {
						src: "service";
						logic: typeof subjectLogic;
					};
				},

				invoke: [
					{
						src: "service",
						onSnapshot: {
							actions: [({ event }) => spy(event.snapshot.context)],
						},
					},
				],
			},
			{
				actors: {
					service: subjectLogic,
				},
			},
		);

		createActor(machine, {
			snapshot: createActor(machine).getPersistedSnapshot(),
		}).start();

		spy.mockClear();

		subject.next(42);
		subject.next(100);

		expect(spy.mock.calls).toEqual([[42], [100]]);
	});

	it("should be able to rehydrate an actor deep in the tree", () => {
		const grandchild = createMachine({
			context: {
				count: 0,
			},
			on: {
				INC: {
					actions: assign({
						count: ({ context }) => context.count + 1,
					}),
				},
			},
		});
		const child = createMachine(
			{
				invoke: {
					src: "grandchild",
					id: "grandchild",
				},
				on: {
					INC: {
						actions: sendTo("grandchild", {
							type: "INC",
						}),
					},
				},
			},
			{
				actors: {
					grandchild,
				},
			},
		);
		const machine = createMachine(
			{
				invoke: {
					src: "child",
					id: "child",
				},
				on: {
					INC: {
						actions: sendTo("child", {
							type: "INC",
						}),
					},
				},
			},
			{
				actors: {
					child,
				},
			},
		);

		const actorRef = createActor(machine).start();
		actorRef.send({ type: "INC" });

		const persistedState = actorRef.getPersistedSnapshot();
		const actorRef2 = createActor(machine, { snapshot: persistedState });

		const _0 = actorRef2.getSnapshot().children.child.getSnapshot() as {
			children: { grandchild: { getSnapshot(): { context: { count: number } } } };
		};
		expect(_0.children.grandchild.getSnapshot().context.count).toBe(1);
	});
});
