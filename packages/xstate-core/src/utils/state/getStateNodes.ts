import { Error, Object, Array } from "@rbxts/luau-polyfill";
import { AnyStateNode, StateValue } from "types";
import { getStateNode } from "./getStateNode";

/**
 * Returns the state nodes represented by the current state value.
 *
 * @param stateValue The state value or State instance
 */

export function getStateNodes(
	stateNode: AnyStateNode,
	stateValue: StateValue,
): Array<AnyStateNode> {
	if (typeIs(stateValue, "string")) {
		const childStateNode = stateNode.states[stateValue];
		if (!childStateNode) {
			throw new Error(`State '${stateValue}' does not exist on '${stateNode.id}'`);
		}
		return [stateNode, childStateNode];
	}

	const childStateKeys = Object.keys(stateValue);
	const childStateNodes: Array<AnyStateNode> = childStateKeys
		.map(subStateKey => getStateNode(stateNode, subStateKey as string))
		.filter(value => (value ? true : false));

	return Array.concat(
		[stateNode.machine.root, stateNode],
		childStateNodes,
		childStateKeys.reduce((allSubStateNodes, subStateKey) => {
			const subStateNode = getStateNode(stateNode, subStateKey as string);
			if (!subStateNode) {
				return allSubStateNodes;
			}
			const subStateNodes = getStateNodes(subStateNode, stateValue[subStateKey]!);

			return Array.concat(allSubStateNodes, subStateNodes);
		}, [] as Array<AnyStateNode>),
	);
}
