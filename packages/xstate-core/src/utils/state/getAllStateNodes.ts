import { AnyStateNode } from "types";
import { getInitialStateNodesWithTheirAncestors } from "./getInitialStateNodesWithTheirAncestors";
import { getChildren } from "./getChildren";
import { getAdjList } from "./getAdjList";

export function getAllStateNodes(stateNodes: Iterable<AnyStateNode>): Set<AnyStateNode> {
	const nodeSet = new Set(stateNodes as AnyStateNode[]);

	const adjList = getAdjList(nodeSet);

	// add descendants
	for (const s of nodeSet) {
		// if previously active, add existing child nodes
		if (s.type === "compound" && (!adjList.get(s) || !adjList.get(s)!.size())) {
			getInitialStateNodesWithTheirAncestors(s).forEach(sn => nodeSet.add(sn));
		} else {
			if (s.type === "parallel") {
				for (const child of getChildren(s)) {
					if (child.type === "history") {
						continue;
					}

					if (!nodeSet.has(child)) {
						const initialStates = getInitialStateNodesWithTheirAncestors(child);
						for (const initialStateNode of initialStates) {
							nodeSet.add(initialStateNode);
						}
					}
				}
			}
		}
	}

	// add all ancestors
	for (const s of nodeSet) {
		let m = s.parent;

		while (m) {
			nodeSet.add(m);
			m = m.parent;
		}
	}

	return nodeSet;
}
