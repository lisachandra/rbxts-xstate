import type { StateNode } from "StateNode";

export function areStateNodeCollectionsEqual(
	prevStateNodes: StateNode[],
	nextStateNodeSet: Set<StateNode>,
) {
	if (prevStateNodes.size() !== nextStateNodeSet.size()) {
		return false;
	}
	for (const node of prevStateNodes) {
		if (!nextStateNodeSet.has(node)) {
			return false;
		}
	}
	return true;
}
