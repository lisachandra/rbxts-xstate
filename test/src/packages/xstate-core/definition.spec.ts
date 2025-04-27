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
import { AnyActorLogic, createMachine } from "@rbxts/xstate";

describe("definition", () => {
	it("should provide invoke definitions", () => {
		const invokeMachine = createMachine({
			types: {} as {
				actors:
					| {
							src: "foo";
							logic: AnyActorLogic;
					  }
					| {
							src: "bar";
							logic: AnyActorLogic;
					  };
			},
			id: "invoke",
			invoke: [{ src: "foo" }, { src: "bar" }],
			initial: "idle",
			states: {
				idle: {},
			},
		});

		expect(invokeMachine.root.getDefinition().invoke.size()).toBe(2);
	});
});
