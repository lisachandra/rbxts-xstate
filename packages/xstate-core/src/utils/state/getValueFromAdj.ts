import { AnyStateNode, StateValue } from "types";
import { isAtomicStateNode } from "./isAtomicStateNode";
import { AdjList } from "./types";

export function getValueFromAdj(baseNode: AnyStateNode, adjList: AdjList): StateValue {
	const childStateNodes = adjList.get(baseNode);

	if (!childStateNodes) {
		return {}; // todo: fix?
	}

	if (baseNode.type === "compound") {
		const childStateNode = childStateNodes[0];
		if (childStateNode) {
			if (isAtomicStateNode(childStateNode)) {
				return childStateNode.key;
			}
		} else {
			return {};
		}
	}

	const stateValue: StateValue = {};
	for (const childStateNode of childStateNodes) {
		stateValue[childStateNode.key] = getValueFromAdj(childStateNode, adjList);
	}

	return stateValue;
}
