import { createActor } from "./createActor";
import {
	ActorScope,
	AnyActorLogic,
	AnyActorScope,
	AnyObject,
	EmittedFrom,
	EventFromLogic,
	InputFrom,
	SnapshotFrom,
} from "./types";

/** @internal */
export function createInertActorScope<T extends AnyActorLogic>(actorLogic: T): AnyActorScope {
	const itself = createActor(actorLogic as AnyActorLogic);
	const inertActorScope: ActorScope<SnapshotFrom<T>, EventFromLogic<T>, any, EmittedFrom<T>> = {
		self: itself,
		defer: () => {},
		id: "",
		logger: () => {},
		sessionId: "",
		stopChild: () => {},
		system: itself.system,
		emit: () => {},
		actionExecutor: () => {},
	};

	return inertActorScope;
}

/** @deprecated Use `initialTransition(…)` instead. */
export function getInitialSnapshot<T extends AnyActorLogic>(
	actorLogic: T,
	...[input]: undefined extends InputFrom<T> ? [input?: InputFrom<T>] : [input: InputFrom<T>]
): SnapshotFrom<T> {
	const actorScope = createInertActorScope(actorLogic);
	return actorLogic.getInitialSnapshot(actorScope, input);
}

/**
 * Determines the next snapshot for the given `actorLogic` based on the given
 * `snapshot` and `event`.
 *
 * If the `snapshot` is `undefined`, the initial snapshot of the `actorLogic` is
 * used.
 *
 * @deprecated Use `transition(…)` instead.
 * @example
 *
 * ```ts
 * import { getNextSnapshot } from "xstate";
 * import { trafficLightMachine } from "./trafficLightMachine";
 *
 * const nextSnapshot = getNextSnapshot(
 * 	trafficLightMachine, // actor logic
 * 	undefined, // snapshot (or initial state if undefined)
 * 	{ type: "TIMER" },
 * ); // event object
 *
 * console.log(nextSnapshot.value);
 * // => 'yellow'
 *
 * const nextSnapshot2 = getNextSnapshot(
 * 	trafficLightMachine, // actor logic
 * 	nextSnapshot, // snapshot
 * 	{ type: "TIMER" },
 * ); // event object
 *
 * console.log(nextSnapshot2.value);
 * // =>'red'
 * ```
 */
export function getNextSnapshot<T extends AnyActorLogic>(
	actorLogic: T,
	snapshot: SnapshotFrom<T>,
	event: EventFromLogic<T>,
): SnapshotFrom<T> {
	const inertActorScope = createInertActorScope(actorLogic);
	(inertActorScope.self as never as AnyObject)._snapshot = snapshot;
	return actorLogic.transition(snapshot, event, inertActorScope);
}
