import { Error } from "@rbxts/luau-polyfill";
import {
	InspectionEvent,
	AnyEventObject,
	ActorSystemInfo,
	AnyActorRef,
	Observer,
	HomomorphicOmit,
	EventObject,
	Subscription,
} from "./types";
import { toObserver } from "utils/misc/toObserver";
import randomBase36String from "utils/polyfill/randomBase36String";

interface ScheduledEvent {
	id: string;
	event: EventObject;
	startedAt: number; // timestamp
	delay: number;
	source: AnyActorRef;
	target: AnyActorRef;
}

export interface Clock {
	setTimeout(fn: (...args: any[]) => void, timeout: number): any;
	clearTimeout(id: any): void;
}

interface Scheduler {
	schedule: (
		source: AnyActorRef,
		target: AnyActorRef,
		event: EventObject,
		delay: number,
		id: string | undefined,
	) => void;
	cancel: (source: AnyActorRef, id: string) => void;
	cancelAll: (actorRef: AnyActorRef) => void;
}

type ScheduledEventId = string & { __scheduledEventId: never };

function createScheduledEventId(actorRef: AnyActorRef, id: string): ScheduledEventId {
	return `${actorRef.sessionId}.${id}` as ScheduledEventId;
}

export interface ActorSystem<T extends ActorSystemInfo> {
	/** @internal */
	_bookId: () => string;
	/** @internal */
	_register: (sessionId: string, actorRef: AnyActorRef) => string;
	/** @internal */
	_unregister: (actorRef: AnyActorRef) => void;
	/** @internal */
	_set: <K extends keyof T["actors"]>(key: K, actorRef: T["actors"][K]) => void;
	get: <K extends keyof T["actors"]>(key: K) => T["actors"][K] | undefined;

	inspect: (
		observer: Observer<InspectionEvent> | ((inspectionEvent: InspectionEvent) => void),
	) => Subscription;
	/** @internal */
	_sendInspectionEvent: (event: HomomorphicOmit<InspectionEvent, "rootId">) => void;
	/** @internal */
	_relay: (source: AnyActorRef | undefined, target: AnyActorRef, event: AnyEventObject) => void;
	scheduler: Scheduler;
	getSnapshot: () => {
		_scheduledEvents: Record<string, ScheduledEvent>;
	};
	/** @internal */
	_snapshot: {
		_scheduledEvents: Record<ScheduledEventId, ScheduledEvent>;
	};
	start: () => void;
	_clock: Clock;
	_logger: (...args: any[]) => void;
}

export type AnyActorSystem = ActorSystem<any>;

let idCounter = 0;
export function createSystem<T extends ActorSystemInfo>(
	rootActor: AnyActorRef,
	options: {
		clock: Clock;
		logger: (...args: any[]) => void;
		snapshot?: unknown;
	},
): ActorSystem<T> {
	const children = new Map<string, AnyActorRef>();
	const keyedActors = new Map<keyof T["actors"], AnyActorRef | undefined>();
	const reverseKeyedActors = new WeakMap<AnyActorRef, keyof T["actors"]>();
	const inspectionObservers = new Set<Observer<InspectionEvent>>();
	const timerMap: { [id: ScheduledEventId]: number } = {};
	const { clock, logger } = options;

	const scheduler: Scheduler = {
		schedule: (source, target, event, delay, id = randomBase36String()) => {
			const scheduledEvent: ScheduledEvent = {
				source,
				target,
				event,
				delay,
				id,
				startedAt: os.clock(),
			};
			const scheduledEventId = createScheduledEventId(source, id);
			system._snapshot._scheduledEvents[scheduledEventId] = scheduledEvent;

			const timeout = clock.setTimeout(() => {
				delete timerMap[scheduledEventId];
				delete system._snapshot._scheduledEvents[scheduledEventId];

				system._relay(source, target, event);
			}, delay);

			timerMap[scheduledEventId] = timeout;
		},
		cancel: (source, id: string) => {
			const scheduledEventId = createScheduledEventId(source, id);
			const timeout = timerMap[scheduledEventId];

			delete timerMap[scheduledEventId];
			delete system._snapshot._scheduledEvents[scheduledEventId];

			if (timeout !== undefined) {
				clock.clearTimeout(timeout);
			}
		},
		cancelAll: actorRef => {
			// eslint-disable-next-line roblox-ts/no-array-pairs
			for (const [_, scheduledEvent] of pairs(system._snapshot._scheduledEvents)) {
				if (scheduledEvent.source === actorRef) {
					scheduler.cancel(actorRef, scheduledEvent.id);
				}
			}
		},
	};
	const sendInspectionEvent = (event: InspectionEvent) => {
		if (!inspectionObservers.size()) {
			return;
		}
		const resolvedInspectionEvent: InspectionEvent = {
			...event,
			rootId: rootActor.sessionId,
		};
		inspectionObservers.forEach(observer => observer.next?.(resolvedInspectionEvent));
	};

	const system: ActorSystem<T> = {
		_snapshot: {
			_scheduledEvents:
				((options?.snapshot && options.snapshot["scheduler" as never]) as never) ?? {},
		},
		_bookId: () => `x:${idCounter++}`,
		_register: (sessionId, actorRef) => {
			children.set(sessionId, actorRef);
			return sessionId;
		},
		_unregister: actorRef => {
			children.delete(actorRef.sessionId);
			const systemId = reverseKeyedActors.get(actorRef);

			if (systemId !== undefined) {
				keyedActors.delete(systemId);
				reverseKeyedActors.delete(actorRef);
			}
		},
		get: systemId => {
			return keyedActors.get(systemId) as T["actors"][any];
		},
		_set: (systemId, actorRef) => {
			const existing = keyedActors.get(systemId);
			if (existing && existing !== actorRef) {
				throw new Error(`Actor with system ID '${systemId as string}' already exists.`);
			}

			keyedActors.set(systemId, actorRef);
			reverseKeyedActors.set(actorRef, systemId);
		},
		inspect: observerOrFn => {
			const observer = toObserver(observerOrFn);
			inspectionObservers.add(observer);

			return {
				unsubscribe() {
					inspectionObservers.delete(observer);
				},
			};
		},
		_sendInspectionEvent: sendInspectionEvent as never,
		_relay: (source, target, event) => {
			system._sendInspectionEvent({
				type: "@xstate.event",
				sourceRef: source,
				actorRef: target,
				event,
			});

			target._send(event);
		},
		scheduler,
		getSnapshot: () => {
			return {
				_scheduledEvents: { ...system._snapshot._scheduledEvents },
			};
		},
		start: () => {
			const scheduledEvents = system._snapshot._scheduledEvents;
			system._snapshot._scheduledEvents = {};
			// eslint-disable-next-line roblox-ts/no-array-pairs
			for (const [_, { source, target, event, delay, id }] of pairs(scheduledEvents)) {
				scheduler.schedule(source, target, event, delay, id);
			}
		},
		_clock: clock,
		_logger: logger,
	};

	return system;
}
