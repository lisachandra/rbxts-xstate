import isDevelopment from "./utils/polyfill/isDevelopment";
import { Mailbox } from "./Mailbox";
import { __ACTOR_TYPE, XSTATE_STOP } from "./constants";
import { createDoneActorEvent } from "utils/event/createDoneActorEvent";
import { createErrorActorEvent } from "utils/event/createErrorActorEvent";
import { createInitEvent } from "utils/event/createInitEvent";
import { reportUnhandledError } from "./utils/misc/reportUnhandledError";
import Symbol from "./utils/polyfill/symbol";
import { AnyActorSystem, Clock, createSystem } from "./createSystem";

export let executingCustomAction: boolean = false;

import type {
	ActorScope,
	AnyActorLogic,
	AnyActorRef,
	AnyObject,
	ConditionalRequired,
	DoneActorEvent,
	EmittedFrom,
	EventFromLogic,
	InputFrom,
	IsNotNever,
	Snapshot,
	SnapshotFrom,
} from "./types";
import {
	ActorOptions,
	ActorRef,
	EventObject,
	InteropSubscribable,
	Observer,
	Subscription,
} from "./types";
import { JSON } from "utils/polyfill/json";
import { toObserver } from "utils/misc/toObserver";
import { clearTimeout, Error, Object, setTimeout } from "@rbxts/luau-polyfill";
import { bind } from "utils/polyfill/bind";
import { HttpService } from "@rbxts/services";

// those values are currently used by @xstate/react directly so it's important to keep the assigned values in sync
export enum ProcessingStatus {
	NotStarted = 0,
	Running = 1,
	Stopped = 2,
}

const defaultOptions = {
	clock: {
		setTimeout(fn, ms) {
			return setTimeout(fn, ms);
		},
		clearTimeout(id) {
			return clearTimeout(id);
		},
	} as Clock,
	logger: print,
	devTools: false,
};

/**
 * An Actor is a running process that can receive events, send events and change
 * its behavior based on the events it receives, which can cause effects outside
 * of the actor. When you run a state machine, it becomes an actor.
 */
