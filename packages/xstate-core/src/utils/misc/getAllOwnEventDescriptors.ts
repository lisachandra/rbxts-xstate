import { Array } from "@rbxts/luau-polyfill";
import type { AnyMachineSnapshot } from "types";

export function getAllOwnEventDescriptors(snapshot: AnyMachineSnapshot) {
	return [...new Set([...Array.flatMap(snapshot._nodes, sn => sn.getOwnEvents())])];
}
