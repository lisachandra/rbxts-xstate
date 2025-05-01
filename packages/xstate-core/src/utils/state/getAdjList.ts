import { MachineContext, EventObject } from "types";
import { StateNodeIterable, AdjList } from "./types";
import type { StateNode } from "StateNode";

export function getAdjList<TContext extends MachineContext, TE extends EventObject>(
	stateNodes: StateNodeIterable<TContext, TE>,
): AdjList {
	const adjList: AdjList = new Map();

	for (const s of stateNodes as never as Set<StateNode<TContext, TE>>) {
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
