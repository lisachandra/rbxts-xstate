import { useCallback } from "@rbxts/react";
import { useSyncExternalStoreWithSelector } from "@rbxts/use-sync-external-store";
import { AnyActorRef } from "@rbxts/xstate";
import { bind } from "bind";

type SyncExternalStoreSubscribe = Parameters<typeof useSyncExternalStoreWithSelector>[0];

function defaultCompare<T>(a: T, b: T) {
	return a === b;
}

export function useSelector<
	TActor extends Pick<AnyActorRef, "subscribe" | "getSnapshot"> | undefined,
	T,
>(
	actor: TActor,
	selector: (
		snapshot: TActor extends { getSnapshot(): infer TSnapshot } ? TSnapshot : undefined,
	) => T,
	compare: (a: T, b: T) => boolean = defaultCompare,
): T {
	const subscribe: SyncExternalStoreSubscribe = useCallback(
		handleStoreChange => {
			if (!actor) {
				return () => {};
			}
			const subscription = actor.subscribe(handleStoreChange);
			return bind(
				false,
				subscription["unsubscribe"] as never,
				subscription,
			) as typeof subscription.unsubscribe;
		},
		[actor],
	);

	const boundGetSnapshot = useCallback(() => actor?.getSnapshot(), [actor]);

	const selectedSnapshot = useSyncExternalStoreWithSelector(
		subscribe,
		boundGetSnapshot,
		selector,
		compare,
	);

	return selectedSnapshot;
}
