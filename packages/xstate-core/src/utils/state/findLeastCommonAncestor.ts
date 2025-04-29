import { AnyStateNode } from "types";
import { getProperAncestors } from "./getProperAncestors";
import { isDescendant } from "./isDescendant";

export function findLeastCommonAncestor(stateNodes: Array<AnyStateNode>): AnyStateNode | undefined {
	const tail = [...stateNodes];
	const head = tail.remove(0)!;
	for (const ancestor of getProperAncestors(head, undefined)) {
		if (tail.every(sn => isDescendant(sn, ancestor))) {
			return ancestor;
		}
	}
}
