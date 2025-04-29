import { MachineContext, EventObject, AnyStateNode } from "types";
import { StateNodeIterable, AdjList } from "./types";
import { is } from "utils/polyfill/is";

export function getAdjList<TContext extends MachineContext, TE extends EventObject>(
	stateNodes: StateNodeIterable<TContext, TE>,
): AdjList {
	const adjList: AdjList = new Map();

	for (const [_, s] of pairs(stateNodes)) {
		if (!is<AnyStateNode>(s)) {
			continue;
		}

		if (!adjList.has(s)) {
			adjList.set(s, []);
		}

		if (s.parent) {
			if (!adjList.has(s.parent)) {
				adjList.set(s.parent, []);
			}

			adjList.get(s.parent)!.push(s);
		}
	}

	return adjList;
}
