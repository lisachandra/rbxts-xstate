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
import { render } from "@rbxts/react-testing-library";
import { ActorRefFrom, assign, createMachine, setup } from "@rbxts/xstate";
import { useActor, useActorRef, useMachine, useSelector } from "@rbxts/xstate-react";
import * as React from "@rbxts/react";

describe("useMachine", () => {
	interface YesNoContext {
		value?: number;
	}

	interface YesNoEvent {
		type: "YES";
	}

	const yesNoMachine = createMachine({
		types: {} as { context: YesNoContext; events: YesNoEvent },
		context: {
			value: undefined,
		},
		initial: "no",
		states: {
			no: {
				on: {
					YES: "yes",
				},
			},
			yes: {
				type: "final",
			},
		},
	});

	it("state should not become never after checking state with matches", () => {
		const YesNo = () => {
			const [state] = useMachine(yesNoMachine);

			if (state.matches("no")) {
				return <textlabel Text="No"></textlabel>;
			}

			return <textlabel Text={`Yes: ${state.context.value}`}></textlabel>;
		};

		render(<YesNo />);
	});

	// Example from: https://github.com/statelyai/xstate/discussions/1534
	it("spawned actors should be typed correctly", () => {
		const child = createMachine({
			types: {} as {
				context: { bar: number };
				events: { type: "FOO"; data: number };
			},
			id: "myActor",
			context: {
				bar: 1,
			},
			initial: "ready",
			states: {
				ready: {},
			},
		});

		const m = createMachine(
			{
				initial: "ready",
				context: {
					actor: undefined,
				} as { actor: ActorRefFrom<typeof child> | undefined },
				states: {
					ready: {
						entry: "spawnActor",
					},
				},
			},
			{
				actions: {
					spawnActor: assign({
						actor: ({ spawn }) => spawn(child),
					}),
				},
			},
		);

		interface Props {
			myActor: ActorRefFrom<typeof child>;
		}

		function Element({ myActor }: Props) {
			const current = useSelector(myActor, state => state);
			const bar: number = current.context.bar;

			// @ts-expect-error
			myActor.send({ type: "WHATEVER" });

			return (
				<frame>
					<textlabel Text={`${bar}`}></textlabel>
					<textbutton
						Event={{ Activated: () => myActor.send({ type: "FOO", data: 1 }) }}
						Text="click"
					></textbutton>
				</frame>
			);
		}

		function App() {
			const [current] = useMachine(m);

			if (!current.context.actor) {
				return <></>;
			}

			return <Element myActor={current.context.actor} />;
		}

		const noop = (_val: any) => {
			/* ... */
		};

		noop(App);
	});
});

describe("useActor", () => {
	it("should require input to be specified when defined", () => {
		const withInputMachine = createMachine({
			types: {} as { input: { value: number } },
			initial: "idle",
			states: {
				idle: {},
			},
		});

		const Component = () => {
			const _ = useActor(withInputMachine, undefined as never);
			return <></>;
		};

		render(<Component />);
	});

	it("should not require input when not defined", () => {
		const noInputMachine = createMachine({
			types: {} as {},
			initial: "idle",
			states: {
				idle: {},
			},
		});
		const Component = () => {
			const _ = useActor(noInputMachine);
			return <></>;
		};

		render(<Component />);
	});
});

describe("useActorRef", () => {
	it("should require input to be specified when defined", () => {
		const withInputMachine = createMachine({
			types: {} as { input: { value: number } },
			initial: "idle",
			states: {
				idle: {},
			},
		});

		const Component = () => {
			const _ = useActorRef(withInputMachine, undefined as never);
			return <></>;
		};

		render(<Component />);
	});

	it("should not require input when not defined", () => {
		const noInputMachine = createMachine({
			types: {} as {},
			initial: "idle",
			states: {
				idle: {},
			},
		});

		const Component = () => {
			const _ = useActorRef(noInputMachine);
			return <></>;
		};

		render(<Component />);
	});
});

it("useMachine types work for machines with a specified id and state with an after property #5008", () => {
	// https://github.com/statelyai/xstate/issues/5008
	const cheatCodeMachine = setup({}).createMachine({
		id: "cheatCodeMachine",
		initial: "disabled",
		states: {
			disabled: {
				after: {},
			},
			enabled: {},
		},
	});

	function _useCheatCode(): boolean {
		// This should typecheck without errors
		const [state] = useMachine(cheatCodeMachine);

		return state.matches("enabled");
	}
});
