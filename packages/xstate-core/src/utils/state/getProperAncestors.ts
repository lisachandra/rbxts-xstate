import { AnyStateNode } from "types";

export function getProperAncestors(
	stateNode: AnyStateNode,
	toStateNode: AnyStateNode | undefined,
): Array<typeof stateNode> {
	const ancestors: Array<typeof stateNode> = [];

	if (toStateNode === stateNode) {
		return ancestors;
	}

	// add all ancestors
	let m = stateNode.parent;
	while (m && m !== toStateNode) {
		ancestors.push(m);
		m = m.parent;
	}

	return ancestors;
}
