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
import { act, fireEvent, screen } from "@rbxts/react-testing-library";
import * as React from "@rbxts/react";
import {
	ActorRef,
	ActorRefFrom,
	AnyMachineSnapshot,
	assign,
	createMachine,
	fromTransition,
	createActor,
	StateFrom,
	Snapshot,
	TransitionSnapshot,
	AnyEventObject,
	setup,
	AnyObject,
} from "@rbxts/xstate";
import { shallowEqual, useActorRef, useMachine, useSelector } from "@rbxts/xstate-react";
import { describeEachReactMode } from "./utils";

describeEachReactMode("useSelector (%s)", ({ suiteKey, render }) => {
	it("only rerenders for selected values", () => {
		const machine = createMachine({
			types: {} as { context: { count: number; other: number } },
			initial: "active",
			context: {
				other: 0,
				count: 0,
			},
			states: {
				active: {},
			},
			on: {
				OTHER: {
					actions: assign({ other: ({ context }) => context.other + 1 }),
				},
				INCREMENT: {
					actions: assign({ count: ({ context }) => context.count + 1 }),
				},
			},
		});

		let rerenders = 0;

		const App = () => {
			const service = useActorRef(machine);
			const count = useSelector(service, state => state.context.count);

			rerenders++;

			return (
				<frame>
					<textlabel Tag="data-testid=count" Text={`${count}`}></textlabel>
					<textbutton
						Tag="data-testid=other"
						Event={{ Activated: () => service.send({ type: "OTHER" }) }}
					></textbutton>
					<textbutton
						Tag="data-testid=increment"
						Event={{ Activated: () => service.send({ type: "INCREMENT" }) }}
					></textbutton>
				</frame>
			);
		};

		render(<App />);
		const countButton = screen.getByTestId("count") as TextLabel;
		const otherButton = screen.getByTestId("other") as TextLabel;
		const incrementEl = screen.getByTestId("increment") as TextLabel;

		fireEvent.click(incrementEl);

		rerenders = 0;

		fireEvent.click(otherButton);
		fireEvent.click(otherButton);
		fireEvent.click(otherButton);
		fireEvent.click(otherButton);

		expect(rerenders).toEqual(0);

		fireEvent.click(incrementEl);

		expect(countButton.Text).toBe("2");
	});

	it("should work with a custom comparison function", () => {
		const machine = createMachine({
			types: {} as {
				context: { name: string };
				events: { type: "CHANGE"; value: string };
			},
			initial: "active",
			context: {
				name: "david",
			},
			states: {
				active: {},
			},
			on: {
				CHANGE: {
					actions: assign({ name: ({ event }) => event.value }),
				},
			},
		});

		const App = () => {
			const service = useActorRef(machine);
			const name = useSelector(
				service,
				state => state.context.name,
				(a, b) => a.upper() === b.upper(),
			);

			return (
				<frame>
					<textlabel Tag="data-testid=name" Text={name}></textlabel>
					<textbutton
						Tag="data-testid=sendUpper"
						Event={{
							Activated: () => service.send({ type: "CHANGE", value: "DAVID" }),
						}}
					></textbutton>
					<textbutton
						Tag="data-testid=sendOther"
						Event={{
							Activated: () => service.send({ type: "CHANGE", value: "other" }),
						}}
					></textbutton>
				</frame>
			);
		};

		render(<App />);
		const nameEl = screen.getByTestId("name") as TextLabel;
		const sendUpperButton = screen.getByTestId("sendUpper") as TextLabel;
		const sendOtherButton = screen.getByTestId("sendOther") as TextLabel;

		expect(nameEl.Text).toEqual("david");

		fireEvent.click(sendUpperButton);

		// unchanged due to comparison function
		expect(nameEl.Text).toEqual("david");

		fireEvent.click(sendOtherButton);

		expect(nameEl.Text).toEqual("other");

		fireEvent.click(sendUpperButton);

		expect(nameEl.Text).toEqual("DAVID");
	});

	it("should work with the shallowEqual comparison function", () => {
		const machine = createMachine({
			types: {} as { context: { user: { name: string } } },
			initial: "active",
			context: {
				user: { name: "david" },
			},
			states: {
				active: {},
			},
			on: {
				"change.same": {
					// New object reference
					actions: assign({ user: { name: "david" } }),
				},
				"change.other": {
					// New object reference
					actions: assign({ user: { name: "other" } }),
				},
			},
		});

		const App = () => {
			const service = useActorRef(machine);
			const [userChanges, setUserChanges] = React.useState(0);
			const user = useSelector(service, state => state.context.user, shallowEqual);
			const prevUser = React.useRef(user);

			React.useEffect(() => {
				if (user !== prevUser.current) {
					setUserChanges(c => c + 1);
				}
				prevUser.current = user;
			}, [user]);

			return (
				<frame>
					<textlabel Tag="data-testid=name" Text={user.name}></textlabel>
					<textlabel Tag="data-testid=changes" Text={`${userChanges}`}></textlabel>
					<textbutton
						Tag="data-testid=sendSame"
						Event={{ Activated: () => service.send({ type: "change.same" }) }}
					></textbutton>
					<textbutton
						Tag="data-testid=sendOther"
						Event={{ Activated: () => service.send({ type: "change.other" }) }}
					></textbutton>
				</frame>
			);
		};

		render(<App />);
		const nameEl = screen.getByTestId("name") as TextLabel;
		const changesEl = screen.getByTestId("changes") as TextLabel;
		const sendSameButton = screen.getByTestId("sendSame") as TextLabel;
		const sendOtherButton = screen.getByTestId("sendOther") as TextLabel;

		expect(nameEl.Text).toEqual("david");

		// unchanged due to comparison function
		fireEvent.click(sendSameButton);
		expect(nameEl.Text).toEqual("david");
		expect(changesEl.Text).toEqual("0");

		// changed
		fireEvent.click(sendOtherButton);
		expect(nameEl.Text).toEqual("other");
		expect(changesEl.Text).toEqual("1");

		// changed
		fireEvent.click(sendSameButton);
		expect(nameEl.Text).toEqual("david");
		expect(changesEl.Text).toEqual("2");

		// unchanged due to comparison function
		fireEvent.click(sendSameButton);
		expect(nameEl.Text).toEqual("david");
		expect(changesEl.Text).toEqual("2");
	});

	it("should work with selecting values from initially invoked actors", () => {
		const childMachine = createMachine({
			id: "childMachine",
			initial: "active",
			states: {
				active: {},
			},
		});
		const machine = createMachine({
			initial: "active",
			invoke: {
				id: "child",
				src: childMachine,
			},
			states: {
				active: {},
			},
		});

		const ChildTest: React.FC<{
			actor: ActorRefFrom<typeof childMachine>;
		}> = ({ actor }) => {
			const state = useSelector(actor, s => s);

			expect(state.value).toEqual("active");

			return <></>;
		};

		const Test = () => {
			const actorRef = useActorRef(machine);
			const childActor = useSelector(
				actorRef,
				s => s.children.child as ActorRefFrom<typeof childMachine>,
			);
			return <ChildTest actor={childActor} />;
		};

		render(<Test />);
	});

	it("should work with selecting values from initially spawned actors", () => {
		const childMachine = createMachine({
			types: {} as { context: { count: number } },
			context: {
				count: 0,
			},
			on: {
				UPDATE_COUNT: {
					actions: assign({
						count: ({ context }) => context.count + 1,
					}),
				},
			},
		});

		const parentMachine = createMachine({
			types: {
				context: {} as {
					childActor: ActorRefFrom<typeof childMachine>;
				},
			},
			context: ({ spawn }) => ({
				childActor: spawn(childMachine),
			}),
		});
		const selector = (state: StateFrom<typeof childMachine>) => state.context.count;

		const App = () => {
			const [state] = useMachine(parentMachine);
			const actor = state.context.childActor;
			const count = useSelector(actor, selector);

			return (
				<frame>
					<textlabel Tag="data-testid=count" Text={`${count}`}></textlabel>

					<textbutton
						Event={{ Activated: () => actor.send({ type: "UPDATE_COUNT" }) }}
						Tag="data-testid=button"
					/>
				</frame>
			);
		};

		render(<App />);

		const buttonEl = screen.getByTestId("button") as TextLabel;
		const countEl = screen.getByTestId("count") as TextLabel;

		expect(countEl.Text).toEqual("0");
		fireEvent.click(buttonEl);
		expect(countEl.Text).toEqual("1");
	});

	it("should immediately render snapshot of initially spawned custom actor", () => {
		const createCustomActor = (latestValue: string) =>
			createActor(fromTransition(s => s, latestValue));

		const parentMachine = createMachine({
			types: {
				context: {} as {
					childActor: ReturnType<typeof createCustomActor>;
				},
			},
			context: () => ({
				childActor: createCustomActor("foo"),
			}),
		});

		const identitySelector = (value: any) => value;

		const App = () => {
			const [state] = useMachine(parentMachine);
			const actor = state.context.childActor;

			const value = useSelector(actor, identitySelector) as { context: string };

			return <textlabel Text={value.context} />;
		};

		const { container } = render(<App />);
		expect((container as TextLabel).Text).toEqual("foo");
	});

	it("should rerender with a new value when the selector changes", () => {
		const childMachine = createMachine({
			types: {} as { context: { count: number } },
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

		const parentMachine = createMachine({
			types: {
				context: {} as {
					childActor: ActorRefFrom<typeof childMachine>;
				},
			},
			context: ({ spawn }) => ({
				childActor: spawn(childMachine),
			}),
		});

		const App = ({ prop }: { prop: string }) => {
			const [state] = useMachine(parentMachine);
			const actor = state.context.childActor;
			const value = useSelector(actor, state => `${prop} ${state.context.count}`);

			return <textlabel Tag="data-testid=value" Text={value}></textlabel>;
		};

		const { container, rerender } = render(<App prop="first" />);

		expect((container as TextLabel).Text).toEqual("first 0");

		rerender(<App prop="second" />);
		expect((container as TextLabel).Text).toEqual("second 0");
	});

	it("should use a fresh selector for subscription updates after selector change", () => {
		const childMachine = createMachine({
			types: {} as { context: { count: number } },
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

		const parentMachine = createMachine({
			types: {
				context: {} as {
					childActor: ActorRefFrom<typeof childMachine>;
				},
			},
			context: ({ spawn }) => ({
				childActor: spawn(childMachine),
			}),
		});

		const App = ({ prop }: { prop: string }) => {
			const [state] = useMachine(parentMachine);
			const actor = state.context.childActor;
			const value = useSelector(actor, state => `${prop} ${state.context.count}`);

			return (
				<frame>
					<textlabel Tag="data-testid=value" Text={value}></textlabel>

					<textbutton
						Tag="data-testid=button"
						Event={{
							Activated: () => {
								actor.send({ type: "INC" });
							},
						}}
					/>
				</frame>
			);
		};

		const { rerender } = render(<App prop="first" />);

		const buttonEl = screen.getByTestId("button");
		const valueEl = screen.getByTestId("value") as TextLabel;

		expect(valueEl.Text).toEqual("first 0");

		rerender(<App prop="second" />);
		fireEvent.click(buttonEl);

		expect(valueEl.Text).toEqual("second 1");
	});

	it("should render snapshot value when actor doesn't emit anything", () => {
		const createCustomLogic = (latestValue: string) => fromTransition(s => s, latestValue);

		const parentMachine = createMachine({
			types: {
				context: {} as {
					childActor: ActorRefFrom<typeof createCustomLogic>;
				},
			},
			context: ({ spawn }) => ({
				childActor: spawn(createCustomLogic("foo")),
			}),
		});

		const identitySelector = (value: any) => value;

		const App = () => {
			const [state] = useMachine(parentMachine);
			const actor = state.context.childActor;

			const value = useSelector(actor, identitySelector) as { context: string };

			return <textlabel Text={value.context} />;
		};

		const { container } = render(<App />);
		expect((container as TextLabel).Text).toEqual("foo");
	});

	it("should render snapshot state when actor changes", () => {
		const createCustomActor = (latestValue: string) =>
			createActor(fromTransition(s => s, latestValue));

		const actor1 = createCustomActor("foo");
		const actor2 = createCustomActor("bar");

		const identitySelector = (value: any) => value;

		const App = ({ prop }: { prop: string }) => {
			const value = useSelector(prop === "first" ? actor1 : actor2, identitySelector) as {
				context: string;
			};

			return <textlabel Text={value.context} />;
		};

		const { container, rerender } = render(<App prop="first" />);
		expect((container as TextLabel).Text).toEqual("foo");

		rerender(<App prop="second" />);
		expect((container as TextLabel).Text).toEqual("bar");
	});

	it("should keep rendering a new selected value after selector change when the actor doesn't emit", async () => {
		const actor = createActor(fromTransition(s => s, undefined));
		actor.subscribe = () => ({ unsubscribe() {} });

		const App = ({ selector }: { selector: any }) => {
			const [, forceRerender] = React.useState(0);
			const value = useSelector(actor, selector);

			return (
				<textlabel Text={`${value as number}`}>
					<textbutton
						Tag="data-testid=button"
						Event={{ Activated: () => forceRerender(s => s + 1) }}
					></textbutton>
				</textlabel>
			);
		};

		const { container, rerender } = render(<App selector={() => "foo"} />);
		expect((container as TextLabel).Text).toEqual("foo");

		rerender(<App selector={() => "bar"} />);
		expect((container as TextLabel).Text).toEqual("bar");

		fireEvent.click(await screen.findByTestId("button"));
		expect((container as TextLabel).Text).toEqual("bar");
	});

	it("should only rerender once when the selected value changes", () => {
		const selector = (state: { context: AnyObject }) => state.context.foo;

		const machine = createMachine({
			types: {} as { context: { foo: number }; events: { type: "INC" } },
			context: {
				foo: 0,
			},
			on: {
				INC: {
					actions: assign({
						foo: ({ context }) => ++context.foo,
					}),
				},
			},
		});

		const service = createActor(machine).start();

		let renders = 0;

		const App = () => {
			++renders;
			useSelector(service, selector);

			return <></>;
		};

		render(<App />);

		// reset
		renders = 0;
		act(() => {
			service.send({ type: "INC" });
		});

		expect(renders).toBe(suiteKey === "strict" ? 2 : 1);
	});

	it("should compute a stable snapshot internally when selecting from uninitialized service", () => {
		const child = createMachine({});
		const machine = createMachine({
			invoke: {
				id: "child",
				src: child,
			},
		});

		const snapshots: AnyMachineSnapshot[] = [];

		function App() {
			const service = useActorRef(machine);
			useSelector(service, state => {
				snapshots.push(state);
				return state.children.child;
			});
			return <></>;
		}

		// console.error = jest.fn();
		render(<App />);

		const [snapshot1] = snapshots;
		expect(snapshots.every(s => s === snapshot1));
		// expect(console.error).toHaveBeenCalledTimes(0);
	});

	it(`shouldn't interfere with spawning actors that are part of the initial state of an actor`, () => {
		let called = false;
		const child = createMachine({
			entry: () => (called = true),
		});
		const machine = createMachine({
			context: ({ spawn }) => ({
				childRef: spawn(child),
			}),
		});

		function App() {
			const service = useActorRef(machine);
			useSelector(service, () => {});
			expect(called).toBe(false);
			return <></>;
		}

		render(<App />);

		expect(called).toBe(true);
	});

	it("should work with initially deferred actors spawned in lazy context", () => {
		const childMachine = setup({}).createMachine({
			initial: "one",
			states: {
				one: {
					on: { NEXT: "two" },
				},
				two: {},
			},
		});

		const machine = setup({
			types: {} as {
				context: { ref: ActorRefFrom<typeof childMachine> };
			},
		}).createMachine({
			context: ({ spawn }) => ({
				ref: spawn(childMachine),
			}),
			initial: "waiting",
			states: {
				waiting: {
					on: { TEST: "success" },
				},
				success: {
					type: "final",
				},
			},
		});

		const App = () => {
			const actorRef = useActorRef(machine);
			const childRef = useSelector(actorRef, s => s.context.ref);
			const childState = useSelector(childRef, s => s);

			return (
				<frame>
					<textlabel Tag="data-testid=child-state" Text={childState.value}></textlabel>
					<textbutton
						Tag="data-testid=child-send"
						Event={{ Activated: () => childRef.send({ type: "NEXT" }) }}
					></textbutton>
				</frame>
			);
		};

		render(<App />);

		const elState = screen.getByTestId("child-state") as TextLabel;
		const elSend = screen.getByTestId("child-send") as TextLabel;

		expect(elState.Text).toEqual("one");
		fireEvent.click(elSend);

		expect(elState.Text).toEqual("two");
	});

	it("should not log any spurious errors when used with a not-started actor", () => {
		// const spy = jest.fn();
		// console.error = spy;

		const machine = createMachine({});
		const App = () => {
			useSelector(useActorRef(machine), s => s);

			return <></>;
		};

		render(<App />);

		// expect(spy).never.toHaveBeenCalled();
	});

	it("should work with an optional actor", () => {
		const Child = (props: {
			actor: ActorRef<TransitionSnapshot<{ count: number }>, any> | undefined;
		}) => {
			const state = useSelector(props.actor, s => s);

			((_accept: { count: number }) => {})(state?.context!);
			((_accept: { count: number } | undefined) => {})(state?.context);

			return (
				<textlabel Tag="data-testid=state" Text={`${state?.context?.count}`}></textlabel>
			);
		};

		const App = () => {
			const [actor, setActor] =
				React.useState<ActorRef<TransitionSnapshot<{ count: number }>, any>>();

			return (
				<frame>
					<textbutton
						Tag="data-testid=button"
						Event={{
							Activated: () =>
								setActor(createActor(fromTransition(s => s, { count: 42 }))),
						}}
						Text="Set actor"
					></textbutton>
					<Child actor={actor} />
				</frame>
			);
		};

		render(<App />);

		const button = screen.getByTestId("button") as TextLabel;
		const stateEl = screen.getByTestId("state") as TextLabel;

		expect(stateEl.Text).toBe("nil");

		fireEvent.click(button);

		expect(stateEl.Text).toBe("42");
	});
});
