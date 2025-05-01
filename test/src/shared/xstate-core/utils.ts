import { expect, it } from "@rbxts/jest-globals";
import { Error, Object, String } from "@rbxts/luau-polyfill";
import { HttpService } from "@rbxts/services";
import {
	AnyMachineSnapshot,
	AnyStateMachine,
	getNextSnapshot,
	matchesState,
	Observer,
	StateNode,
	StateValue,
	Subscribable,
	Subscription,
} from "@rbxts/xstate";
import { symbolObservable } from "@rbxts/xstate/out/utils/polyfill/symbolObservable";
import { indexString } from "@rbxts/xstate/out/utils/polyfill/indexString";
import { callable } from "@rbxts/xstate/out/utils/polyfill/callable";

const resolveSerializedStateValue = (machine: AnyStateMachine, serialized: string) =>
	indexString(serialized, 0 + 1) === "{"
		? machine.resolveState({
				value: HttpService.JSONDecode(serialized) as StateValue,
				context: {},
			})
		: machine.resolveState({ value: serialized, context: {} });

export function testMultiTransition(
	machine: AnyStateMachine,
	fromState: string,
	eventTypes: string,
): AnyMachineSnapshot {
	const computeNext = (state: AnyMachineSnapshot | string, eventType: string) => {
		if (typeIs(state, "string")) {
			state = resolveSerializedStateValue(machine, state);
		}
		const nextState = getNextSnapshot(machine, state, {
			type: eventType,
		});
		return nextState;
	};

	const restEvents = String.split(eventTypes, ",%s?");
	const firstEventType = restEvents.remove(0)!;

	const resultState = restEvents.reduce<AnyMachineSnapshot>(
		computeNext,
		computeNext(fromState, firstEventType),
	);

	return resultState;
}

export function testAll(
	machine: AnyStateMachine,
	expected: Record<string, Record<string, StateValue | undefined>>,
): void {
	Object.keys(expected).forEach(fromState => {
		Object.keys(expected[fromState]).forEach(eventTypes => {
			const toState = expected[fromState][eventTypes];

			it(`should go from ${fromState} to ${HttpService.JSONEncode(toState)} on ${eventTypes}`, () => {
				const resultState = testMultiTransition(machine, fromState, eventTypes);

				if (toState === undefined) {
					// undefined means that the state didn't transition
					expect(resultState.value).toEqual(
						resolveSerializedStateValue(machine, fromState).value,
					);
				} else if (typeIs(toState, "string")) {
					expect(matchesState(toState, resultState.value)).toBeTruthy();
				} else {
					expect(resultState.value).toEqual(toState);
				}
			});
		});
	});
}

const seen = new WeakSet<AnyStateMachine>();

export function trackEntries(machine: AnyStateMachine) {
	if (seen.has(machine)) {
		throw new Error(`This helper can't accept the same machine more than once`);
	}
	seen.add(machine);

	let logs: string[] = [];

	function addTrackingActions(state: StateNode<any, any>, stateDescription: string) {
		function __testEntryTracker() {
			logs.push(`enter: ${stateDescription}`);
		}

		function __testExitTracker() {
			logs.push(`exit: ${stateDescription}`);
		}

		state.entry.unshift(callable(__testEntryTracker));
		state.exit.unshift(callable(__testExitTracker));
	}

	function addTrackingActionsRecursively(state: StateNode<any, any>) {
		for (const child of Object.values(state.states)) {
			addTrackingActions(child, child.path.join("."));
			addTrackingActionsRecursively(child);
		}
	}

	addTrackingActions(machine.root, `__root__`);
	addTrackingActionsRecursively(machine.root);

	return () => {
		const flushed = logs;
		logs = [];
		return flushed;
	};
}
// Simple stub to replace RxJS BehaviorSubject for testing purposes
// Implements the Subscribable interface from @rbxts/xstate
export class BehaviorSubjectStub<T> implements Subscribable<T> {
	private _value: T;
	private _subscribers: Array<Observer<T>> = [];

	[symbolObservable] = () => this;

	constructor(initialValue: T) {
		this._value = initialValue;
	}

	// Implements the Subscribable.subscribe method
	// Supports both Observer object and individual callback signatures
	subscribe(
		observerOrNext: Observer<T> | ((value: T) => void),
		err: (err: any) => void = () => {},
		complete: () => void = () => {},
	): Subscription {
		let observer: Observer<T>;

		// Determine if the first argument is an Observer object or the next callback
		if (typeIs(observerOrNext, "function")) {
			observer = { next: observerOrNext, error: err, complete };
		} else {
			observer = observerOrNext;
		}

		this._subscribers.push(observer);

		// Immediately emit the current value to the new subscriber if they have a 'next' method
		if (observer.next) {
			observer.next(this._value);
		}

		// Return a Subscription object
		const subscribers = this._subscribers;
		return {
			unsubscribe() {
				const index = subscribers.indexOf(observer);
				if (index > -1) {
					subscribers.remove(index);
				}
			},
		};
	}

	// Mimics the next method to push new values to subscribers
	next(value: T) {
		this._value = value;
		// Notify all current subscribers who have a 'next' method
		for (const observer of this._subscribers) {
			if (observer.next) {
				observer.next(value);
			}
		}
	}

	// Method to get the current value (useful for debugging or other tests)
	getValue(): T {
		return this._value;
	}
}
