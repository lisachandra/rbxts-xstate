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
import { act, fireEvent, screen } from "@rbxts/react-testing-library";
import * as React from "@rbxts/react";
import { useState } from "@rbxts/react";
// import { BehaviorSubject } from "rxjs";
import {
	Actor,
	ActorLogicFrom,
	ActorRef,
	AnyObject,
	DoneActorEvent,
	Snapshot,
	StateFrom,
	assign,
	createActor,
	createMachine,
	raise,
	setup,
} from "@rbxts/xstate";
import { fromCallback, fromObservable, fromPromise } from "@rbxts/xstate";
import { useActor, useSelector } from "@rbxts/xstate-react";
import { describeEachReactMode } from "./utils";
import { sleep } from "test/env-utils";
import { HttpService } from "@rbxts/services";
import { BehaviorSubjectStub } from "packages/xstate-core/utils";
import { Error } from "@rbxts/luau-polyfill";

afterEach(() => {
	jest.useRealTimers();
});

describeEachReactMode("useActor (%s)", ({ suiteKey, render }) => {
	const context = {
		data: undefined as undefined | string,
	};
	const fetchMachine = createMachine({
		id: "fetch",
		types: {} as {
			context: typeof context;
			events: { type: "FETCH" } | DoneActorEvent;
			actors: {
				src: "fetchData";
				logic: ActorLogicFrom<Promise<string>>;
			};
		},
		initial: "idle",
		context,
		states: {
			idle: {
				on: { FETCH: "loading" },
			},
			loading: {
				invoke: {
					id: "fetchData",
					src: "fetchData",
					onDone: {
						target: "success",
						actions: assign({
							data: ({ event }) => {
								return event.output;
							},
						}),
						guard: ({ event }) => !!event.output.size(),
					},
				},
			},
			success: {
				type: "final",
			},
		},
	});

	const actorRef = createActor(
		fetchMachine.provide({
			actors: {
				fetchData: createMachine({
					initial: "done",
					states: {
						done: {
							type: "final",
						},
					},
					output: "persisted data",
				}) as any,
			},
		}),
	).start();
	actorRef.send({ type: "FETCH" });

	const persistedSuccessFetchState = actorRef.getPersistedSnapshot();

	const Fetcher: React.FC<{
		onFetch: () => Promise<any>;
		persistedState?: Snapshot<unknown>;
	}> = ({
		onFetch = () => {
			return new Promise(res => res("some data"));
		},
		persistedState,
	}) => {
		const [current, send] = useActor(
			fetchMachine.provide({
				actors: {
					fetchData: fromPromise(onFetch),
				},
			}),
			{
				snapshot: persistedState,
			},
		);

		switch (current.value) {
			case "idle":
				return (
					<textbutton
						Event={{ Activated: _ => send({ type: "FETCH" }) }}
						Text="Fetch"
					></textbutton>
				);
			case "loading":
				return <textlabel Text="Loading..."></textlabel>;
			case "success":
				return (
					<frame>
						<textlabel Text="Success! Data:"></textlabel>
						<textlabel Tag="data-testid=data" Text={current.context.data}></textlabel>
					</frame>
				);
			default:
				return <></>;
		}
	};

	it("should work with the useActor hook", async () => {
		render(<Fetcher onFetch={() => new Promise(res => res("fake data"))} />);
		const button = screen.getByText("Fetch");
		fireEvent.click(button);
		screen.getByText("Loading...");
		await screen.findByText("Success! Data:");
		const dataEl = screen.getByTestId("data");
		expect((dataEl as TextLabel).Text).toBe("fake data");
	});

	it("should work with the useActor hook (rehydrated state)", async () => {
		render(
			<Fetcher
				onFetch={() => new Promise(res => res("fake data"))}
				persistedState={persistedSuccessFetchState}
			/>,
		);

		await screen.findByText("Success! Data:");
		const dataEl = screen.getByTestId("data");
		expect((dataEl as TextLabel).Text).toBe("persisted data");
	});

	it("should work with the useMachine hook (rehydrated state config)", async () => {
		const persistedFetchStateConfig = HttpService.JSONDecode(
			HttpService.JSONEncode(persistedSuccessFetchState),
		) as never;
		render(
			<Fetcher
				onFetch={() => new Promise(res => res("fake data"))}
				persistedState={persistedFetchStateConfig}
			/>,
		);

		await screen.findByText("Success! Data:");
		const dataEl = screen.getByTestId("data");
		expect((dataEl as TextLabel).Text).toBe("persisted data");
	});

	it("should provide the service", () => {
		const Test = () => {
			const [, , service] = useActor(fetchMachine);

			if (!(service instanceof Actor)) {
				throw new Error("service not instance of Interpreter");
			}

			return <></>;
		};

		render(<Test />);
	});

	it("should accept input and provide it to the context factory", () => {
		const testMachine = createMachine({
			types: {} as {
				context: { foo: string; test: boolean };
				input: { test: boolean };
			},
			context: ({ input }) => ({
				foo: "bar",
				test: input.test ?? false,
			}),
			initial: "idle",
			states: {
				idle: {},
			},
		});

		const Test = () => {
			const [state] = useActor(testMachine, {
				input: { test: true },
			});

			expect(state.context).toEqual({
				foo: "bar",
				test: true,
			});

			return <></>;
		};

		render(<Test />);
	});

	it("should not spawn actors until service is started", async () => {
		const spawnMachine = createMachine({
			types: {} as { context: { ref?: ActorRef<any, any> } },
			id: "spawn",
			initial: "start",
			context: { ref: undefined },
			states: {
				start: {
					entry: assign({
						ref: ({ spawn }) =>
							spawn(
								fromPromise(() => {
									return new Promise(res => res(42));
								}),
								{ id: "my-promise" },
							),
					}),
					on: {
						"xstate.done.actor.my-promise": "success",
					},
				},
				success: {
					type: "final",
				},
			},
		});

		const Spawner = () => {
			const [current] = useActor(spawnMachine);

			switch (current.value) {
				case "start":
					return <frame Tag="data-testid=start" />;
				case "success":
					return <frame Tag="data-testid=success" />;
				default:
					return <></>;
			}
		};

		render(<Spawner />);

		await screen.findByTestId("success");
	});

	it("actions should not use stale data in a builtin transition action", (_, done) => {
		const toggleMachine = createMachine({
			types: {} as {
				context: { latest: number };
				events: { type: "SET_LATEST" };
			},
			context: {
				latest: 0,
			},
			on: {
				SET_LATEST: {
					actions: "setLatest",
				},
			},
		});

		const Component = () => {
			const [ext, setExt] = useState(1);

			const [, send] = useActor(
				toggleMachine.provide({
					actions: {
						setLatest: assign({
							latest: () => {
								expect(ext).toBe(2);
								done();
								return ext;
							},
						}),
					},
				}),
			);

			return (
				<frame>
					<textbutton
						Tag="data-testid=extbutton"
						Event={{
							Activated: _ => {
								setExt(2);
							},
						}}
					/>
					<textbutton
						Tag="data-testid=button"
						Event={{
							Activated: _ => {
								send({ type: "SET_LATEST" });
							},
						}}
					/>
				</frame>
			);
		};

		render(<Component />);

		const button = screen.getByTestId("button");
		const extButton = screen.getByTestId("extbutton");
		fireEvent.click(extButton);

		fireEvent.click(button);
	});

	it("actions should not use stale data in a builtin entry action", (_, done) => {
		const toggleMachine = createMachine({
			types: {} as { context: { latest: number }; events: { type: "NEXT" } },
			context: {
				latest: 0,
			},
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {
					entry: "setLatest",
				},
			},
		});

		const Component = () => {
			const [ext, setExt] = useState(1);

			const [, send] = useActor(
				toggleMachine.provide({
					actions: {
						setLatest: assign({
							latest: () => {
								expect(ext).toBe(2);
								done();
								return ext;
							},
						}),
					},
				}),
			);

			return (
				<frame>
					<textbutton
						Tag="data-testid=extbutton"
						Event={{
							Activated: _ => {
								setExt(2);
							},
						}}
					/>
					<textbutton
						Tag="data-testid=button"
						Event={{
							Activated: _ => {
								send({ type: "NEXT" });
							},
						}}
					/>
				</frame>
			);
		};

		render(<Component />);

		const button = screen.getByTestId("button");
		const extButton = screen.getByTestId("extbutton");
		fireEvent.click(extButton);

		fireEvent.click(button);
	});

	it("actions should not use stale data in a custom entry action", (_, done) => {
		const toggleMachine = createMachine({
			types: {} as {
				events: { type: "TOGGLE" };
			},
			initial: "inactive",
			states: {
				inactive: {
					on: { TOGGLE: "active" },
				},
				active: {
					entry: "doAction",
				},
			},
		});

		const Toggle = () => {
			const [ext, setExt] = useState(false);

			const doAction = React.useCallback(() => {
				expect(ext).toBeTruthy();
				done();
			}, [ext]);

			const [, send] = useActor(
				toggleMachine.provide({
					actions: {
						doAction,
					},
				}),
			);

			return (
				<frame>
					<textbutton
						Tag="data-testid=extbutton"
						Event={{
							Activated: _ => {
								setExt(true);
							},
						}}
					/>
					<textbutton
						Tag="data-testid=button"
						Event={{
							Activated: _ => {
								send({ type: "TOGGLE" });
							},
						}}
					/>
				</frame>
			);
		};

		render(<Toggle />);

		const button = screen.getByTestId("button");
		const extButton = screen.getByTestId("extbutton");
		fireEvent.click(extButton);

		fireEvent.click(button);
	});

	it("should only render once when initial microsteps are involved", () => {
		let rerenders = 0;

		const m = createMachine(
			{
				types: {} as { context: { stuff: number[] } },
				initial: "init",
				context: { stuff: [1, 2, 3] },
				states: {
					init: {
						entry: "setup",
						always: "ready",
					},
					ready: {},
				},
			},
			{
				actions: {
					setup: assign({
						stuff: ({ context }) => [...context.stuff, 4],
					}),
				},
			},
		);

		const App = () => {
			useActor(m);
			rerenders++;
			return <></>;
		};

		render(<App />);

		expect(rerenders).toBe(suiteKey === "strict" ? 2 : 1);
	});

	it("should maintain the same reference for objects created when resolving initial state", () => {
		let effectsFired = 0;

		const m = createMachine(
			{
				types: {} as { context: { counter: number; stuff: number[] } },
				initial: "init",
				context: { counter: 0, stuff: [1, 2, 3] },
				states: {
					init: {
						entry: "setup",
					},
				},
				on: {
					INC: {
						actions: "increase",
					},
				},
			},
			{
				actions: {
					setup: assign({
						stuff: ({ context }) => [...context.stuff, 4],
					}),
					increase: assign({
						counter: ({ context }) => ++context.counter,
					}),
				},
			},
		);

		const App = () => {
			const [state, send] = useActor(m);

			// this effect should only fire once since `stuff` never changes
			React.useEffect(() => {
				effectsFired++;
			}, [state.context.stuff]);

			return (
				<frame>
					<textlabel Text={`Counter: ${state.context.counter}`}></textlabel>
					<textbutton
						Event={{ Activated: () => send({ type: "INC" }) }}
						Text="Increase"
					></textbutton>
				</frame>
			);
		};

		const { getByText } = render(<App />);

		expect(effectsFired).toBe(suiteKey === "strict" ? 2 : 1);

		const button = getByText("Increase");
		fireEvent.click(button);

		expect(effectsFired).toBe(suiteKey === "strict" ? 2 : 1);
	});

	it("should successfully spawn actors from the lazily declared context", () => {
		let childSpawned = false;

		const machine = createMachine({
			context: ({ spawn }) => ({
				ref: spawn(
					fromCallback(() => {
						childSpawned = true;
					}),
				),
			}),
		});

		const App = () => {
			useActor(machine);
			return <></>;
		};

		render(<App />);

		expect(childSpawned).toBe(true);
	});

	it("should be able to use an action provided outside of React", () => {
		let actionCalled = false;

		const machine = createMachine(
			{
				on: {
					EV: {
						actions: "foo",
					},
				},
			},
			{
				actions: {
					foo: () => (actionCalled = true),
				},
			},
		);

		const App = () => {
			const [_state, send] = useActor(machine);
			React.useEffect(() => {
				send({ type: "EV" });
			}, []);
			return <></>;
		};

		render(<App />);

		expect(actionCalled).toBe(true);
	});

	it("should be able to use a guard provided outside of React", () => {
		let guardCalled = false;

		const machine = createMachine(
			{
				initial: "a",
				states: {
					a: {
						on: {
							EV: {
								guard: "isAwesome",
								target: "b",
							},
						},
					},
					b: {},
				},
			},
			{
				guards: {
					isAwesome: () => {
						guardCalled = true;
						return true;
					},
				},
			},
		);

		const App = () => {
			const [_state, send] = useActor(machine);
			React.useEffect(() => {
				send({ type: "EV" });
			}, []);
			return <></>;
		};

		render(<App />);

		expect(guardCalled).toBe(true);
	});

	it("should be able to use a service provided outside of React", () => {
		let serviceCalled = false;

		const machine = createMachine(
			{
				initial: "a",
				states: {
					a: {
						on: {
							EV: "b",
						},
					},
					b: {
						invoke: {
							src: "foo",
						},
					},
				},
			},
			{
				actors: {
					foo: fromPromise(() => {
						serviceCalled = true;
						return Promise.resolve();
					}),
				},
			},
		);

		const App = () => {
			const [_state, send] = useActor(machine);
			React.useEffect(() => {
				send({ type: "EV" });
			}, []);
			return <></>;
		};

		render(<App />);

		expect(serviceCalled).toBe(true);
	});

	it("should be able to use a delay provided outside of React", () => {
		jest.useFakeTimers();

		const machine = setup({
			delays: {
				myDelay: () => {
					return 300;
				},
			},
		}).createMachine({
			initial: "a",
			states: {
				a: {
					on: {
						EV: "b",
					},
				},
				b: {
					after: {
						myDelay: "c",
					},
				},
				c: {},
			},
		});

		const App = () => {
			const [state, send] = useActor(machine);
			return (
				<frame>
					<textlabel Tag="data-testid=result" Text={state.value}></textlabel>
					<textbutton
						Tag="data-testid=button"
						Event={{ Activated: () => send({ type: "EV" }) }}
					/>
				</frame>
			);
		};

		render(<App />);

		const btn = screen.getByTestId("button");
		fireEvent.click(btn);

		expect((screen.getByTestId("result") as TextLabel).Text).toBe("b");

		act(() => {
			jest.advanceTimersByTime(310);
		});

		expect((screen.getByTestId("result") as TextLabel).Text).toBe("c");
	});

	it("should not use stale data in a guard", () => {
		const machine = setup({
			guards: {
				isAwesome: () => false,
			},
		}).createMachine({
			initial: "a",
			states: {
				a: {
					on: {
						EV: {
							guard: "isAwesome",
							target: "b",
						},
					},
				},
				b: {},
			},
		});

		const App = ({ isAwesome }: { isAwesome: boolean }) => {
			const [state, send] = useActor(
				machine.provide({
					guards: {
						isAwesome: () => isAwesome,
					},
				}),
			);
			return (
				<frame>
					<textlabel Tag="data-testid=result" Text={state.value}></textlabel>
					<textbutton
						Tag="data-testid=button"
						Event={{ Activated: () => send({ type: "EV" }) }}
					/>
				</frame>
			);
		};

		const { rerender } = render(<App isAwesome={false} />);
		rerender(<App isAwesome={true} />);

		const btn = screen.getByTestId("button");
		fireEvent.click(btn);

		expect((screen.getByTestId("result") as TextLabel).Text).toBe("b");
	});

	it("should not invoke initial services more than once", () => {
		let activatedCount = 0;
		const machine = createMachine({
			initial: "active",
			invoke: {
				src: fromCallback(() => {
					activatedCount++;
					return () => {
						/* empty */
					};
				}),
			},
			states: {
				active: {},
			},
		});

		const Test = () => {
			useActor(machine);

			return <></>;
		};

		render(<Test />);

		expect(activatedCount).toEqual(suiteKey === "strict" ? 2 : 1);
	});

	it("child component should be able to send an event to a parent immediately in an effect", () => {
		const machine = setup({}).createMachine({
			types: {} as {
				events: {
					type: "FINISH";
				};
			},
			initial: "active",
			states: {
				active: {
					on: { FINISH: "success" },
				},
				success: {},
			},
		});

		const ChildTest: React.FC<{ send: any }> = ({ send }) => {
			// This will send an event to the parent service
			// BEFORE the service is ready.
			React.useLayoutEffect(() => {
				(send as Callback)({ type: "FINISH" });
			}, []);

			return <></>;
		};

		const Test = () => {
			const [state, send] = useActor(machine);

			return (
				<textlabel Text={state.value}>
					<ChildTest send={send} />
				</textlabel>
			);
		};

		const { container } = render(<Test />);

		expect((container as TextLabel).Text).toBe("success");
	});

	it("custom data should be available right away for the invoked actor", () => {
		const childMachine = createMachine({
			types: {
				context: {} as { value: number },
			},
			initial: "initial",
			context: ({ input }: { input: { value: number } }) => {
				return {
					value: input.value,
				};
			},
			states: {
				initial: {},
			},
		});

		const machine = createMachine(
			{
				types: {} as {
					actors: {
						src: "child";
						logic: typeof childMachine;
						id: "test";
					};
				},
				initial: "active",
				states: {
					active: {
						invoke: {
							src: "child",
							id: "test",
							input: { value: 42 },
						},
					},
				},
			},
			{
				actors: { child: childMachine },
			},
		);

		const Test = () => {
			const [state] = useActor(machine);
			const childState = useSelector(state.children.test!, s => s);

			expect(childState.context.value).toBe(42);

			return <></>;
		};

		render(<Test />);
	});

	// https://github.com/statelyai/xstate/issues/1334
	it("delayed transitions should work when initializing from a rehydrated state", () => {
		jest.useFakeTimers();
		const testMachine = createMachine({
			types: {} as {
				events: {
					type: "START";
				};
			},
			id: "app",
			initial: "idle",
			states: {
				idle: {
					on: {
						START: "doingStuff",
					},
				},
				doingStuff: {
					id: "doingStuff",
					after: {
						100: "idle",
					},
				},
			},
		});

		const actorRef = createActor(testMachine).start();
		const persistedState = HttpService.JSONEncode(actorRef.getPersistedSnapshot());
		actorRef.stop();

		let currentState: StateFrom<typeof testMachine>;

		const Test = () => {
			const [state, send] = useActor(testMachine, {
				snapshot: HttpService.JSONDecode(persistedState) as never,
			});

			currentState = state;

			return (
				<textbutton
					Event={{ Activated: () => send({ type: "START" }) }}
					Tag="data-testid=button"
				></textbutton>
			);
		};

		render(<Test />);

		const button = screen.getByTestId("button");

		fireEvent.click(button);
		act(() => {
			jest.advanceTimersByTime(110);
		});

		expect(currentState!.matches("idle")).toBe(true);
	});

	it("should not miss initial synchronous updates", () => {
		const m = createMachine({
			types: {} as { context: { count: number } },
			initial: "idle",
			context: {
				count: 0,
			},
			entry: [assign({ count: 1 }), raise({ type: "INC" })],
			on: {
				INC: {
					actions: [
						assign({ count: ({ context }) => context.count + 1 }),
						raise({ type: "UNHANDLED" }),
					],
				},
			},
			states: {
				idle: {},
			},
		});

		const App = () => {
			const [state] = useActor(m);
			return <textlabel Text={`${state.context.count}`}></textlabel>;
		};

		const { container } = render(<App />);

		expect((container as TextLabel).Text).toBe("2");
	});

	it("should deliver messages sent from an effect to an actor registered in the system", () => {
		const spy = jest.fn();
		const m = createMachine({
			invoke: {
				systemId: "child",
				src: createMachine({
					on: {
						PING: {
							actions: spy,
						},
					},
				}),
			},
		});

		const App = () => {
			const [_state, _send, actor] = useActor(m);

			React.useEffect(() => {
				((actor.system.get("child") as AnyObject).send as Callback)({ type: "PING" });
			});

			return <></>;
		};

		render(<App />);

		expect(spy).toHaveBeenCalledTimes(suiteKey === "strict" ? 2 : 1);
	});

	it("should work with `onSnapshot`", () => {
		const subject = new BehaviorSubjectStub(0);

		const spy = jest.fn();

		const machine = createMachine({
			invoke: [
				{
					src: fromObservable(() => subject),
					onSnapshot: {
						actions: [({ event }) => spy((event.snapshot as AnyObject).context)],
					},
				},
			],
		});

		const App = () => {
			useActor(machine);
			return <></>;
		};

		render(<App />);

		spy.mockClear();

		subject.next(42);
		subject.next(100);

		expect(spy.mock.calls).toEqual([[42], [100]]);
	});

	it("should execute a delayed transition of the initial state", async () => {
		const machine = setup({}).createMachine({
			initial: "one",
			states: {
				one: {
					after: {
						10: "two",
					},
				},
				two: {},
			},
		});

		const App = () => {
			const [state] = useActor(machine);
			return <textlabel Text={state.value} />;
		};

		const { container } = render(<App />);

		expect((container as TextLabel).Text).toBe("one");

		await act(async () => {
			await sleep(10);
		});

		expect((container as TextLabel).Text).toBe("two");
	});
});
