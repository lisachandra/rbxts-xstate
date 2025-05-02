import { Array, Object, Number } from "@rbxts/luau-polyfill";
import { raise, cancel } from "actions";
import { AnyStateNode, DelayedTransitionDefinition, MachineContext, EventObject } from "types";
import { createAfterEvent } from "utils/event/createAfterEvent";
import { formatTransition } from "./formatTransition";
import { toArray } from "utils/polyfill/array";

/** All delayed transitions from the config. */
export function getDelayedTransitions(
	stateNode: AnyStateNode,
): Array<DelayedTransitionDefinition<MachineContext, EventObject>> {
	const afterConfig = stateNode.config.after;
	if (!afterConfig) {
		return [];
	}

	const mutateEntryExit = (delay: string | number) => {
		const afterEvent = createAfterEvent(delay, stateNode.id);
		const eventType = afterEvent.type;

		stateNode.entry.push(
			raise(afterEvent, {
				id: eventType,
				delay,
			}),
		);
		stateNode.exit.push(cancel(eventType));
		return eventType;
	};

	const delayedTransitions = Array.flatMap(Object.keys(afterConfig), (delay: string) => {
		const configTransition = afterConfig[delay];
		const resolvedTransition = typeIs(configTransition, "string")
			? { target: configTransition }
			: configTransition;
		const resolvedDelay = Number.isNaN(tonumber(delay)) ? delay : (tonumber(delay) as number);
		const eventType = mutateEntryExit(resolvedDelay);
		return toArray(resolvedTransition).map(transition => ({
			...transition,
			event: eventType,
			delay: resolvedDelay,
		}));
	});
	return delayedTransitions.map(delayedTransition => {
		const { delay } = delayedTransition;
		return {
			...formatTransition(stateNode, delayedTransition.event, delayedTransition),
			delay,
		};
	});
}
