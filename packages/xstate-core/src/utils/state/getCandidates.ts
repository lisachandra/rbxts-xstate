import isDevelopment from "../polyfill/isDevelopment";
import type { StateNode } from "../../StateNode";
import { WILDCARD } from "../../constants";
import { EventObject, TransitionDefinition } from "../../types";
import { Array, Object, String } from "@rbxts/luau-polyfill";
import RegExp from "@rbxts/regexp";

export function getCandidates<TEvent extends EventObject>(
	stateNode: StateNode<any, TEvent>,
	receivedEventType: TEvent["type"],
): Array<TransitionDefinition<any, TEvent>> {
	const candidates =
		stateNode.transitions.get(receivedEventType) ||
		Array.flatMap(
			Array.sort(
				Object.keys(stateNode.transitions).filter(eventDescriptor => {
					// check if transition is a wildcard transition,
					// which matches any non-transient events
					if (eventDescriptor === WILDCARD) {
						return true;
					}

					if (!String.endsWith(eventDescriptor, ".*")) {
						return false;
					}

					if (isDevelopment && RegExp(".*\\*.+").test(eventDescriptor)) {
						warn(
							`Wildcards can only be the last token of an event descriptor (e.g., "event.*") or the entire event descriptor ("*"). Check the "${eventDescriptor}" event.`,
						);
					}

					const partialEventTokens = eventDescriptor.split(".");
					const eventTokens = receivedEventType.split(".");

					for (let tokenIndex = 0; tokenIndex < partialEventTokens.size(); tokenIndex++) {
						const partialEventToken = partialEventTokens[tokenIndex];
						const eventToken = eventTokens[tokenIndex];

						if (partialEventToken === "*") {
							const isLastToken = tokenIndex === partialEventTokens.size() - 1;

							if (isDevelopment && !isLastToken) {
								warn(
									`Infix wildcards in transition events are not allowed. Check the "${eventDescriptor}" transition.`,
								);
							}

							return isLastToken;
						}

						if (partialEventToken !== eventToken) {
							return false;
						}
					}

					return true;
				}),
				(a, b) => b.size() - a.size(),
			),
			key => stateNode.transitions.get(key)!,
		);

	return candidates;
}
