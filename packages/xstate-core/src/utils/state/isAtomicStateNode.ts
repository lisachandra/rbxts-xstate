import type { StateNode } from "StateNode";

export const isAtomicStateNode = (stateNode: StateNode<any, any>) =>
	stateNode.type === "atomic" || stateNode.type === "final";
