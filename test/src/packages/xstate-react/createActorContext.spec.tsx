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
import { createMachine, assign, fromPromise, Snapshot, InspectionEvent } from "@rbxts/xstate";
import randomBase36String from "@rbxts/xstate/out/utils/polyfill/randomBase36String";
import { fireEvent, screen, render, waitFor } from "@rbxts/react-testing-library";
import { useSelector, createActorContext, shallowEqual } from "@rbxts/xstate-react";
import * as React from "@rbxts/react";

describe("createActorContext", () => {
	it("should work with useSelector", () => {
		const someMachine = createMachine({
			initial: "a",
			states: { a: {} },
		});

		const SomeContext = createActorContext(someMachine);

		const Component = () => {
			const value = SomeContext.useSelector(state => state.value as string);

			return <textlabel Tag="data-testid=value" Text={value}></textlabel>;
		};

		const App = () => {
			return (
				<SomeContext.Provider>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("a");
	});

	it("the actor should be able to receive events", () => {
		const someMachine = createMachine({
			initial: "a",
			states: {
				a: {
					on: {
						NEXT: "b",
					},
				},
				b: {},
			},
		});

		const SomeContext = createActorContext(someMachine);

		const Component = () => {
			const actorRef = SomeContext.useActorRef();
			const state = SomeContext.useSelector(s => s);

			return (
				<frame>
					<textlabel Tag="data-testid=value" Text={state.value as string}></textlabel>
					<textbutton
						Tag="data-testid=next"
						Event={{
							Activated: () => actorRef.send({ type: "NEXT" }),
						}}
					></textbutton>
				</frame>
			);
		};

		const App = () => {
			return (
				<SomeContext.Provider>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("a");

		fireEvent.click(screen.getByTestId("next"));

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("b");
	});

	it("should work with useSelector and a custom comparator", async () => {
		interface MachineContext {
			obj: {
				counter: number;
			};
			arr: string[];
		}
		const someMachine = createMachine({
			context: {
				obj: {
					counter: 0,
				},
				arr: [] as string[],
			},
			on: {
				INC: {
					actions: assign(({ context }) => ({
						obj: {
							counter: context.obj.counter + 1,
						},
					})),
				},
				PUSH: {
					actions: assign(({ context }) => ({
						arr: [...context.arr, randomBase36String()],
					})),
				},
			},
		});

		const SomeContext = createActorContext(someMachine);

		let rerenders = 0;

		const Component = () => {
			const actor = SomeContext.useActorRef();
			const value = SomeContext.useSelector(state => state.context.obj, shallowEqual);

			rerenders += 1;

			return (
				<frame>
					<textbutton
						Event={{ Activated: () => actor.send({ type: "INC" }) }}
						Text="Inc"
					></textbutton>
					<textbutton
						Event={{ Activated: () => actor.send({ type: "PUSH" }) }}
						Text="Push"
					></textbutton>
					<textlabel Tag="data-testid=value" Text={`${value.counter}`}></textlabel>
				</frame>
			);
		};

		const App = () => {
			return (
				<SomeContext.Provider>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("0");
		expect(rerenders).toBe(1);

		fireEvent.click(screen.getByText("Inc"));

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("1");
		expect(rerenders).toBe(2);

		fireEvent.click(screen.getByText("Push"));

		expect(rerenders).toBe(2);

		fireEvent.click(screen.getByText("Inc"));

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("2");
		expect(rerenders).toBe(3);
	});

	it("should work with useActorRef", () => {
		const someMachine = createMachine({
			initial: "a",
			states: { a: {} },
		});

		const SomeContext = createActorContext(someMachine);

		const Component = () => {
			const actor = SomeContext.useActorRef();
			const value = useSelector(actor, state => state.value);

			return <textlabel Tag="data-testid=value" Text={value as string}></textlabel>;
		};

		const App = () => {
			return (
				<SomeContext.Provider>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("a");
	});

	it("should work with a provided machine", () => {
		const createSomeMachine = (context: { count: number }) =>
			createMachine({
				context,
			});

		const SomeContext = createActorContext(createSomeMachine({ count: 0 }));

		const Component = () => {
			const actor = SomeContext.useActorRef();
			const count = useSelector(actor, state => state.context.count);

			return <textlabel Tag="data-testid=value" Text={`${count}`}></textlabel>;
		};

		const otherMachine = createSomeMachine({ count: 42 });

		const App = () => {
			return (
				<SomeContext.Provider logic={otherMachine}>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("42");
	});

	it("useActorRef should throw when the actor was not provided", () => {
		const SomeContext = createActorContext(createMachine({}));

		const App = () => {
			SomeContext.useActorRef();
			return <></>;
		};

		expect(() => render(<App />)).toThrowErrorMatchingInlineSnapshot(
			`"You used a hook from "ActorProvider" but it's not inside a <ActorProvider> component."`,
		);
	});

	it("useSelector should throw when the actor was not provided", () => {
		const SomeContext = createActorContext(createMachine({}));

		const App = () => {
			SomeContext.useSelector(a => a);
			return <></>;
		};

		expect(() => render(<App />)).toThrowErrorMatchingInlineSnapshot(
			`"You used a hook from "ActorProvider" but it's not inside a <ActorProvider> component."`,
		);
	});

	it("should be able to pass interpreter options to the provider", () => {
		const someMachine = createMachine({
			initial: "a",
			states: {
				a: {
					entry: ["testAction"],
				},
			},
		});
		const stubFn = jest.fn();
		const SomeContext = createActorContext(someMachine);

		const Component = () => {
			return <></>;
		};

		const App = () => {
			return (
				<SomeContext.Provider
					logic={someMachine.provide({
						actions: {
							testAction: stubFn,
						},
					})}
				>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect(stubFn).toHaveBeenCalledTimes(1);
	});

	it("should work with other types of logic", async () => {
		const PromiseContext = createActorContext(fromPromise(() => Promise.resolve(42)));

		const Component = () => {
			const value = PromiseContext.useSelector(data => data);

			return <textlabel Tag="data-testid=value" Text={`${value.output}`}></textlabel>;
		};

		const App = () => {
			return (
				<PromiseContext.Provider>
					<Component />
				</PromiseContext.Provider>
			);
		};

		render(<App />);

		await waitFor(() => {
			expect((screen.getByTestId("value") as TextLabel).Text).toBe("42");
		});
	});

	it("should preserve machine's identity when swapping options using in-render `.provide`", () => {
		const someMachine = createMachine({
			context: { count: 0 },
			on: {
				inc: {
					actions: assign({ count: ({ context }) => context.count + 1 }),
				},
			},
		});
		const stubFn = jest.fn();
		const SomeContext = createActorContext(someMachine);

		const Component = () => {
			const ref = SomeContext.useActorRef();
			const count = SomeContext.useSelector(state => state.context.count);
			return (
				<frame>
					<textlabel Tag="data-testid=count" Text={`${count}`}></textlabel>
					<textbutton
						Tag="data-testid=button"
						Event={{ Activated: () => ref.send({ type: "inc" }) }}
						Text="Inc"
					></textbutton>
				</frame>
			);
		};

		const App = () => {
			return (
				<SomeContext.Provider
					logic={someMachine.provide({
						actions: {
							testAction: stubFn,
						},
					})}
				>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect((screen.getByTestId("count") as TextLabel).Text).toBe("0");
		fireEvent.click(screen.getByTestId("button"));

		expect((screen.getByTestId("count") as TextLabel).Text).toBe("1");

		fireEvent.click(screen.getByTestId("button"));

		expect((screen.getByTestId("count") as TextLabel).Text).toBe("2");
	});

	it("options can be passed to the provider", () => {
		const machine = createMachine({
			initial: "a",
			states: {
				a: {
					on: {
						next: "b",
					},
				},
				b: {},
			},
		});
		const SomeContext = createActorContext(machine);
		let persistedState: Snapshot<unknown> | undefined = undefined;

		const Component = () => {
			const actorRef = SomeContext.useActorRef();
			const state = SomeContext.useSelector(state => state);

			persistedState = actorRef.getPersistedSnapshot();

			return (
				<textbutton
					Tag="data-testid=value"
					Text={state.value as string}
					Event={{
						Activated: () => {
							actorRef.send({ type: "next" });
						},
					}}
				></textbutton>
			);
		};

		const App = () => {
			return (
				<SomeContext.Provider options={{ snapshot: persistedState }}>
					<Component />
				</SomeContext.Provider>
			);
		};

		const { unmount } = render(<App />);

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("a");

		fireEvent.click(screen.getByTestId("value") as TextLabel);

		// Ensure that the state machine without restored state functions as normal
		expect((screen.getByTestId("value") as TextLabel).Text).toBe("b");

		// unrender app
		unmount();

		// At this point, `state` should be `{ value: 'b' }`

		// re-render app
		render(<App />);

		// Ensure that the state machine is restored to the persisted state
		expect((screen.getByTestId("value") as TextLabel).Text).toBe("b");
	});

	it("input can be passed to the provider", () => {
		const SomeContext = createActorContext(
			createMachine({
				types: {} as {
					context: { doubled: number };
				},
				context: ({ input }: { input: number }) => ({
					doubled: input * 2,
				}),
			}),
		);

		const Component = () => {
			const doubled = SomeContext.useSelector(state => state.context.doubled);

			return <textlabel Tag="data-testid=value" Text={`${doubled}`}></textlabel>;
		};

		const App = () => {
			return (
				<SomeContext.Provider options={{ input: 42 }}>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect((screen.getByTestId("value") as TextLabel).Text).toBe("84");
	});

	it("should merge createActorContext options with options passed to the provider", () => {
		const events: InspectionEvent[] = [];
		const SomeContext = createActorContext(
			createMachine({
				types: {
					context: {} as { count: number },
					input: {} as number,
				},
				context: ({ input }) => ({ count: input }),
			}),
			{
				inspect: ev => {
					events.push(ev);
				},
			},
		);

		const Component = () => {
			const count = SomeContext.useSelector(state => state.context.count);

			return <textlabel Tag="data-testid=value" Text={`${count}`}></textlabel>;
		};

		const App = () => {
			return (
				<SomeContext.Provider options={{ input: 10 }}>
					<Component />
				</SomeContext.Provider>
			);
		};

		render(<App />);

		expect(events.size()).toBeGreaterThan(0);
		expect(events).toContainEqual(
			expect.objectContaining({
				snapshot: expect.objectContaining({
					context: { count: 10 },
				}),
			}),
		);
	});
});
