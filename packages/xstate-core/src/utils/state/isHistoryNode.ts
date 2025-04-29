import { AnyStateNode } from "types";

export function isHistoryNode(
	stateNode: AnyStateNode,
): stateNode is AnyStateNode & { type: "history" } {
	return stateNode.type === "history";
}
