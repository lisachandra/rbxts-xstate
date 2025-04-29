import { AnyStateMachine } from "types";

export function getAction(machine: AnyStateMachine, actionType: string) {
	return machine.implementations.actions[actionType];
}
