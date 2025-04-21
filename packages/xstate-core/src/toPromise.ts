import { AnyActorRef, AnyObject, OutputFrom } from "./types";

/**
 * Returns a promise that resolves to the `output` of the actor when it is done.
 *
 * @example
 *
 * ```ts
 * const machine = createMachine({
 * 	// ...
 * 	output: {
 * 		count: 42,
 * 	},
 * });
 *
 * const actor = createActor(machine);
 *
 * actor.start();
 *
 * const output = await toPromise(actor);
 *
 * console.log(output);
 * // logs { count: 42 }
 * ```
 */
export function toPromise<T extends AnyActorRef>(actor: T): Promise<OutputFrom<T>> {
	return new Promise((resolve, reject) => {
		actor.subscribe({
			complete: () => {
				resolve((actor.getSnapshot() as AnyObject).output as never);
			},
			error: reject,
		});
	});
}
