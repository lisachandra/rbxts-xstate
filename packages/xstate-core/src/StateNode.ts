import { Array, Error, Number, Object } from "@rbxts/luau-polyfill";
import { MachineSnapshot } from "./State";
import type { StateMachine } from "./StateMachine";
import { NULL_EVENT, STATE_DELIMITER } from "./constants";
import { evaluateGuard } from "./guards";
import { memo } from "./utils/misc/memo";
import { getCandidates } from "./utils/state/getCandidates";
import { BuiltInAction } from "utils/state/types";
import { formatInitialTransition } from "utils/state/formatInitialTransition";
import { formatTransitions } from "utils/state/formatTransitions";
import { formatTransition } from "utils/state/formatTransition";
import { getDelayedTransitions } from "utils/state/getDelayedTransitions";
import type {
	DelayedTransitionDefinition,
	EventObject,
	InitialTransitionDefinition,
	InvokeDefinition,
	MachineContext,
	Mapper,
	StateNodeConfig,
	StateNodeDefinition,
	StateNodesConfig,
	StatesDefinition,
	TransitionDefinition,
	TransitionDefinitionMap,
	TODO,
	UnknownAction,
	ParameterizedObject,
	AnyStateMachine,
	AnyStateNodeConfig,
	ProvidedActor,
	NonReducibleUnknown,
	EventDescriptor,
	AnyStateNode,
} from "./types";
import { is } from "utils/polyfill/is";
import { mapValues } from "utils/misc/mapValues";
import { toArray } from "utils/polyfill/array";
import { toTransitionConfigArray } from "utils/misc/toTransitionConfigArray";
import { createInvokeId } from "utils/misc/createInvokeId";
import isDevelopment from "utils/polyfill/isDevelopment";

const EMPTY_OBJECT = {};

const toSerializableAction = (action: UnknownAction) => {
	if (typeIs(action, "string")) {
		return { type: action };
	}
	if (typeIs(action, "table")) {
		if ("resolve" in action) {
			return { type: (action as BuiltInAction).type };
		}
	}
	if (typeIs(action, "function")) {
		return {
			type: `${action}`,
		};
	}
	return action;
};

const checkStateOrders = (node: AnyStateNode, key: string) => {
	if (
		isDevelopment &&
		!(
			"_order_" in node.config.states![key] &&
			typeIs(node.config.states![key]["_order_"], "number")
		)
	) {
		warn(`
WARNING: XState state definition missing or has an invalid '_order_' property!
This indicates a potential issue with your XState to Roblox-TS compilation.
Without a numeric '_order_' property, Lua tables may not maintain the declared
order of your states, which can lead to unexpected state machine behavior.

To resolve this issue:
1.  **Verify Transformer Setup:** Ensure your 'rbxts-transformer-xstate' TypeScript
    transformer is correctly configured and actively running in your build pipeline.
2.  **Add Tracking Comment:** If this is a custom machine definition, or if the
    transformer is not automatically picking it up, add the comment
    '// @xstate-track' directly above your 'createMachine' call
    or relevant object literal declaration.
3.  **Check State Structure:** Confirm that the 'states' object in your machine
    definition directly contains valid object literals for each state.

Node: ${node.path.join(".")} (${key})
Stack Trace (from 'warn' call origin):
${debug.traceback()}
`);
	}
};

const sortByOrder = (node: AnyStateNode, a: string, b: string) => {
	const { _order_: aOrder } = node.config.states![a] as { _order_?: number };
	const { _order_: bOrder } = node.config.states![b] as { _order_?: number };

	checkStateOrders(node, a);
	checkStateOrders(node, b);

	return (aOrder ?? 0) < (bOrder ?? 0);
};

interface StateNodeOptions<TContext extends MachineContext, TEvent extends EventObject> {
	_key: string;
	_parent?: StateNode<TContext, TEvent>;
	_machine: AnyStateMachine;
}

export class StateNode<
	TContext extends MachineContext = MachineContext,
	TEvent extends EventObject = EventObject,
