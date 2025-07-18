import {
	Actor,
	ActorOptions,
	AnyStateMachine,
	StateFrom,
	type ConditionalRequired,
	type IsNotNever,
	type RequiredActorOptionsKeys,
} from "@rbxts/xstate";
import { useActor } from "./useActor";

/** @alias useActor */
export function useMachine<TMachine extends AnyStateMachine>(
	machine: TMachine,
	...[options]: ConditionalRequired<
		[
			options?: ActorOptions<TMachine> & {
				[K in RequiredActorOptionsKeys<TMachine>]: unknown;
			},
		],
		IsNotNever<RequiredActorOptionsKeys<TMachine>>
	>
): [StateFrom<TMachine>, Actor<TMachine>["send"], Actor<TMachine>] {
	return useActor(machine, options);
}
