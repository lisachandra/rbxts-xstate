import { AnyEventObject, AnyMachineSnapshot, AnyTransitionDefinition } from "types";

export function selectTransitions(
	event: AnyEventObject,
	nextState: AnyMachineSnapshot,
): AnyTransitionDefinition[] {
	return nextState.machine.getTransitionData(nextState as never, event);
}