export class Actor<TLogic extends AnyActorLogic>
	implements ActorRef<SnapshotFrom<TLogic>, EventFromLogic<TLogic>, EmittedFrom<TLogic>>
{
	/** The current internal state of the actor. */
	private _snapshot!: SnapshotFrom<TLogic>;
	/**
	 * The clock that is responsible for setting and clearing timeouts, such as
	 * delayed events and transitions.
	 */
	public clock: Clock;
	public options: Readonly<ActorOptions<TLogic>>;

	/** The unique identifier for this actor relative to its parent. */
	public id: string;

	private mailbox: Mailbox<EventFromLogic<TLogic>> = new Mailbox(
		bind(false, this["_process" as never], this),
	);

	private observers: Set<Observer<SnapshotFrom<TLogic>>> = new Set();
	private eventListeners: Map<string, Set<(emittedEvent: EmittedFrom<TLogic>) => void>> =
		new Map();
	private logger: (...args: any[]) => void;

	/** @internal */
	public _processingStatus: ProcessingStatus = ProcessingStatus.NotStarted;

	// Actor Ref
	public _parent?: AnyActorRef;
	/** @internal */
	public _syncSnapshot?: boolean;
	public ref: ActorRef<SnapshotFrom<TLogic>, EventFromLogic<TLogic>, EmittedFrom<TLogic>>;
	// TODO: add typings for system
	private _actorScope: ActorScope<
		SnapshotFrom<TLogic>,
		EventFromLogic<TLogic>,
		AnyActorSystem,
		EmittedFrom<TLogic>
	>;

	private _systemId: string | undefined;

	/** The globally unique process ID for this invocation. */
	public sessionId: string;

	/** The system to which this actor belongs. */
	public system: AnyActorSystem;
	private _doneEvent?: DoneActorEvent;

	public src: string | AnyActorLogic;

	/**
	 * Creates a new actor instance for the given logic with the provided
	 * options, if any.
	 *
	 * @param logic The logic to create an actor from
	 * @param options Actor options
	 */
	constructor(
		public logic: TLogic,
		options?: ActorOptions<TLogic>,
	) {
		const resolvedOptions = {
			...defaultOptions,
			...options,
		};

		const { clock, logger, parent, syncSnapshot, id, systemId, inspect } = resolvedOptions;

		this.system = parent
			? parent.system
			: createSystem(this, {
					clock,
					logger,
				});

		if (inspect && !parent) {
			// Always inspect at the system-level
			this.system.inspect(toObserver(inspect));
		}

		this.sessionId = this.system._bookId();
		this.id = id ?? this.sessionId;
		this.logger = options?.logger ?? this.system._logger;
		this.clock = options?.clock ?? this.system._clock;
		this._parent = parent;
		this._syncSnapshot = syncSnapshot;
		this.options = resolvedOptions as ActorOptions<TLogic> & typeof defaultOptions;
		this.src = resolvedOptions.src ?? logic;
		this.ref = this;
		this._actorScope = {
			self: this,
			id: this.id,
			sessionId: this.sessionId,
			logger: this.logger,
			defer: fn => {
				this._deferred.push(fn);
			},
			system: this.system,
			stopChild: child => {
				if (child._parent !== this) {
					throw new Error(
						`Cannot stop child actor ${child.id} of ${this.id} because it is not a child`,
					);
				}
				(child["_stop" as never] as Callback)(child);
			},
			emit: emittedEvent => {
				const listeners = this.eventListeners.get(
					(emittedEvent as AnyObject).type as string,
				);
				const wildcardListener = this.eventListeners.get("*");
				if (!listeners && !wildcardListener) {
					return;
				}
				const allListeners = [
					...(listeners ? Object.keys(listeners) : []),
					...(wildcardListener ? Object.keys(wildcardListener) : []),
				];
				for (const handler of allListeners) {
					handler(emittedEvent);
				}
			},
			actionExecutor: action => {
				const exec = () => {
					this._actorScope.system._sendInspectionEvent({
						type: "@xstate.action",
						actorRef: this,
						action: {
							type: action.type,
							params: action.params,
						},
					});
					if (!action.exec) {
						return;
					}
					const saveExecutingCustomAction = executingCustomAction;
					try {
						executingCustomAction = true;
						action.exec(action.info, action.params);
					} finally {
						executingCustomAction = saveExecutingCustomAction;
					}
				};
				if (this._processingStatus === ProcessingStatus.Running) {
					exec();
				} else {
					this._deferred.push(exec);
				}
			},
		};

		// Ensure that the send method is bound to this Actor instance
		// if destructured
		this.send = bind(true, this["send" as never], this);

		this.system._sendInspectionEvent({
			type: "@xstate.actor",
			actorRef: this,
		});

		if (systemId) {
			this._systemId = systemId;
			this.system._set(systemId, this);
		}

		this._initState(options?.snapshot ?? options?.state);

		if (systemId && (this._snapshot as AnyObject).status !== "active") {
			this.system._unregister(this);
		}
	}

	private _initState(persistedState?: Snapshot<unknown>) {
		try {
			this._snapshot = persistedState
				? "restoreSnapshot" in this.logic
					? this.logic.restoreSnapshot!(persistedState, this._actorScope)
					: persistedState
				: this.logic.getInitialSnapshot(this._actorScope, this.options?.input);
		} catch (err) {
			// if we get here then it means that we assign a value to this._snapshot that is not of the correct type
			// we can't get the true `TSnapshot & { status: 'error'; }`, it's impossible
			// so right now this is a lie of sorts
			this._snapshot = {
				status: "error",
				trace: debug.traceback("\n"),
				output: undefined,
				error: err,
			} as never;
		}
	}

	// array of functions to defer
	private _deferred: Array<() => void> = [];

	private update(snapshot: SnapshotFrom<TLogic>, event: EventObject): void {
		// Update state
		this._snapshot = snapshot;

		// Execute deferred effects
		let deferredFn: (typeof this._deferred)[number] | undefined;

		while ((deferredFn = this._deferred.shift())) {
			try {
				deferredFn();
			} catch (err) {
				// this error can only be caught when executing *initial* actions
				// it's the only time when we call actions provided by the user through those deferreds
				// when the actor is already running we always execute them synchronously while transitioning
				// no "builtin deferred" should actually throw an error since they are either safe
				// or the control flow is passed through the mailbox and errors should be caught by the `_process` used by the mailbox
				table.clear(this._deferred);
				this._snapshot = {
					...(snapshot as object),
					status: "error",
					trace: debug.traceback("\n"),
					error: err,
				} as never;
			}
		}

		switch ((this._snapshot as AnyObject).status) {
			case "active":
				for (const observer of this.observers) {
					try {
						observer.next?.(snapshot);
					} catch (err) {
						reportUnhandledError(err);
					}
				}
				break;
			case "done":
				// next observers are meant to be notified about done snapshots
				// this can be seen as something that is different from how observable work
				// but with observables `complete` callback is called without any arguments
				// it's more ergonomic for XState to treat a done snapshot as a "next" value
				// and the completion event as something that is separate,
				// something that merely follows emitting that done snapshot
				for (const observer of this.observers) {
					try {
						observer.next?.(snapshot);
					} catch (err) {
						reportUnhandledError(err);
					}
				}

				this._stopProcedure();
				this._complete();
				this._doneEvent = createDoneActorEvent(
					this.id,
					(this._snapshot as AnyObject).output,
				);
				if (this._parent) {
					this.system._relay(this, this._parent, this._doneEvent);
				}

				break;
			case "error":
				this._error((this._snapshot as AnyObject).error);
				break;
		}
		this.system._sendInspectionEvent({
			type: "@xstate.snapshot",
			actorRef: this,
			event,
			snapshot,
		});
	}

	/**
	 * Subscribe an observer to an actor’s snapshot values.
	 *
	 * @remarks
	 * The observer will receive the actor’s snapshot value when it is emitted.
	 * The observer can be:
	 *
	 * - A plain function that receives the latest snapshot, or
	 * - An observer object whose `.next(snapshot)` method receives the latest
	 *   snapshot
	 *
	 * @example
	 *
	 * ```ts
	 * // Observer as a plain function
	 * const subscription = actor.subscribe(snapshot => {
	 * 	console.log(snapshot);
	 * });
	 * ```
	 *
	 * @example
	 *
	 * ```ts
	 * // Observer as an object
	 * const subscription = actor.subscribe({
	 * 	next(snapshot) {
	 * 		console.log(snapshot);
	 * 	},
	 * 	error(err) {
	 * 		// ...
	 * 	},
	 * 	complete() {
	 * 		// ...
	 * 	},
	 * });
	 * ```
	 *
	 * The return value of `actor.subscribe(observer)` is a subscription object
	 * that has an `.unsubscribe()` method. You can call
	 * `subscription.unsubscribe()` to unsubscribe the observer:
	 *
	 * @example
	 *
	 * ```ts
	 * const subscription = actor.subscribe(snapshot => {
	 * 	// ...
	 * });
	 *
	 * // Unsubscribe the observer
	 * subscription.unsubscribe();
	 * ```
	 *
	 * When the actor is stopped, all of its observers will automatically be
	 * unsubscribed.
	 *
	 * @param observer - Either a plain function that receives the latest
	 *   snapshot, or an observer object whose `.next(snapshot)` method receives
	 *   the latest snapshot
	 */
	public subscribe(observer: Observer<SnapshotFrom<TLogic>>): Subscription;
	public subscribe(
		nextListener?: (snapshot: SnapshotFrom<TLogic>) => void,
		errorListener?: (error: any) => void,
		completeListener?: () => void,
	): Subscription;
	public subscribe(
		nextListenerOrObserver?:
			| ((snapshot: SnapshotFrom<TLogic>) => void)
			| Observer<SnapshotFrom<TLogic>>,
		errorListener?: (error: any) => void,
		completeListener?: () => void,
	): Subscription {
		const observer = toObserver(nextListenerOrObserver, errorListener, completeListener);

		if (this._processingStatus !== ProcessingStatus.Stopped) {
			this.observers.add(observer);
		} else {
			switch ((this._snapshot as AnyObject).status) {
				case "done":
					try {
						observer.complete?.();
					} catch (err) {
						reportUnhandledError(err);
					}
					break;
				case "error": {
					const err = (this._snapshot as AnyObject).error;
					const trace = (this._snapshot as AnyObject).trace as string;
					if (!observer.error) {
						reportUnhandledError(err, trace);
					} else {
						try {
							observer.error(err);
						} catch (err) {
							reportUnhandledError(err, trace);
						}
					}
					break;
				}
			}
		}

		const observers = this.observers;
		return {
			unsubscribe() {
				observers.delete(observer);
			},
		};
	}

	public on<TType extends EmittedFrom<TLogic>["type"] | "*">(
		kind: TType,
		handler: (
			emitted: EmittedFrom<TLogic> & (TType extends "*" ? unknown : { type: TType }),
		) => void,
	): Subscription {
		let listeners = this.eventListeners.get(kind);
		if (!listeners) {
			listeners = new Set();
			this.eventListeners.set(kind, listeners);
		}
		listeners.add(handler);

		return {
			unsubscribe() {
				listeners.delete(handler);
			},
		};
	}

	/** Starts the Actor from the initial state */
	public start(): this {
		if (this._processingStatus === ProcessingStatus.Running) {
			// Do not restart the service if it is already started
			return this;
		}

		if (this._syncSnapshot) {
			this.subscribe({
				next: (snapshot: Snapshot<unknown>) => {
					if (snapshot.status === "active") {
						this.system._relay(this, this._parent!, {
							type: `xstate.snapshot.${this.id}`,
							snapshot,
						});
					}
				},
				error: () => {},
			});
		}

		this.system._register(this.sessionId, this);
		if (this._systemId) {
			this.system._set(this._systemId, this);
		}
		this._processingStatus = ProcessingStatus.Running;

		// TODO: this isn't correct when rehydrating
		const initEvent = createInitEvent(this.options.input);

		this.system._sendInspectionEvent({
			type: "@xstate.event",
			sourceRef: this._parent,
			actorRef: this,
			event: initEvent,
		});

		const status = (this._snapshot as AnyObject).status;

		switch (status) {
			case "done":
				// a state machine can be "done" upon initialization (it could reach a final state using initial microsteps)
				// we still need to complete observers, flush deferreds etc
				this.update(this._snapshot, initEvent as unknown as EventFromLogic<TLogic>);
				// TODO: rethink cleanup of observers, mailbox, etc
				return this;
			case "error":
				this._error((this._snapshot as AnyObject).error);
				return this;
		}

		if (!this._parent) {
			this.system.start();
		}

		if ("start" in this.logic) {
			try {
				this.logic.start!(this._snapshot, this._actorScope);
			} catch (err) {
				this._snapshot = {
					...(this._snapshot as object),
					status: "error",
					trace: debug.traceback("\n"),
					error: err,
				} as never;
				this._error(err);
				return this;
			}
		}

		// TODO: this notifies all subscribers but usually this is redundant
		// there is no real change happening here
		// we need to rethink if this needs to be refactored
		this.update(this._snapshot, initEvent as unknown as EventFromLogic<TLogic>);

		if (this.options.devTools) {
			// this.attachDevTools();
		}

		this.mailbox.start();

		return this;
	}

	private _process(event: EventFromLogic<TLogic>) {
		let nextState;
		let caughtError;
		try {
			nextState = this.logic.transition(this._snapshot, event, this._actorScope);
		} catch (err) {
			// we wrap it in a box so we can rethrow it later even if falsy value gets caught here
			caughtError = { err };
		}

		if (caughtError) {
			const { err } = caughtError;

			this._snapshot = {
				...(this._snapshot as object),
				status: "error",
				trace: debug.traceback("\n"),
				error: err,
			} as never;
			this._error(err);
			return;
		}

		this.update(nextState, event);
		if ((event as AnyObject).type === XSTATE_STOP) {
			this._stopProcedure();
			this._complete();
		}
	}

	private _stop(): this {
		if (this._processingStatus === ProcessingStatus.Stopped) {
			return this;
		}
		this.mailbox.clear();
		if (this._processingStatus === ProcessingStatus.NotStarted) {
			this._processingStatus = ProcessingStatus.Stopped;
			return this;
		}
		this.mailbox.enqueue({ type: XSTATE_STOP } as never);

		return this;
	}

	/** Stops the Actor and unsubscribe all listeners. */
	public stop(): this {
		if (this._parent) {
			throw new Error("A non-root actor cannot be stopped directly.");
		}
		return this._stop();
	}
	private _complete(): void {
		for (const observer of this.observers) {
			try {
				observer.complete?.();
			} catch (err) {
				reportUnhandledError(err);
			}
		}
		this.observers.clear();
	}
	private _reportError(err: unknown): void {
		if (!this.observers.size()) {
			if (!this._parent) {
				reportUnhandledError(err);
			}
			return;
		}
		let reportError = false;

		for (const observer of this.observers) {
			const errorListener = observer.error;
			reportError ||= !errorListener;
			try {
				errorListener?.(err);
			} catch (err2) {
				reportUnhandledError(err2);
			}
		}
		this.observers.clear();
		if (reportError) {
			reportUnhandledError(err);
		}
	}
	private _error(err: unknown): void {
		this._stopProcedure();
		this._reportError(err);
		if (this._parent) {
			this.system._relay(this, this._parent, createErrorActorEvent(this.id, err));
		}
	}
	// TODO: atm children don't belong entirely to the actor so
	// in a way - it's not even super aware of them
	// so we can't stop them from here but we really should!
	// right now, they are being stopped within the machine's transition
	// but that could throw and leave us with "orphaned" active actors
	private _stopProcedure(): this {
		if (this._processingStatus !== ProcessingStatus.Running) {
			// Actor already stopped; do nothing
			return this;
		}

		// Cancel all delayed events
		this.system.scheduler.cancelAll(this);

		// TODO: mailbox.reset
		this.mailbox.clear();
		// TODO: after `stop` we must prepare ourselves for receiving events again
		// events sent *after* stop signal must be queued
		// it seems like this should be the common behavior for all of our consumers
		// so perhaps this should be unified somehow for all of them
		this.mailbox = new Mailbox(bind(false, this["_process" as never], this));

		this._processingStatus = ProcessingStatus.Stopped;
		this.system._unregister(this);

		return this;
	}

	/** @internal */
	public _send(event: EventFromLogic<TLogic>) {
		if (this._processingStatus === ProcessingStatus.Stopped) {
			// do nothing
			if (isDevelopment) {
				const eventString = JSON.stringify(event);

				warn(
					`Event "${(event as object)["type" as never]}" was sent to stopped actor "${this.id} (${this.sessionId})". This actor has already reached its final state, and will not transition.\nEvent: ${eventString}`,
				);
			}
			return;
		}

		this.mailbox.enqueue(event);
	}

	/**
	 * Sends an event to the running Actor to trigger a transition.
	 *
	 * @param event The event to send
	 */
	public send(event: EventFromLogic<TLogic>) {
		if (isDevelopment && typeIs(event, "string")) {
			throw new Error(
				`Only event objects may be sent to actors; use .send({ type: "${event}" }) instead`,
			);
		}
		this.system._relay(undefined, this, event);
	}

	public toJSON() {
		return {
			xstate$$type: __ACTOR_TYPE,
			id: this.id,
		};
	}

	/**
	 * Obtain the internal state of the actor, which can be persisted.
	 *
	 * @remarks
	 * The internal state can be persisted from any actor, not only machines.
	 *
	 * Note that the persisted state is not the same as the snapshot from
	 * {@link Actor.getSnapshot}. Persisted state represents the internal state
	 * of the actor, while snapshots represent the actor's last emitted value.
	 *
	 * Can be restored with {@link ActorOptions.state}
	 * @see https://stately.ai/docs/persistence
	 */
	public getPersistedSnapshot(options?: unknown): Snapshot<unknown> {
		return this.logic.getPersistedSnapshot(this._snapshot, options);
	}

	public [Symbol.observable](): InteropSubscribable<SnapshotFrom<TLogic>> {
		return this;
	}

	/**
	 * Read an actor’s snapshot synchronously.
	 *
	 * @remarks
	 * The snapshot represent an actor's last emitted value.
	 *
	 * When an actor receives an event, its internal state may change. An actor
	 * may emit a snapshot when a state transition occurs.
	 *
	 * Note that some actors, such as callback actors generated with
	 * `fromCallback`, will not emit snapshots.
	 * @see {@link Actor.subscribe} to subscribe to an actor’s snapshot values.
	 * @see {@link Actor.getPersistedSnapshot} to persist the internal state of an actor (which is more than just a snapshot).
	 */
	public getSnapshot(): SnapshotFrom<TLogic> {
		if (isDevelopment && !this._snapshot) {
			throw new Error(`Snapshot can't be read while the actor initializes itself`);
		}
		return this._snapshot;
	}
}

