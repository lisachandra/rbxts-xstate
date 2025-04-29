import { Object } from "@rbxts/luau-polyfill";
import type { StateNode } from "StateNode";
import { MachineContext, EventObject } from "types";

export function getChildren<TContext extends MachineContext, TE extends EventObject>(
	stateNode: StateNode<TContext, TE>,
): Array<StateNode<TContext, TE>> {
	return Object.values(stateNode.states).filter(sn => sn.type !== "history");
}
