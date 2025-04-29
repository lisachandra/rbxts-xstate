import type { AnyStateNode, StateValue } from "../../types";
import { type AnyStateNodeIterable } from "./types";
import { getAdjList } from "./getAdjList";
import { getValueFromAdj } from "./getValueFromAdj";
import { getAllStateNodes } from "./getAllStateNodes";

export function getStateValue(
	rootNode: AnyStateNode,
	stateNodes: AnyStateNodeIterable,
): StateValue {
	const config = getAllStateNodes(stateNodes);
	return getValueFromAdj(rootNode, getAdjList(config));
}
