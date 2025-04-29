import isDevelopment from "./utils/polyfill/isDevelopment";
import { __ACTOR_TYPE } from "./constants";
import type { StateNode } from "./StateNode";
import type { StateMachine } from "./StateMachine";
import { getStateValue } from "utils/state/getStateValue";
import type {
	ProvidedActor,
	AnyMachineSnapshot,
	AnyStateMachine,
	EventObject,
	HistoryValue,
	MachineContext,
	StateConfig,
	StateValue,
	AnyActorRef,
	Snapshot,
	ParameterizedObject,
	IsNever,
	MetaObject,
	StateSchema,
	StateId,
	SnapshotStatus,
	AnyObject,
} from "./types";
import { matchesState } from "utils/misc/matchesState";
import { omit } from "utils/misc/omit";
import { Array, Error } from "@rbxts/luau-polyfill";

type ToTestStateValue<TStateValue extends StateValue> = TStateValue extends string
	? TStateValue
	: IsNever<keyof TStateValue> extends true
		? never
		:
				| keyof TStateValue
				| {
						[K in keyof TStateValue]?: ToTestStateValue<NonNullable<TStateValue[K]>>;
				  };

interface MachineSnapshotBase<
	TContext extends MachineContext,
	TEvent extends EventObject,
	TChildren extends Record<string, AnyActorRef | undefined>,
	TStateValue extends StateValue,
	TTag extends string,
	TOutput,
	TMeta,
	TStateSchema extends StateSchema = StateSchema,
> {
	/** The state machine that produced this state snapshot. */
	machine: StateMachine<
		TContext,
		TEvent,
		TChildren,
		ProvidedActor,
		ParameterizedObject,
		ParameterizedObject,
		string,
		TStateValue,
		TTag,
		unknown,
		TOutput,
		EventObject, // TEmitted
		any, // TMeta
		TStateSchema
	>;
	/**
	 * The tags of the active state nodes that represent the current state
	 * value.
	 */
	tags: Set<string>;
	/**
	 * The current state value.
	 *
	 * This represents the active state nodes in the state machine.
	 *
	 * - For atomic state nodes, it is a string.
	 * - For compound parent state nodes, it is an object where:
	 *
	 *   - The key is the parent state node's key
	 *   - The value is the current state value of the active child state node(s)
	 *
	 * @example
	 *
	 * ```ts
	 * // single-level state node
	 * snapshot.value; // => 'yellow'
	 *
	 * // nested state nodes
	 * snapshot.value; // => { red: 'wait' }
	 * ```
	 */
	value: TStateValue;
	/** The current status of this snapshot. */
	status: SnapshotStatus;
	error: unknown;
	context: TContext;

	historyValue: Readonly<HistoryValue<TContext, TEvent>>;
	/** The enabled state nodes representative of the state value. */
	_nodes: Array<StateNode<TContext, TEvent>>;
	/** An object mapping actor names to spawned/invoked actors. */
	children: TChildren;

	/**
	 * Whether the current state value is a subset of the given partial state
	 * value.
	 *
	 * @param partialStateValue
	 */
	matches(partialStateValue: ToTestStateValue<TStateValue>): boolean;

	/**
	 * Whether the current state nodes has a state node with the specified
	 * `tag`.
	 *
	 * @param tag
	 */
	hasTag(tag: TTag): boolean;

	/**
	 * Determines whether sending the `event` will cause a non-forbidden
	 * transition to be selected, even if the transitions have no actions nor
	 * change the state value.
	 *
	 * @param event The event to test
	 * @returns Whether the event will cause a transition
	 */
	can(event: TEvent): boolean;

	getMeta(): Record<
		StateId<TStateSchema> & string,
		TMeta | undefined // States might not have meta defined
	>;

	toJSON(): unknown;
}

interface ActiveMachineSnapshot<
	TContext extends MachineContext,
	TEvent extends EventObject,
	TChildren extends Record<string, AnyActorRef | undefined>,
	TStateValue extends StateValue,
	TTag extends string,
	TOutput,
	TMeta extends MetaObject,
	TConfig extends StateSchema,
