import { AnyStateNode } from "types";
import { getChildren } from "./getChildren";

export function isInFinalState(stateNodeSet: Set<AnyStateNode>, stateNode: AnyStateNode): boolean {
	if (stateNode.type === "compound") {
		return getChildren(stateNode).some(s => s.type === "final" && stateNodeSet.has(s));
	}
	if (stateNode.type === "parallel") {
		return getChildren(stateNode).every(sn => isInFinalState(stateNodeSet, sn));
	}

	return stateNode.type === "final";
}
