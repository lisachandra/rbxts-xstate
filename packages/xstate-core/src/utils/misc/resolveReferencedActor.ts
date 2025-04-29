import { stringMatch } from "utils/polyfill/stringMatch";
import type { AnyStateMachine, InvokeConfig } from "../../types";
import { Array } from "@rbxts/luau-polyfill";
import RegExp from "@rbxts/regexp";

export function resolveReferencedActor(machine: AnyStateMachine, src: string) {
	const match = stringMatch(src, RegExp("^xstate\\.invoke\\.(\\d+)\\.(.*)"));
	if (!match[0]) {
		return machine.implementations.actors[src];
	}
	const [, indexStr, nodeId] = match;
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
