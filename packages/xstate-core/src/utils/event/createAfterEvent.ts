/**
 * Returns an event that represents an implicit event that is sent after the
 * specified `delay`.
 *
 * @param delayRef The delay in milliseconds
 * @param id The state node ID where this event is handled
 */
export function createAfterEvent(delayRef: number | string, id: string) {
	return { type: `xstate.after.${delayRef}.${id}` } as const;
}
