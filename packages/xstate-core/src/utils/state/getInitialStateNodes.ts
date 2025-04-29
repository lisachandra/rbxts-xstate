import { AnyStateNode } from "types";
import { getChildren } from "./getChildren";

export function getInitialStateNodes(stateNode: AnyStateNode) {
	const set = new Set<AnyStateNode>();

	function iter(descStateNode: AnyStateNode): void {
		if (set.has(descStateNode)) {
			return;
		}
		set.add(descStateNode);
		if (descStateNode.type === "compound") {
			iter(descStateNode.getInitial().target[0]);
		} else if (descStateNode.type === "parallel") {
			for (const child of getChildren(descStateNode)) {
				iter(child);
			}
		}
	}

	iter(stateNode);

	return set;
}
