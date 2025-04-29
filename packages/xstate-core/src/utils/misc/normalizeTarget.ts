import { TARGETLESS_KEY } from "constants";
import type { StateNode } from "StateNode";
import type { MachineContext, EventObject, SingleOrArray } from "types";
import { toArray } from "../polyfill/array";

export function normalizeTarget<TContext extends MachineContext, TEvent extends EventObject>(
	target: SingleOrArray<string | StateNode<TContext, TEvent>> | undefined,
): ReadonlyArray<string | StateNode<TContext, TEvent>> | undefined {
	if (target === undefined || target === TARGETLESS_KEY) {
		return undefined;
	}
	return toArray(target);
}
