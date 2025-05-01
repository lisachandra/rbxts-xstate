import { AnyStateNode, StateValue } from "types";
import { getAllStateNodes } from "./getAllStateNodes";
import { getStateNodes } from "./getStateNodes";
import { getStateValue } from "./getStateValue";

/**
 * Resolves a partial state value with its full representation in the state
 * node's machine.
 *
 * @param stateValue The partial state value to resolve.
 */
export function resolveStateValue(rootNode: AnyStateNode, stateValue: StateValue): StateValue {
	const allStateNodes = getAllStateNodes(getStateNodes(rootNode, stateValue));
	return getStateValue(rootNode, [...allStateNodes]);
}
