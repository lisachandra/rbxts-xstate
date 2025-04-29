import { XSTATE_INIT } from "constants";

export function createInitEvent(input: unknown) {
	return { type: XSTATE_INIT, input } as const;
}
