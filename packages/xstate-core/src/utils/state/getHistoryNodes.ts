import { Object } from "@rbxts/luau-polyfill";
import { AnyStateNode } from "types";

export function getHistoryNodes(stateNode: AnyStateNode): Array<AnyStateNode> {
	return Object.keys(stateNode.states)
		.map(key => stateNode.states[key])
		.filter(sn => sn.type === "history");
}
