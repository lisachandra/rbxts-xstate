import { AnyStateNode } from "types";
import { getProperAncestors } from "./getProperAncestors";
import { getInitialStateNodes } from "./getInitialStateNodes";

export function getInitialStateNodesWithTheirAncestors(stateNode: AnyStateNode) {
	const states = getInitialStateNodes(stateNode);
	for (const initialState of states) {
		for (const ancestor of getProperAncestors(initialState, stateNode)) {
			states.add(ancestor);
		}
	}
	return states;
}
