import { Array } from "@rbxts/luau-polyfill";
import { AnyStateNode } from "types";
import { toStatePath } from "utils/misc/toStatePath";
import { getStateNode } from "./getStateNode";
import { isStateId } from "./isStateId";

/**
 * Returns the relative state node from the given `statePath`, or throws.
 *
 * @param statePath The string or string array relative path to the state node.
 */
export function getStateNodeByPath(
	stateNode: AnyStateNode,
	statePath: string | string[],
): AnyStateNode {
	if (typeIs(statePath, "string") && isStateId(statePath)) {
		try {
			return stateNode.machine.getStateNodeById(statePath);
		} catch {
			// try individual paths
			// throw e;
		}
	}
	const arrayStatePath = Array.slice(toStatePath(statePath));
	let currentStateNode: AnyStateNode = stateNode;
	while (arrayStatePath.size()) {
		const key = arrayStatePath.shift()!;
		if (!key.size()) {
			break;
		}
		currentStateNode = getStateNode(currentStateNode, key);
	}
	return currentStateNode;
}