export type RequiredActorOptionsKeys<TLogic extends AnyActorLogic> =
	undefined extends InputFrom<TLogic> ? never : "input";

/**
 * Creates a new actor instance for the given actor logic with the provided
 * options, if any.
 *
 * @remarks
 * When you create an actor from actor logic via `createActor(logic)`, you
 * implicitly create an actor system where the created actor is the root actor.
 * Any actors spawned from this root actor and its descendants are part of that
 * actor system.
 * @example
 *
 * ```ts
 * import { createActor } from "@rbxts/xstate";
 * import { someActorLogic } from "./someActorLogic";
 *
 * // Creating the actor, which implicitly creates an actor system with itself as the root actor
 * const actor = createActor(someActorLogic);
 *
 * actor.subscribe(snapshot => {
 * 	console.log(snapshot);
 * });
 *
 * // Actors must be started by calling `actor.start()`, which will also start the actor system.
 * actor.start();
 *
 * // Actors can receive events
 * actor.send({ type: "someEvent" });
 *
 * // You can stop root actors by calling `actor.stop()`, which will also stop the actor system and all actors in that system.
 * actor.stop();
 * ```
 *
 * @param logic - The actor logic to create an actor from. For a state machine
 *   actor logic creator, see {@link createMachine}. Other actor logic creators
 *   include {@link fromCallback}, {@link fromEventObservable},
 *   {@link fromObservable}, {@link fromPromise}, and {@link fromTransition}.
 * @param options - Actor options
 */
export function createActor<TLogic extends AnyActorLogic>(
	logic: TLogic,
	...[options]: ConditionalRequired<
		[
			options?: ActorOptions<TLogic> & {
				[K in RequiredActorOptionsKeys<TLogic>]: unknown;
			},
		],
		IsNotNever<RequiredActorOptionsKeys<TLogic>>
	>
): Actor<TLogic> {
	return new Actor(logic, options);
}

/**
 * Creates a new Interpreter instance for the given machine with the provided
 * options, if any.
 *
 * @deprecated Use `createActor` instead
 * @alias
 */
export const interpret = createActor;

/**
 * @deprecated Use `Actor` instead.
 * @alias
 */
export type Interpreter = typeof Actor;
