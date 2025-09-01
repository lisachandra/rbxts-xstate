import { Object } from "@rbxts/luau-polyfill";
import type { StateNode } from "StateNode";
import { MachineContext, EventObject, AnyStateNode } from "types";

const sortByOrder = (node: AnyStateNode, a: string, b: string) => {
	const { _order_: aOrder } = node.config.states![a] as { _order_?: number };
	const { _order_: bOrder } = node.config.states![b] as { _order_?: number };

	return (aOrder ?? 0) < (bOrder ?? 0);
};

export function getChildren<TContext extends MachineContext, TE extends EventObject>(
	stateNode: StateNode<TContext, TE>,
): Array<StateNode<TContext, TE>> {
	return Object.keys(stateNode.states)
		.sort((a, b) => sortByOrder(stateNode, a, b))
		.map(key => stateNode.states[key])
		.filter(sn => sn.type !== "history");
}
