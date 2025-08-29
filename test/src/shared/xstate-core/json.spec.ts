import { describe, beforeEach, it, expect, afterAll, beforeAll } from "@rbxts/jest-globals";
import { Array, Object } from "@rbxts/luau-polyfill";
import { HttpService } from "@rbxts/services";
import { createMachine, assign } from "@rbxts/xstate";
import { JSON } from "@rbxts/xstate/out/utils/polyfill/json";
import { omit } from "@rbxts/xstate/out/utils/misc/omit";
// import * as machineSchema from "@rbxts/xstate/out/machine.schema.json";

// import Ajv from "ajv";

// const ajv = new Ajv();
// const validate = ajv.compile(machineSchema);

describe("json", () => {
	it("should serialize the machine", () => {
		interface Context {
			[key: string]: any;
		}

		const machine = createMachine({
			types: {} as { context: Context },
			initial: "foo",
			version: "1.0.0",
			context: {
				number: 0,
				string: "hello",
			},
			invoke: [{ id: "invokeId", src: "invokeSrc" }],
			states: {
				testActions: {
					invoke: [{ id: "invokeId", src: "invokeSrc" }],
					entry: [
						"stringActionType",
						{
							type: "objectActionType",
						},
						{
							type: "objectActionTypeWithExec",
							exec: () => {
								return true;
							},
							other: "any",
						},
						() => {
							return true;
						},
						// TODO: investigate why this had to be casted to any to satisfy TS
						assign({
							number: 10,
							string: "test",
							evalNumber: () => 42,
						}) as any,
						assign(ctx => ({
							...ctx,
						})),
					],
					on: {
						TO_FOO: {
							target: ["foo", "bar"],
							guard: ({ context }) => !!(context.string as unknown),
						},
					},
					after: {
						1000: "bar",
					},
				},
				foo: {},
				bar: {},
				testHistory: {
					type: "history",
					history: "deep",
				},
				testFinal: {
					type: "final",
					output: {
						something: "else",
					},
				},
				testParallel: {
					type: "parallel",
					states: {
						one: {
							initial: "inactive",
							states: {
								inactive: {},
							},
						},
						two: {
							initial: "inactive",
							states: {
								inactive: {},
							},
						},
					},
				},
			},
			output: { result: 42 },
		});

		const json = JSON.parse(JSON.stringify(machine.getDefinition()));
		expect(json).toMatchSnapshot();

		/*
		try {
			validate(json);
		} catch (err: any) {
			throw new Error(JSON.stringify(JSON.parse(err.message), undefined, 2));
		}

		expect(validate.errors).toBeUndefined();
		*/
	});

	it("should detect an invalid machine", () => {
		const invalidMachineConfig = {
			id: "something",
			key: "something",
			type: "invalid type",
			states: {},
		};

		// validate(invalidMachineConfig);
		// expect(validate.errors).never.toBeUndefined();
	});

	it("should not double-serialize invoke transitions", () => {
		const machine = createMachine({
			initial: "active",
			states: {
				active: {
					id: "active",
					invoke: {
						src: "someSrc",
						onDone: "foo",
						onError: "bar",
					},
					on: {
						EVENT: "foo",
					},
				},
				foo: {},
				bar: {},
			},
		});

		const machineJSON = JSON.stringify(machine);

		const machineObject = JSON.parse(machineJSON);

		const revivedMachine = createMachine(machineObject as never);
		const expectedTransitions = [
			{
				actions: [],
				eventType: "EVENT",
				guard: undefined,
				reenter: false,
				source: "#active",
				target: ["#(machine).foo"],
			},
			{
				actions: [],
				eventType: "xstate.error.actor.0.active",
				guard: undefined,
				reenter: false,
				source: "#active",
				target: ["#(machine).bar"],
			},
			{
				actions: [],
				eventType: "xstate.done.actor.0.active",
				guard: undefined,
				reenter: false,
				source: "#active",
				target: ["#(machine).foo"],
			},
		];

		const actualTransitions = Array.flat([
			...Object.values(revivedMachine.states.active!.transitions),
		]);

		actualTransitions.forEach((transition, index) => {
			const expectedTransition = expectedTransitions[index];
			expect(omit(transition.toJSON(), ["toJSON" as never])).toEqual(expectedTransition);
		});

		// 1. onDone
		// 2. onError
		// 3. EVENT
		expect(
			Array.flatMap(
				[...Object.values(revivedMachine.getStateNodeById("active").transitions)],
				t => t,
			).size(),
		).toBe(3);
	});
});
