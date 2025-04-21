import { useCallback, useEffect } from '@rbxts/react';
import { useSyncExternalStore } from '@rbxts/use-sync-external-store';
import {
  Actor,
  ActorOptions,
  AnyActorLogic,
  SnapshotFrom,
  type ConditionalRequired,
  type IsNotNever,
  type RequiredActorOptionsKeys
} from '@rbxts/xstate';
import { stopRootWithRehydration } from './stopRootWithRehydration';
import { useIdleActorRef } from './useActorRef';
import isDevelopment from './isDevelopment';
import { Error } from '@rbxts/luau-polyfill';
import { bind } from './bind';

export function useActor<TLogic extends AnyActorLogic>(
  logic: TLogic,
  ...[options]: ConditionalRequired<
    [
      options?: ActorOptions<TLogic> & {
        [K in RequiredActorOptionsKeys<TLogic>]: unknown;
      }
    ],
    IsNotNever<RequiredActorOptionsKeys<TLogic>>
  >
): [SnapshotFrom<TLogic>, Actor<TLogic>['send'], Actor<TLogic>] {
  if (
    isDevelopment &&
    !!logic &&
    'send' in logic &&
    typeIs(logic.send, 'function')
  ) {
    throw new Error(
      `useActor() expects actor logic (e.g. a machine), but received an ActorRef. Use the useSelector(actorRef, ...) hook instead to read the ActorRef's snapshot.`
    );
  }

  const actorRef = useIdleActorRef(logic, options);

  const getSnapshot = useCallback(() => {
    return actorRef.getSnapshot();
  }, [actorRef]);

  const subscribe = useCallback(
    (handleStoreChange: () => void) => {
      const subscription = actorRef.subscribe(handleStoreChange);
      return bind(
        subscription['unsubscribe'] as never,
        subscription
      ) as typeof subscription.unsubscribe;
    },
    [actorRef]
  );

  const actorSnapshot = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    actorRef.start();

    return () => {
      stopRootWithRehydration(actorRef);
    };
  }, [actorRef]);

  return [
    actorSnapshot,
    bind(actorRef['send'] as never, actorRef) as typeof actorRef.send,
    actorRef
  ];
}
