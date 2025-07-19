import type { AnyStateMachine, InvokeConfig } from "../../types";
import { Array } from "@rbxts/luau-polyfill";
import RegExp from "@rbxts/regexp";
import { tonumber } from "utils/polyfill/tonumber";

export function resolveReferencedActor(machine: AnyStateMachine, src: string) {
	const match = RegExp("^xstate\\.invoke\\.(\\d+)\\.(.*)").exec(src);
	const [, indexStr, nodeId] = match ?? [];
	if (!indexStr || !nodeId) {
		return machine.implementations.actors[src];
	}

	const node = machine.getStateNodeById(nodeId);
	const invokeConfig = node.config.invoke!;
	return (
		(Array.isArray(invokeConfig)
			? invokeConfig[tonumber(indexStr)!]
			: invokeConfig) as InvokeConfig<
			any,
			any,
			any,
			any,
			any,
			any,
			any, // TEmitted
			any // TMeta
		>
	).src;
}
