import { AnyStateNode } from "types";

export function isDescendant(childStateNode: AnyStateNode, parentStateNode: AnyStateNode): boolean {
	let marker = childStateNode;
	while (marker.parent && marker.parent !== parentStateNode) {
		marker = marker.parent;
	}

	return marker.parent === parentStateNode;
}
