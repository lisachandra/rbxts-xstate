import isDevelopment from "./utils/polyfill/isDevelopment";
import type {
	EventObject,
	StateValue,
	MachineContext,
	ParameterizedObject,
	AnyMachineSnapshot,
	NoRequiredParams,
	WithDynamicParams,
	Identity,
	Elements,
	DoNotInfer,
} from "./types";
import { isStateId } from "utils/state/isStateId";
import { Error } from "@rbxts/luau-polyfill";
import { callable } from "utils/polyfill/callable";
import { isInlineFn } from "utils/polyfill/isInlineFn";

type SingleGuardArg<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TGuardArg,
> = [TGuardArg] extends [{ type: string }]
	? Identity<TGuardArg>
	: [TGuardArg] extends [string]
		? TGuardArg
		: GuardPredicate<TContext, TExpressionEvent, TParams, ParameterizedObject>;

type NormalizeGuardArg<TGuardArg> = TGuardArg extends { type: string }
	? Identity<TGuardArg> & { params: unknown }
	: TGuardArg extends string
		? { type: TGuardArg; params: undefined }
		: "_out_TGuard" extends keyof TGuardArg
			? TGuardArg["_out_TGuard"] & ParameterizedObject
			: never;

type NormalizeGuardArgArray<TArg extends unknown[]> = Elements<{
	[K in keyof TArg]: NormalizeGuardArg<TArg[K]>;
}>;

export type GuardPredicate<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TGuard extends ParameterizedObject,
> = {
	(args: GuardArgs<TContext, TExpressionEvent>, params: TParams): boolean;
	_out_TGuard?: TGuard;
};

export interface GuardArgs<TContext extends MachineContext, TExpressionEvent extends EventObject> {
	context: TContext;
	event: TExpressionEvent;
}

export type Guard<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TGuard extends ParameterizedObject,
> =
	| NoRequiredParams<TGuard>
	| WithDynamicParams<TContext, TExpressionEvent, TGuard>
	| GuardPredicate<TContext, TExpressionEvent, TParams, TGuard>;

export type UnknownGuard = UnknownReferencedGuard | UnknownInlineGuard;

type UnknownReferencedGuard = Guard<
	MachineContext,
	EventObject,
	ParameterizedObject["params"],
	ParameterizedObject
>;

type UnknownInlineGuard = Guard<MachineContext, EventObject, undefined, ParameterizedObject>;

interface BuiltInGuard {
	(): boolean;
	check: (
		snapshot: AnyMachineSnapshot,
		guardArgs: GuardArgs<any, any>,
		params: unknown,
	) => boolean;
}

function checkStateIn(
	snapshot: AnyMachineSnapshot,
	_: GuardArgs<any, any>,
	{ stateValue }: { stateValue: StateValue },
) {
	if (typeIs(stateValue, "string") && isStateId(stateValue)) {
		const target = snapshot.machine.getStateNodeById(stateValue);
		return snapshot._nodes.some(sn => sn === target);
	}

	return snapshot.matches(stateValue);
}

export function stateIn<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
>(
	stateValue: StateValue,
): GuardPredicate<
	TContext,
	TExpressionEvent,
	TParams,
	any // TODO: recheck if we could replace this with something better here
> {
	function stateIn() {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
		return false;
	}

	// @ts-expect-error -- lua polyfill
	stateIn = callable(stateIn);
	stateIn.check = checkStateIn;
	stateIn.stateValue = stateValue;

	return stateIn;
}

function checkNot(
	snapshot: AnyMachineSnapshot,
	{ context, event }: GuardArgs<any, any>,
	{ guards }: { guards: readonly UnknownGuard[] },
) {
	return !evaluateGuard(guards[0], context, event, snapshot);
}

/**
 * Higher-order guard that evaluates to `true` if the `guard` passed to it
 * evaluates to `false`.
 *
 * @category Guards
 * @example
 *
 * ```ts
 * import { setup, not } from "@rbxts/xstate";
 *
 * const machine = setup({
 * 	guards: {
 * 		someNamedGuard: () => false,
 * 	},
 * }).createMachine({
 * 	on: {
 * 		someEvent: {
 * 			guard: not("someNamedGuard"),
 * 			actions: () => {
 * 				// will be executed if guard in `not(...)`
 * 				// evaluates to `false`
 * 			},
 * 		},
 * 	},
 * });
 * ```
 *
 * @returns A guard
 */
export function notG<TContext extends MachineContext, TExpressionEvent extends EventObject, TArg>(
	guard: SingleGuardArg<TContext, TExpressionEvent, unknown, TArg>,
): GuardPredicate<TContext, TExpressionEvent, unknown, NormalizeGuardArg<DoNotInfer<TArg>>> {
	function notG(_args: GuardArgs<TContext, TExpressionEvent>, _params: unknown) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
		return false;
	}

	// @ts-expect-error -- lua polyfill
	notG = callable(notG);
	notG.check = checkNot;
	notG.guards = [guard];

	return notG;
}