> {
	/**
	 * The relative key of the state node, which represents its location in the
	 * overall state value.
	 */
	public key: string;
	/** The unique ID of the state node. */
	public id: string;
	/**
	 * The type of this state node:
	 *
	 * - `'atomic'` - no child state nodes
	 * - `'compound'` - nested child state nodes (XOR)
	 * - `'parallel'` - orthogonal nested child state nodes (AND)
	 * - `'history'` - history state node
	 * - `'final'` - final state node
	 */
	public type: "atomic" | "compound" | "parallel" | "final" | "history";
	/** The string path from the root machine node to this node. */
	public path: string[];
	/** The child state nodes. */
	public states: StateNodesConfig<TContext, TEvent>;
	/**
	 * The type of history on this state node. Can be:
	 *
	 * - `'shallow'` - recalls only top-level historical state value
	 * - `'deep'` - recalls historical state value at all levels
	 */
	public history: false | "shallow" | "deep";
	/** The action(s) to be executed upon entering the state node. */
	public entry: UnknownAction[];
	/** The action(s) to be executed upon exiting the state node. */
	public exit: UnknownAction[];
	/** The parent state node. */
	public parent?: StateNode<TContext, TEvent>;
	/** The root machine node. */
	public machine: StateMachine<
		TContext,
		TEvent,
		any, // children
		any, // actor
		any, // action
		any, // guard
		any, // delay
		any, // state value
		any, // tag
		any, // input
		any, // output
		any, // emitted
		any, // meta
		any // state schema
	>;
	/**
	 * The meta data associated with this state node, which will be returned in
	 * State instances.
	 */
	public meta?: any;
	/**
	 * The output data sent with the "xstate.done.state._id_" event if this is a
	 * final state node.
	 */
	public output?: Mapper<MachineContext, EventObject, unknown, EventObject> | NonReducibleUnknown;

	/**
	 * The order this state node appears. Corresponds to the implicit document
	 * order.
	 */
	public order: number = -1;

	public description?: string;

	public tags: string[] = [];
	public transitions!: Map<string, TransitionDefinition<TContext, TEvent>[]>;
	public always?: Array<TransitionDefinition<TContext, TEvent>>;

	constructor(
		/** The raw config used to create the machine. */
		public config: StateNodeConfig<
			TContext,
			TEvent,
			TODO, // actors
			TODO, // actions
			TODO, // guards
			TODO, // delays
			TODO, // tags
			TODO, // output
			TODO, // emitted
			TODO // meta
		>,
		options: StateNodeOptions<TContext, TEvent>,
	) {
		this.parent = options._parent;
		this.key = options._key;
		this.machine = options._machine;
		this.path = this.parent ? Array.concat(this.parent.path, this.key) : [];
		this.id = this.config.id || [this.machine.id, ...this.path].join(STATE_DELIMITER);
		this.type =
			this.config.type ||
			(this.config.states && Object.keys(this.config.states).size()
				? "compound"
				: this.config.history
					? "history"
					: "atomic");
		this.description = this.config.description;

		this.order = this.machine.idMap.size();
		this.machine.idMap.set(this.id, this);

		this.states = (
			this.config.states
				? mapValues(
						this.config.states,
						(stateConfig: AnyStateNodeConfig, key) => {
							const stateNode = new StateNode(stateConfig, {
								_parent: this,
								_key: key,
								_machine: this.machine,
							});
							return stateNode;
						},
						(a, b) => sortByOrder(this, a, b),
					)
				: EMPTY_OBJECT
		) as StateNodesConfig<TContext, TEvent>;

		if (this.type === "compound" && !this.config.initial) {
			throw new Error(
				`No initial state specified for compound state node "#${
					this.id
				}". Try adding { initial: "${Object.keys(this.states)[0]}" } to the state config.`,
			);
		}

		// History config
		this.history = this.config.history === true ? "shallow" : this.config.history || false;

		this.entry = Array.slice(toArray(this.config.entry) as never[]);
		this.exit = Array.slice(toArray(this.config.exit) as never[]);

		this.meta = this.config.meta;
		this.output = this.type === "final" || !this.parent ? this.config.output : undefined;
		this.tags = Array.slice(toArray(config.tags) as never[]);
	}

	/** @internal */
	public _initialize() {
		this.transitions = formatTransitions(this);
		if (this.config.always) {
			this.always = toTransitionConfigArray(this.config.always).map(t =>
				formatTransition(this, NULL_EVENT, t),
			);
		}

		Object.keys(this.states)
			.sort((a, b) => sortByOrder(this, a, b))
			.forEach(key => {
				this.states[key]._initialize();
			});
	}

	/** The well-structured state node definition. */
	public getDefinition(): StateNodeDefinition<TContext, TEvent> {
		return {
			["_order_" as never]: this["_order_" as never],
			id: this.id,
			key: this.key,
			version: this.machine.version,
			type: this.type,
			initial: this.getInitial()
				? {
						target: this.getInitial().target,
						source: this,
						actions: this.getInitial().actions.map(toSerializableAction),
						eventType: undefined as never,
						reenter: false,
						toJSON: () => ({
							target: this.getInitial().target.map(t => `#${t.id}`),
							source: `#${this.id}`,
							actions: this.getInitial().actions.map(toSerializableAction),
							eventType: undefined as never,
						}),
					}
				: undefined,
			history: this.history,
			states: mapValues(
				this.states,
				(state: StateNode<TContext, TEvent>) => {
					return state.getDefinition();
				},
				(a, b) => sortByOrder(this, a, b),
			) as StatesDefinition<TContext, TEvent>,
			on: this.getOn(),
			transitions: Array.flat([...Object.values(this.transitions)]).map(t => ({
				...t,
				actions: t.actions.map(toSerializableAction),
			})),
			entry: this.entry.map(toSerializableAction),
			exit: this.exit.map(toSerializableAction),
			meta: this.meta,
			order: this.order || -1,
			output: this.output,
			invoke: this.getInvoke(),
			description: this.description,
			tags: this.tags,
		};
	}

	/** @internal */
	public toJSON() {
		return this.getDefinition();
	}

	/** The logic invoked as actors by this state node. */
	public getInvoke(): Array<
		InvokeDefinition<
			TContext,
			TEvent,
			ProvidedActor,
			ParameterizedObject,
			ParameterizedObject,
			string,
			TODO, // TEmitted
			TODO // TMeta
		>
	> {
		return memo(this, "invoke", () =>
			toArray(this.config.invoke).map((invokeConfig, i) => {
				const { src, systemId } = invokeConfig;
				const resolvedId = invokeConfig.id ?? createInvokeId(this.id, i);
				const sourceName = typeIs(src, "string")
					? src
					: `xstate.invoke.${createInvokeId(this.id, i)}`;

				return {
					...invokeConfig,
					src: sourceName,
					id: resolvedId,
					systemId: systemId,
					toJSON() {
						const _0 = {
							...invokeConfig,
							type: "xstate.invoke",
							src: sourceName,
							id: resolvedId,
						};
						delete _0.onDone;
						delete _0.onError;
						return _0;
					},
				} as InvokeDefinition<
					TContext,
					TEvent,
					ProvidedActor,
					ParameterizedObject,
					ParameterizedObject,
					string,
					TODO, // TEmitted
					TODO // TMeta
				>;
			}),
		);
	}

	/** The mapping of events to transitions. */
	public getOn(): TransitionDefinitionMap<TContext, TEvent> {
		return memo(this, "on", () => {
			const transitions = this.transitions;

			return Array.flatMap([...transitions], ([descriptor, t]) =>
				t.map(t => [descriptor, t] as const),
			).reduce(
				(map, [descriptor, transition]) => {
					if (!is<keyof typeof map>(descriptor)) {
						throw "" as never;
					}

					map[descriptor] = map[descriptor] || [];
					map[descriptor].push(transition as never);
					return map;
				},
				{} as TransitionDefinitionMap<TContext, TEvent>,
			);
		});
	}

	public getAfter(): Array<DelayedTransitionDefinition<TContext, TEvent>> {
		return memo(this, "delayedTransitions", () => getDelayedTransitions(this) as never);
	}

	public getInitial(): InitialTransitionDefinition<TContext, TEvent> {
		return memo(this, "initial", () => formatInitialTransition(this, this.config.initial));
	}

	/** @internal */
	public next(
		snapshot: MachineSnapshot<
			TContext,
			TEvent,
			any,
			any,
			any,
			any,
			any, // TMeta
			any // TStateSchema
		>,
		event: TEvent,
	): TransitionDefinition<TContext, TEvent>[] | undefined {
		const eventType = event.type;
		const actions: UnknownAction[] = [];

		let selectedTransition: TransitionDefinition<TContext, TEvent> | undefined;

		const candidates: Array<TransitionDefinition<TContext, TEvent>> = memo(
			this,
			`candidates-${eventType}`,
			() => getCandidates(this, eventType),
		);

		for (const candidate of candidates) {
			const { guard } = candidate;
			const resolvedContext = snapshot.context;

			let guardPassed = false;

			try {
				guardPassed =
					!guard ||
					evaluateGuard<TContext, TEvent>(guard, resolvedContext, event, snapshot);
			} catch (err: any) {
				const guardType = typeIs(guard, "string")
					? guard
					: typeIs(guard, "table")
						? guard["type" as never]
						: undefined;
				throw new Error(
					`Unable to evaluate guard ${
						guardType ? `'${guardType}' ` : ""
					}in transition for event '${eventType}' in state node '${this.id}':\n${err}`,
				);
			}

			if (guardPassed) {
				for (const v of candidate.actions) {
					actions.push(v);
				}
				selectedTransition = candidate;
				break;
			}
		}

		return selectedTransition ? [selectedTransition] : undefined;
	}

	/** All the event types accepted by this state node and its descendants. */
	public getEvents(): Array<EventDescriptor<TEvent>> {
		return memo(this, "events", () => {
			const { states } = this;
			const events = new Set(this.getOwnEvents());

			if (states) {
				for (const [_, state] of pairs(states)) {
					if (state.states) {
						for (const event of state.getEvents()) {
							events.add(`${event}`);
						}
					}
				}
			}

			return [...events];
		});
	}

	/**
	 * All the events that have transitions directly from this state node.
	 *
	 * Excludes any inert events.
	 */
	public getOwnEvents(): Array<EventDescriptor<TEvent>> {
		const events = new Set(
			[...Object.keys(this.transitions)].filter(descriptor => {
				return this.transitions
					.get(descriptor)!
					.some(
						transition =>
							!(
								!transition.target &&
								!transition.actions.size() &&
								!transition.reenter
							),
					);
			}),
		);

		return [...events];
	}
}
