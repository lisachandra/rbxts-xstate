import { String, Error } from "@rbxts/luau-polyfill";
import { STATE_DELIMITER } from "constants";
import { AnyStateNode } from "types";
import { indexString } from "utils/polyfill/indexString";
import { isStateId } from "./isStateId";
import { getStateNodeByPath } from "./getStateNodeByPath";

export function resolveTarget(
	stateNode: AnyStateNode,
	targets: ReadonlyArray<string | AnyStateNode> | undefined,
): ReadonlyArray<AnyStateNode> | undefined {
	if (targets === undefined) {
		// an undefined target signals that the state node should not transition from that state when receiving that event
		return undefined;
	}
	return targets.map(target => {
		if (!typeIs(target, "string")) {
			return target;
		}
		if (isStateId(target)) {
			return stateNode.machine.getStateNodeById(target);
		}

		const isInternalTarget = indexString(target, 0 + 1) === STATE_DELIMITER;
		// If internal target is defined on machine,
		// do not include machine key on target
		if (isInternalTarget && !stateNode.parent) {
			return getStateNodeByPath(stateNode, String.slice(target, 1 + 1));
		}
		const resolvedTarget = isInternalTarget ? stateNode.key + target : target;
		if (stateNode.parent) {
			try {
				const targetStateNode = getStateNodeByPath(stateNode.parent, resolvedTarget);
				return targetStateNode;
			} catch (err: any) {
				throw new Error(
					`Invalid transition definition for state node '${stateNode.id}':\n${err}`,
				);
			}
		} else {
			throw new Error(
				`Invalid target: "${target}" is not a valid target from the root node. Did you mean ".${target}"?`,
			);
		}
	});
}
