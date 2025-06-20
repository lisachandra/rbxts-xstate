import { clearTimeout, Error, setTimeout } from "@rbxts/luau-polyfill";
import isDevelopment from "../polyfill/isDevelopment";
import { AnyActorRef, SnapshotFrom, Subscription } from "../../types";
import type { AbortSignal } from "@rbxts/whatwg-abort-controller";

interface WaitForOptions {
	/**
	 * How long to wait before rejecting, if no emitted state satisfies the
	 * predicate.
	 *
	 * @defaultValue math.huge
	 */
	timeout: number;

	/** A signal which stops waiting when aborted. */
	signal?: AbortSignal;
}

const defaultWaitForOptions: WaitForOptions = {
	timeout: math.huge, // much more than 10 seconds
};

/**
 * Subscribes to an actor ref and waits for its emitted value to satisfy a
 * predicate, and then resolves with that value. Will throw if the desired state
 * is not reached after an optional timeout. (defaults to math.huge).
 *
 * @example
 *
 * ```js
 * const state = await waitFor(someService, state => {
 * 	return state.hasTag("loaded");
 * });
 *
 * state.hasTag("loaded"); // true
 * ```
 *
 * @param actorRef The actor ref to subscribe to
 * @param predicate Determines if a value matches the condition to wait for
 * @param options
 * @returns A promise that eventually resolves to the emitted value that matches
 *   the condition
 */
export function waitFor<TActorRef extends AnyActorRef>(
	actorRef: TActorRef,
	predicate: (emitted: SnapshotFrom<TActorRef>) => boolean,
	options?: Partial<WaitForOptions>,
): Promise<SnapshotFrom<TActorRef>> {
	const resolvedOptions: WaitForOptions = {
		...defaultWaitForOptions,
		...options,
	};
	return new Promise((res, rej) => {
		const { signal } = resolvedOptions;
		if (signal?.getAborted()) {
			rej();
			return;
		}
		let done = false;
		if (isDevelopment && resolvedOptions.timeout < 0) {
			error(
				"`timeout` passed to `waitFor` is negative and it will reject its internal promise immediately.",
			);
		}
		const handle =
			resolvedOptions.timeout === math.huge
				? undefined
				: setTimeout(() => {
						dispose();
						rej(new Error(`Timeout of ${resolvedOptions.timeout} ms exceeded`));
					}, resolvedOptions.timeout);

		const dispose = () => {
			if (handle !== undefined) {
				clearTimeout(handle);
			}

			done = true;
			sub?.unsubscribe();
			if (abortListener) {
				signal!.removeEventListener("abort", abortListener);
			}
		};

		function checkEmitted(emitted: SnapshotFrom<TActorRef>) {
			if (predicate(emitted)) {
				dispose();
				res(emitted);
			}
		}

		/**
		 * If the `signal` option is provided, this will be the listener for its
		 * `abort` event
		 */
		let abortListener: () => void | undefined;
		// eslint-disable-next-line prefer-const
		let sub: Subscription | undefined; // avoid TDZ when disposing synchronously

		// See if the current snapshot already matches the predicate
		checkEmitted(actorRef.getSnapshot());
		if (done) {
			return;
		}

		// only define the `abortListener` if the `signal` option is provided
		if (signal) {
			abortListener = () => {
				dispose();
				// XState does not "own" the signal, so we should reject with its reason (if any)
				rej();
			};
			signal.addEventListener("abort", abortListener);
		}

		sub = actorRef.subscribe({
			next: checkEmitted,
			error: err => {
				dispose();
				rej(err);
			},
			complete: () => {
				dispose();
				rej(new Error(`Actor terminated without satisfying predicate`));
			},
		});
		if (done) {
			sub.unsubscribe();
		}
	});
}
