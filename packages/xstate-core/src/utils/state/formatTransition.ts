import { Error } from "@rbxts/luau-polyfill";
import isDevelopment from "utils/polyfill/isDevelopment";
import { AnyStateNode, AnyTransitionConfig, AnyTransitionDefinition } from "types";
import { resolveTarget } from "./resolveTarget";
import { toArray } from "utils/polyfill/array";
import { normalizeTarget } from "utils/misc/normalizeTarget";

export function formatTransition(
	stateNode: AnyStateNode,
	descriptor: string,
	transitionConfig: AnyTransitionConfig,
): AnyTransitionDefinition {
	const normalizedTarget = normalizeTarget(transitionConfig.target);
	const reenter = transitionConfig.reenter ?? false;
	const target = resolveTarget(stateNode, normalizedTarget);

	// TODO: should this be part of a lint rule instead?
	if (isDevelopment && transitionConfig["cond" as never]) {
		throw new Error(
			`State "${stateNode.id}" has declared \`cond\` for one of its transitions. This property has been renamed to \`guard\`. Please update your code.`,
		);
	}

	const transition = {
		...transitionConfig,
		actions: toArray(transitionConfig.actions),
		guard: transitionConfig.guard as never,
		target,
		source: stateNode,
		reenter,
		eventType: descriptor,
		toJSON: () => ({
			...transition,
			source: `#${stateNode.id}`,
			target: target ? target.map(t => `#${t.id}`) : undefined,
		}),
	};

	return transition;
}