function checkAnd(
	snapshot: AnyMachineSnapshot,
	{ context, event }: GuardArgs<any, any>,
	{ guards }: { guards: readonly UnknownGuard[] },
) {
	return guards.every(guard => evaluateGuard(guard, context, event, snapshot));
}

/**
 * Higher-order guard that evaluates to `true` if all `guards` passed to it
 * evaluate to `true`.
 *
 * @category Guards
 * @example
 *
 * ```ts
 * import { setup, and } from "@rbxts/xstate";
 *
 * const machine = setup({
 * 	guards: {
 * 		someNamedGuard: () => true,
 * 	},
 * }).createMachine({
 * 	on: {
 * 		someEvent: {
 * 			guard: and([
 * 				({ context }) => context.value > 0,
 * 				"someNamedGuard",
 * 			]),
 * 			actions: () => {
 * 				// will be executed if all guards in `and(...)`
 * 				// evaluate to true
 * 			},
 * 		},
 * 	},
 * });
 * ```
 *
 * @returns A guard action object
 */
export function andG<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TArg extends unknown[],
>(
	guards: readonly [
		...{
			[K in keyof TArg]: SingleGuardArg<TContext, TExpressionEvent, unknown, TArg[K]>;
		},
	],
): GuardPredicate<TContext, TExpressionEvent, unknown, NormalizeGuardArgArray<DoNotInfer<TArg>>> {
	function andG(_args: GuardArgs<TContext, TExpressionEvent>, _params: unknown) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
		return false;
	}

	// @ts-expect-error -- lua polyfill
	andG = callable(andG);
	andG.check = checkAnd;
	andG.guards = guards;

	return andG;
}

function checkOr(
	snapshot: AnyMachineSnapshot,
	{ context, event }: GuardArgs<any, any>,
	{ guards }: { guards: readonly UnknownGuard[] },
) {
	return guards.some(guard => evaluateGuard(guard, context, event, snapshot));
}

/**
 * Higher-order guard that evaluates to `true` if any of the `guards` passed to
 * it evaluate to `true`.
 *
 * @category Guards
 * @example
 *
 * ```ts
 * import { setup, or } from "@rbxts/xstate";
 *
 * const machine = setup({
 * 	guards: {
 * 		someNamedGuard: () => true,
 * 	},
 * }).createMachine({
 * 	on: {
 * 		someEvent: {
 * 			guard: or([
 * 				({ context }) => context.value > 0,
 * 				"someNamedGuard",
 * 			]),
 * 			actions: () => {
 * 				// will be executed if any of the guards in `or(...)`
 * 				// evaluate to true
 * 			},
 * 		},
 * 	},
 * });
 * ```
 *
 * @returns A guard action object
 */
export function orG<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TArg extends unknown[],
>(
	guards: readonly [
		...{
			[K in keyof TArg]: SingleGuardArg<TContext, TExpressionEvent, unknown, TArg[K]>;
		},
	],
): GuardPredicate<TContext, TExpressionEvent, unknown, NormalizeGuardArgArray<DoNotInfer<TArg>>> {
	function orG(_args: GuardArgs<TContext, TExpressionEvent>, _params: unknown) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
		return false;
	}

	// @ts-expect-error -- lua polyfill
	orG = callable(orG);
	orG.check = checkOr;
	orG.guards = guards;

	return orG;
}

// TODO: throw on cycles (depth check should be enough)
export function evaluateGuard<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
>(
	guard: UnknownGuard | UnknownInlineGuard,
	context: TContext,
	event: TExpressionEvent,
	snapshot: AnyMachineSnapshot,
): boolean {
	const { machine } = snapshot;
	const isInline = isInlineFn(guard);

	const resolved = isInline
		? guard
		: machine.implementations.guards[typeIs(guard, "string") ? guard : guard.type];

	if (!isInline && !resolved) {
		throw new Error(
			`Guard '${typeIs(guard, "string") ? guard : guard.type}' is not implemented.'.`,
		);
	}

	if (!isInlineFn(resolved)) {
		return evaluateGuard(resolved!, context, event, snapshot);
	}

	const guardArgs = {
		context,
		event,
	};

	const guardParams =
		isInline || typeIs(guard, "string")
			? undefined
			: "params" in guard
				? typeIs(guard.params, "function")
					? guard.params({ context, event })
					: guard.params
				: undefined;

	if (resolved !== undefined && (typeIs(resolved, "function") || !("check" in resolved))) {
		// the existing type of `.guards` assumes non-nullable `TExpressionGuard`
		// inline guards expect `TExpressionGuard` to be set to `undefined`
		// it's fine to cast this here, our logic makes sure that we call those 2 "variants" correctly
		return resolved(guardArgs, guardParams as never);
	}

	const builtinGuard = resolved as unknown as BuiltInGuard;

	return builtinGuard.check(
		snapshot,
		guardArgs,
		resolved, // this holds all params
	);
}
