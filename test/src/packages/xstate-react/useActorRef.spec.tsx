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
import { fireEvent, screen, waitFor as testWaitFor } from "@rbxts/react-testing-library";
import * as React from "react";
import {
	ActorRefFrom,
	AnyStateMachine,
	assign,
	createMachine,
	fromPromise,
	fromTransition,
	sendParent,
	sendTo,
} from "@rbxts/xstate";
import { useActorRef, useMachine, useSelector } from "@rbxts/xstate-react";
import { describeEachReactMode } from "./utils";
import { Object, setTimeout } from "@rbxts/luau-polyfill";

describeEachReactMode("useActorRef (%s)", ({ suiteKey, render }) => {
	it("observer should be called with next state", (_, done) => {
		const machine = createMachine({
			initial: "inactive",
			states: {
				inactive: {
					on: {
						ACTIVATE: "active",
					},
				},
				active: {},
			},
		});

		const App = () => {
			const actorRef = useActorRef(machine);

			React.useEffect(() => {
				actorRef.subscribe(state => {
					if (state.matches("active")) {
						done();
					}
				});
			}, [actorRef]);

			return (
				<textbutton
					Tag="data-testid=button"
					Event={{
						Activated: () => {
							actorRef.send({ type: "ACTIVATE" });
						},
					}}
				></textbutton>
			);
		};

		render(<App />);
		const button = screen.getByTestId("button") as TextLabel;

		fireEvent.click(button);
	});

	it("actions created by a layout effect should access the latest closure values", () => {
		const actual: number[] = [];

		const machine = createMachine({
			initial: "foo",
			states: {
				foo: {
					on: {
						EXEC_ACTION: {
							actions: "recordProp",
						},
					},
				},
			},
		});

		const App = ({ value }: { value: number }) => {
			const service = useActorRef(
				machine.provide({
					actions: {
						recordProp: () => actual.push(value),
					},
				}),
			);

			React.useLayoutEffect(() => {
				service.send({ type: "EXEC_ACTION" });
			});

			return <></>;
		};

		const { rerender } = render(<App value={1} />);

		expect(actual).toEqual(suiteKey === "strict" ? [1, 1] : [1]);

		actual.clear();
		rerender(<App value={42} />);

		expect(actual).toEqual([42]);
	});

	it("should rerender OK when only the provided machine implementations have changed", () => {
		const machine = createMachine({
			initial: "foo",
			context: { id: 1 },
			states: {
				foo: {
					on: {
						CHECK: {
							target: "bar",
							guard: "hasOverflown",
						},
					},
				},
				bar: {},
			},
		});

		const App = () => {
			const [id, setId] = React.useState(1);
			useMachine(
				machine.provide({
					guards: {
						hasOverflown: () => id > 1,
					},
				}),
			);

			return (
				<frame>
					<textbutton
						Tag="data-testid=button"
						Event={{
							Activated: () => {
								setId(2);
							},
						}}
						Text="update id"
					></textbutton>
					<textlabel Text={`${id}`}></textlabel>
				</frame>
			);
		};

		render(<App />);

		fireEvent.click(screen.getByTestId("button"));

		expect(screen.getByText("2")).toBeTruthy();
	});

	it("should change state when started", async () => {
		const childMachine = createMachine({
			initial: "waiting",
			states: {
				waiting: {
					on: {
						EVENT: "received",
					},
				},
				received: {},
			},
		});

		const parentMachine = createMachine({
			types: {} as { context: { childRef: ActorRefFrom<typeof childMachine> } },
			context: ({ spawn }) => ({
				childRef: spawn(childMachine),
			}),
			on: {
				SEND_TO_CHILD: {
					actions: sendTo(({ context }) => context.childRef, { type: "EVENT" }),
				},
			},
		});

		const App = () => {
			const parentActor = useActorRef(parentMachine);
			const parentState = useSelector(parentActor, s => s);
			const childState = useSelector(parentState.context.childRef, s => s);

			return (
				<frame>
					<textbutton
						Tag="data-testid=button"
						Event={{ Activated: () => parentActor.send({ type: "SEND_TO_CHILD" }) }}
						Text="Send to child"
					></textbutton>
					<textlabel
						Tag="data-testid=child-state"
						Text={childState.value as string}
					></textlabel>
				</frame>
			);
		};

		render(<App />);

		const button = screen.getByTestId("button") as TextLabel;
		const childState = screen.getByTestId("child-state") as TextLabel;

		expect(childState.Text).toBe("waiting");

		fireEvent.click(button);

		expect(childState.Text).toBe("received");
	});

	it("should change state when started (useMachine)", async () => {
		const childMachine = createMachine({
			initial: "waiting",
			states: {
				waiting: {
					on: {
						EVENT: "received",
					},
				},
				received: {},
			},
		});

		const parentMachine = createMachine({
			types: {} as {
				context: {
					childRef: ActorRefFrom<typeof childMachine>;
				};
			},
			context: ({ spawn }) => ({
				childRef: spawn(childMachine),
			}),
			on: {
				SEND_TO_CHILD: {
					actions: sendTo(({ context }) => context.childRef, { type: "EVENT" }),
				},
			},
		});

		const App = () => {
			const [parentState, parentSend] = useMachine(parentMachine);
			const childState = useSelector(parentState.context.childRef, s => s);

			return (
				<frame>
					<textbutton
						Tag="data-testid=button"
						Event={{ Activated: () => parentSend({ type: "SEND_TO_CHILD" }) }}
						Text="Send to child"
					></textbutton>
					<textlabel
						Tag="data-testid=child-state"
						Text={childState.value as string}
					></textlabel>
				</frame>
			);
		};

		render(<App />);

		const button = screen.getByTestId("button") as TextLabel;
		const childState = screen.getByTestId("child-state") as TextLabel;

		expect(childState.Text).toBe("waiting");

		fireEvent.click(button);

		expect(childState.Text).toBe("received");
	});

	it("should deliver messages sent from an effect to the root actor registered in the system", () => {
		const spy = jest.fn();
		const m = createMachine({
			on: {
				PING: {
					actions: spy,
				},
			},
		});

		const App = () => {
			const actor = useActorRef(m, { systemId: "test" });

			React.useEffect(() => {
				actor.system?.get("test")!.send({ type: "PING" });
			});

			return <></>;
		};

		render(<App />);

		expect(spy).toHaveBeenCalledTimes(suiteKey === "strict" ? 2 : 1);
	});

	it("should work with a transition actor", () => {
		const someLogic = fromTransition((state, event) => {
			if (event.type == "inc") {
				return state + 1;
			}
			return state;
		}, 0);

		const App = () => {
			const actorRef = useActorRef(someLogic);
			const count = useSelector(actorRef, state => state);

			return (
				<textbutton
					Tag="data-testid=count"
					Event={{ Activated: () => actorRef.send({ type: "inc" }) }}
					Text={`${count.context}`}
				></textbutton>
			);
		};

		render(<App />);

		const count = screen.getByTestId("count") as TextLabel;

		expect(count.Text).toBe("0");

		fireEvent.click(count);

		expect(count.Text).toBe("1");
	});

	it("should work with a promise actor", async () => {
		const promiseLogic = fromPromise(
			() => new Promise<number>(resolve => setTimeout(() => resolve(42), 10)),
		);

		const App = () => {
			const actorRef = useActorRef(promiseLogic);
			const count = useSelector(actorRef, state => state);

			return <textlabel Tag="data-testid=count" Text={`${count.output}`}></textlabel>;
		};

		render(<App />);

		const count = screen.getByTestId("count") as TextLabel;

		expect(count.Text).toBe("");

		await testWaitFor(() => expect(count.Text).toBe("42"));
	});

	it("invoked actor should be able to receive (deferred) events that it replays when active", () => {
		let isDone = false;

		const childMachine = createMachine({
			id: "childMachine",
			initial: "active",
			states: {
				active: {
					on: {
						FINISH: { actions: sendParent({ type: "FINISH" }) },
					},
				},
			},
		});
		const machine = createMachine({
			initial: "active",
			invoke: {
				id: "child",
				src: childMachine,
			},
			states: {
				active: {
					on: { FINISH: "success" },
				},
				success: {},
			},
		});

		const ChildTest: React.FC<{
			actor: ActorRefFrom<typeof childMachine>;
		}> = ({ actor }) => {
			const state = useSelector(actor, s => s);

			expect(state.value).toEqual("active");

			React.useLayoutEffect(() => {
				if (actor.getSnapshot().status === "active") {
					actor.send({ type: "FINISH" });
				}
			}, []);

			return <></>;
		};

		const Test = () => {
			const actorRef = useActorRef(machine);
			const childActor = useSelector(
				actorRef,
				s => s.children.child as ActorRefFrom<typeof childMachine>,
			);

			isDone = useSelector(actorRef, s => s.matches("success"));

			return <ChildTest actor={childActor} />;
		};

		render(<Test />);

		expect(isDone).toBe(true);
	});

	it("spawned actor should be able to receive (deferred) events that it replays when active", () => {
		let isDone = false;

		const childMachine = createMachine({
			id: "childMachine",
			initial: "active",
			states: {
				active: {
					on: {
						FINISH: { actions: sendParent({ type: "FINISH" }) },
					},
				},
			},
		});
		const machine = createMachine({
			initial: "active",
			states: {
				active: {
					entry: assign({
						actorRef: ({ spawn }) => spawn(childMachine, { id: "child" }),
					}),
					on: { FINISH: "success" },
				},
				success: {},
			},
		});

		const ChildTest: React.FC<{
			actor: ActorRefFrom<typeof childMachine>;
		}> = ({ actor }) => {
			const state = useSelector(actor, s => s);

			expect(state.value).toEqual("active");

			React.useLayoutEffect(() => {
				if (actor.getSnapshot().status === "active") {
					actor.send({ type: "FINISH" });
				}
			}, []);

			return <></>;
		};

		const Test = () => {
			const actorRef = useActorRef(machine);
			const childActor = useSelector(
				actorRef,
				s => s.children.child as ActorRefFrom<typeof childMachine>,
			);

			isDone = useSelector(actorRef, s => s.matches("success"));

			return <ChildTest actor={childActor} />;
		};

		render(<Test />);

		expect(isDone).toBe(true);
	});

	it("should be able to rerender with a new machine", () => {
		const machine1 = createMachine({
			initial: "a",
			states: { a: {} },
		});

		const machine2 = createMachine({
			initial: "a",
			states: {
				a: {
					on: { NEXT: "b" },
				},
				b: {},
			},
		});

		function Test() {
			const [machine, setMachine] = React.useState(machine1);
			const actorRef = useActorRef(machine);
			const value = useSelector(actorRef, state => state.value);

			return (
				<frame>
					<textbutton
						Event={{
							Activated: () => {
								setMachine(machine2);
							},
						}}
						Text="Reload machine"
					></textbutton>
					<textbutton
						Event={{
							Activated: () => {
								actorRef.send({
									type: "NEXT",
								});
							},
						}}
						Text="Send event"
					></textbutton>
					<textlabel Text={value as string}></textlabel>
				</frame>
			);
		}

		render(<Test />);

		fireEvent.click(screen.getByText("Reload machine"));
		fireEvent.click(screen.getByText("Send event"));

		expect(screen.getByText("b")).toBeTruthy();
	});

	it("should be able to rehydrate an incoming new machine using the persisted state of the previous one", () => {
		const machine1 = createMachine({
			initial: "a",
			states: {
				a: {
					on: { NEXT: "b" },
				},
				b: {},
			},
		});

		const machine2 = createMachine({
			initial: "b",
			states: {
				b: {
					on: { NEXT: "c" },
				},
				c: {},
			},
		});

		function Test() {
			const [machine, setMachine] = React.useState(machine1);
			const actorRef = useActorRef(machine);
			const value = useSelector(actorRef, state => state.value);

			return (
				<frame>
					<textbutton
						Event={{
							Activated: () => {
								setMachine(machine2);
							},
						}}
						Text="Reload machine"
					></textbutton>
					<textbutton
						Event={{
							Activated: () => {
								actorRef.send({
									type: "NEXT",
								});
							},
						}}
						Text="Send event"
					></textbutton>
					<textlabel Text={value as string}></textlabel>
				</frame>
			);
		}

		render(<Test />);

		fireEvent.click(screen.getByText("Send event"));
		fireEvent.click(screen.getByText("Reload machine"));
		fireEvent.click(screen.getByText("Send event"));

		expect(screen.getByText("c")).toBeTruthy();
	});

	it("should not create extra rerenders when recreating the actor on the machine change", () => {
		let rerenders = 0;

		const machine1 = createMachine({});

		const machine2 = createMachine({});

		function Test() {
			const [machine, setMachine] = React.useState(machine1);
			useActorRef(machine);

			rerenders++;

			return (
				<frame>
					<textbutton
						Event={{
							Activated: () => {
								setMachine(machine2);
							},
						}}
						Text="Reload machine"
					></textbutton>
				</frame>
			);
		}

		render(<Test />);

		fireEvent.click(screen.getByText("Reload machine"));

		// while those numbers might be a little bit surprising at first glance they are actually correct
		// we are using the "derive state from props pattern" here and that involves 2 renders
		// so we have a first render and then two other renders when the machine changes
		// in strict mode only regular renders are doubled but the render scheduled by a state change in render is not
		expect(rerenders).toBe(suiteKey === "strict" ? 5 : 3);
	});

	it("all renders should be consistent - a value derived in render should be derived from the latest source", () => {
		let detectedInconsistency = false;

		const machine1 = createMachine({
			tags: ["m1"],
		});

		const machine2 = createMachine({
			tags: ["m2"],
		});

		function Test() {
			const [machine, setMachine] = React.useState(machine1);
			const actorRef = useActorRef(machine);
			const tag = useSelector(actorRef, state => [...state.tags][0]);

			detectedInconsistency ||= machine.config.tags[0] !== tag;

			return (
				<frame>
					<textbutton
						Event={{
							Activated: () => {
								setMachine(machine2);
							},
						}}
						Text="Reload machine"
					></textbutton>
				</frame>
			);
		}

		render(<Test />);

		fireEvent.click(screen.getByText("Reload machine"));

		expect(detectedInconsistency).toBe(false);
	});

	it("all commits should be consistent - a value derived in render should be derived from the latest source", () => {
		let detectedInconsistency = false;

		const machine1 = createMachine({
			tags: ["m1"],
		});

		const machine2 = createMachine({
			tags: ["m2"],
		});

		function Test() {
			React.useEffect(() => {
				detectedInconsistency ||= machine.config.tags[0] !== tag;
			});

			const [machine, setMachine] = React.useState(machine1);
			const actorRef = useActorRef(machine);
			const tag = useSelector(actorRef, state => [...state.tags][0]);

			return (
				<frame>
					<textbutton
						Event={{
							Activated: () => {
								setMachine(machine2);
							},
						}}
						Text="Reload machine"
					></textbutton>
				</frame>
			);
		}

		render(<Test />);

		fireEvent.click(screen.getByText("Reload machine"));

		expect(detectedInconsistency).toBe(false);
	});

	it("should be able to rehydrate an inline actor when changing machines", () => {
		const spy = jest.fn();

		const createSampleMachine = (counter: number) => {
			const child = createMachine({
				on: {
					EV: {
						actions: () => {
							spy(counter);
						},
					},
				},
			});

			return createMachine({
				context: ({ spawn }) => {
					return {
						childRef: spawn(child),
					};
				},
			});
		};

		const machine1 = createSampleMachine(1);
		const machine2 = createSampleMachine(2);

		function Test() {
			const [machine, setMachine] = React.useState<AnyStateMachine>(machine1);
			const actorRef = useActorRef(machine);

			return (
				<frame>
					<textbutton
						Event={{
							Activated: () => {
								setMachine(machine2);
							},
						}}
						Text="Reload machine"
					></textbutton>
					<textbutton
						Event={{
							Activated: () => {
								const child: any = Object.values(
									actorRef.getSnapshot().children,
								)[0];
								child.send({
									type: "EV",
								});
							},
						}}
						Text="Send event"
					></textbutton>
				</frame>
			);
		}

		render(<Test />);

		fireEvent.click(screen.getByText("Reload machine"));
		fireEvent.click(screen.getByText("Send event"));

		expect(spy.mock.calls).toHaveLength(1);
		// we don't have any means to rehydrate an inline actor with a new src (can't locate its new src)
		// so the best we can do is to reuse the old src
		expect(spy.mock.calls[0][0]).toBe(1);
	});

	it("should execute action bound to a specific machine's instance when the action is provided in render", () => {
		const spy1 = jest.fn();
		const spy2 = jest.fn();

		const machine = createMachine({
			on: {
				DO: {
					actions: "stuff",
				},
			},
		});

		const Test = () => {
			const actorRef1 = useActorRef(
				machine.provide({
					actions: {
						stuff: spy1,
					},
				}),
			);
			useActorRef(
				machine.provide({
					actions: {
						stuff: spy2,
					},
				}),
			);

			return (
				<textbutton
					Tag="data-testid=button"
					Event={{
						Activated: () => {
							actorRef1.send({
								type: "DO",
							});
						},
					}}
					Text="Click"
				></textbutton>
			);
		};

		render(<Test />);

		fireEvent.click(screen.getByTestId("button"));

		expect(spy1).toHaveBeenCalledTimes(1);
		expect(spy2).never.toHaveBeenCalled();
	});

	it("should execute an initial entry action once", () => {
		const spy = jest.fn();

		const machine = createMachine({
			entry: spy,
		});

		const Test = () => {
			useActorRef(machine);
			return <></>;
		};

		render(<Test />);

		expect(spy).toHaveBeenCalledTimes(1);
	});
});
