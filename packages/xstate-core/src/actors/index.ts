import { createActor } from "../createActor";
import type { ActorRef, AnyEventObject, Snapshot } from "../types";
import { fromTransition } from "./transition";
export {
  fromCallback,
  type CallbackActorLogic,
  type CallbackActorRef,
  type CallbackSnapshot,
  type CallbackLogicFunction,
} from "./callback";
export {
  fromEventObservable,
  fromObservable,
  type ObservableActorLogic,
  type ObservableActorRef,
  type ObservableSnapshot,
} from "./observable";
export {
  type PromiseActorLogic,
  type PromiseActorRef,
  type PromiseSnapshot,
} from "./promise";
export {
  fromTransition,
  type TransitionActorLogic,
  type TransitionActorRef,
  type TransitionSnapshot,
} from "./transition";

const emptyLogic = fromTransition((_) => undefined, undefined);

export function createEmptyActor(): ActorRef<
  Snapshot<undefined>,
  AnyEventObject,
  AnyEventObject
> {
  return createActor(emptyLogic);
}
