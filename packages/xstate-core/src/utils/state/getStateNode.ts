import { Error } from "@rbxts/luau-polyfill";
import { AnyStateNode } from "types";
import { isStateId } from "./isStateId";

/** Returns the child state node from its relative `stateKey`, or throws. */
export function getStateNode(stateNode: AnyStateNode, stateKey: string): AnyStateNode {
	if (isStateId(stateKey)) {
		return stateNode.machine.getStateNodeById(stateKey);
	}
	if (!stateNode.states) {
		throw new Error(
			`Unable to retrieve child state '${stateKey}' from '${stateNode.id}'; no child states exist.`,
		);
	}
	const result = stateNode.states[stateKey];
	if (!result) {
		throw new Error(`Child state '${stateKey}' does not exist on '${stateNode.id}'`);
	}
	return result;
}
