import { Array, Error, Object } from "@rbxts/luau-polyfill";
import { AnyObject, AnyStateMachine, AnyStateNode } from "../index";

const validateState = (state: AnyStateNode) => {
	if (state.getInvoke().size() > 0) {
		throw new Error("Invocations on test machines are not supported");
	}
	if (state.getAfter().size() > 0) {
		throw new Error("After events on test machines are not supported");
	}
	// TODO: this doesn't account for always transitions
	[
		...state.entry,
		...state.exit,
		Array.flatMap(Object.values(state.transitions), t => Array.flatMap(t, t => t.actions)),
	].forEach(action => {
		// TODO: this doesn't check referenced actions, only the inline ones
		if (
			typeIs(action, "table") &&
			"resolve" in action &&
			typeIs((action as AnyObject).delay, "number")
		) {
			throw new Error("Delayed actions on test machines are not supported");
		}
	});

	for (const child of Object.values(state.states)) {
		validateState(child);
	}
};

export const validateMachine = (machine: AnyStateMachine) => {
	validateState(machine.root);
};