> extends MachineSnapshotBase<
		TContext,
		TEvent,
		TChildren,
		TStateValue,
		TTag,
		TOutput,
		TMeta,
		TConfig
	> {
	status: "active";
	output: undefined;
	error: undefined;
}

interface DoneMachineSnapshot<
	TContext extends MachineContext,
	TEvent extends EventObject,
	TChildren extends Record<string, AnyActorRef | undefined>,
	TStateValue extends StateValue,
	TTag extends string,
	TOutput,
	TMeta extends MetaObject,
	TConfig extends StateSchema,
> extends MachineSnapshotBase<
		TContext,
		TEvent,
		TChildren,
		TStateValue,
		TTag,
		TOutput,
		TMeta,
		TConfig
	> {
	status: "done";
	output: TOutput;
	error: undefined;
}

interface ErrorMachineSnapshot<
	TContext extends MachineContext,
	TEvent extends EventObject,
	TChildren extends Record<string, AnyActorRef | undefined>,
	TStateValue extends StateValue,
	TTag extends string,
	TOutput,
	TMeta extends MetaObject,
	TConfig extends StateSchema,
> extends MachineSnapshotBase<
		TContext,
		TEvent,
		TChildren,
		TStateValue,
		TTag,
		TOutput,
		TMeta,
		TConfig
	> {
	status: "error";
	output: undefined;
	error: unknown;
}

interface StoppedMachineSnapshot<
	TContext extends MachineContext,
	TEvent extends EventObject,
	TChildren extends Record<string, AnyActorRef | undefined>,
	TStateValue extends StateValue,
	TTag extends string,
	TOutput,
	TMeta extends MetaObject,
	TConfig extends StateSchema,
> extends MachineSnapshotBase<
		TContext,
		TEvent,
		TChildren,
		TStateValue,
		TTag,
		TOutput,
		TMeta,
		TConfig
	> {
	status: "stopped";
	output: undefined;
	error: undefined;
}

export type MachineSnapshot<
	TContext extends MachineContext,
	TEvent extends EventObject,
	TChildren extends Record<string, AnyActorRef | undefined>,
	TStateValue extends StateValue,
	TTag extends string,
	TOutput,
	TMeta extends MetaObject,
	TConfig extends StateSchema,
> =
	| ActiveMachineSnapshot<TContext, TEvent, TChildren, TStateValue, TTag, TOutput, TMeta, TConfig>
	| DoneMachineSnapshot<TContext, TEvent, TChildren, TStateValue, TTag, TOutput, TMeta, TConfig>
	| ErrorMachineSnapshot<TContext, TEvent, TChildren, TStateValue, TTag, TOutput, TMeta, TConfig>
	| StoppedMachineSnapshot<
			TContext,
			TEvent,
			TChildren,
			TStateValue,
			TTag,
			TOutput,
			TMeta,
			TConfig
	  >;

const machineSnapshotMatches = function (this: AnyMachineSnapshot, testValue: StateValue) {
	return matchesState(testValue, this.value);
};

const machineSnapshotHasTag = function (this: AnyMachineSnapshot, tag: string) {
	return this.tags.has(tag);
};

const machineSnapshotCan = function (this: AnyMachineSnapshot, event: EventObject) {
	if (isDevelopment && !this.machine) {
		warn(
			`state.can(...) used outside of a machine-created State object; this will always return false.`,
		);
	}

	const transitionData = this.machine.getTransitionData(this, event);

	return (
		!!transitionData?.size() &&
		// Check that at least one transition is not forbidden
		transitionData.some(t => !!(t.target !== undefined || t.actions.size()))
	);
};

const machineSnapshotToJSON = function (this: AnyMachineSnapshot) {
	const jsonValues = omit(this, [
		"_nodes",
		"tags",
		"machine",
		"children",
		"context",
		"can",
		"hasTag",
		"matches",
		"getMeta",
		"toJSON",
	]);
	return { ...jsonValues, tags: [...this.tags] };
};

const machineSnapshotGetMeta = function (this: AnyMachineSnapshot) {
	return this._nodes.reduce(
		(acc, stateNode) => {
			if ((stateNode as never as AnyObject).meta !== undefined) {
				acc[stateNode.id] = stateNode.meta;
			}
			return acc;
		},
		{} as Record<string, any>,
	);
};

export function createMachineSnapshot<
	TContext extends MachineContext,
	TEvent extends EventObject,
	TChildren extends Record<string, AnyActorRef | undefined>,
	TStateValue extends StateValue,
	TTag extends string,
	TMeta extends MetaObject,
	TStateSchema extends StateSchema,
>(
	config: StateConfig<TContext, TEvent>,
	machine: AnyStateMachine,
): MachineSnapshot<TContext, TEvent, TChildren, TStateValue, TTag, undefined, TMeta, TStateSchema> {
	return {
		status: config.status as never,
		output: config.output,
		error: config.error,
		machine,
		context: config.context,
		_nodes: config._nodes,
		value: getStateValue(machine.root, config._nodes) as never,
		tags: new Set(Array.flatMap(config._nodes, sn => sn.tags)),
		children: config.children as never,
		historyValue: config.historyValue || {},
		matches: machineSnapshotMatches as never,
		hasTag: machineSnapshotHasTag,
		can: machineSnapshotCan,
		getMeta: machineSnapshotGetMeta,
		toJSON: machineSnapshotToJSON,
	};
}

export function cloneMachineSnapshot<TState extends AnyMachineSnapshot>(
	snapshot: TState,
	config: Partial<StateConfig<any, any>> = {},
): TState {
	return createMachineSnapshot(
		{ ...snapshot, ...config } as StateConfig<any, any>,
		snapshot.machine,
	) as TState;
}

export function getPersistedSnapshot<
	TContext extends MachineContext,
	TEvent extends EventObject,
	TChildren extends Record<string, AnyActorRef | undefined>,
	TStateValue extends StateValue,
	TTag extends string,
	TOutput,
	TMeta extends MetaObject,
>(
	snapshot: MachineSnapshot<
		TContext,
		TEvent,
		TChildren,
		TStateValue,
		TTag,
		TOutput,
		TMeta,
		any // state schema
	>,
	options?: unknown,
): Snapshot<unknown> {
	const { children, context } = snapshot;
	const jsonValues = omit(snapshot, [
		"_nodes",
		"tags",
		"machine",
		"children",
		"context",
		"can",
		"hasTag",
		"matches",
		"getMeta",
		"toJSON",
	]);

	const childrenJson: Record<string, unknown> = {};

	for (const [_, id] of pairs(children)) {
		const child = children[id as never] as object;
		if (
			isDevelopment &&
			!typeIs(child["src" as never], "string") &&
			(!options || !("__unsafeAllowInlineActors" in (options as object)))
		) {
			throw new Error("An inline child actor cannot be persisted.");
		}
		childrenJson[id as keyof typeof childrenJson] = {
			snapshot: (child["getPersistedSnapshot" as never] as Callback)(options),
			src: child["src" as never],
			systemId: child["_systemId" as never],
			syncSnapshot: child["_syncSnapshot" as never],
		};
	}

	const persisted = {
		...jsonValues,
		context: persistContext(context) as never,
		children: childrenJson,
	};

	return persisted as never;
}

function persistContext(contextPart: Record<string, unknown>) {
	let copy: typeof contextPart | undefined;
	for (const [_, key] of pairs(contextPart)) {
		const value = contextPart[key as never];
		if (value && typeIs(value, "table")) {
			if ("sessionId" in value && "send" in value && "ref" in value) {
				copy ??= Array.isArray(contextPart)
					? (Array.slice(contextPart) as typeof contextPart)
					: { ...contextPart };
				copy[key as never] = {
					xstate$$type: __ACTOR_TYPE,
					id: (value as never as AnyActorRef).id,
				};
			} else {
				const result = persistContext(value as typeof contextPart);
				if (result !== value) {
					copy ??= Array.isArray(contextPart)
						? (Array.slice(contextPart) as typeof contextPart)
						: { ...contextPart };
					copy[key as never] = result;
				}
			}
		}
	}
	return copy ?? contextPart;
}
