import isDevelopment from "./isDevelopment";
import { isMachineSnapshot } from "./State";
import type { StateNode } from "./StateNode";
import { TARGETLESS_KEY } from "./constants";
import type {
  AnyActorRef,
  AnyEventObject,
  AnyMachineSnapshot,
  AnyStateMachine,
  AnyTransitionConfig,
  ErrorActorEvent,
  EventObject,
  InvokeConfig,
  MachineContext,
  Mapper,
  NonReducibleUnknown,
  Observer,
  SingleOrArray,
  StateLike,
  StateValue,
  TransitionConfigTarget,
} from "./types";
import { Array, Object, String } from "@rbxts/luau-polyfill";
import RegExp from "@rbxts/regexp";
import { bind } from "bind";

export function stringMatch(stringValue: string, regex: RegExp) {
  let currentMatches = regex.exec(stringValue);
  const matches = [];

  while (currentMatches) {
    const match = currentMatches[1];
    matches.push(match);
    const nextInput = currentMatches.input!.sub(
      currentMatches.index! + match.size(),
    );
    currentMatches = regex.exec(nextInput);
  }

  return matches;
}

export function is<T>(kind: unknown): kind is T {
  return true;
}

export function indexString(str: string, index: number) {
  return utf8.char(utf8.codepoint(str, utf8.offset(str, index + 1))[0]);
}

export function matchesState(
  parentStateId: StateValue,
  childStateId: StateValue,
): boolean {
  const parentStateValue = toStateValue(parentStateId);
  const childStateValue = toStateValue(childStateId);

  if (typeIs(childStateValue, "string")) {
    if (typeIs(parentStateValue, "string")) {
      return childStateValue === parentStateValue;
    }

    // Parent more specific than child
    return false;
  }

  if (typeIs(parentStateValue, "string")) {
    return parentStateValue in childStateValue;
  }

  return Object.keys(parentStateValue).every((key) => {
    if (!(key in childStateValue)) {
      return false;
    }

    return matchesState(parentStateValue[key]!, childStateValue[key]!);
  });
}

export function toStatePath(stateId: string | string[]): string[] {
  if (isArray(stateId)) {
    return stateId;
  }

  const result: string[] = [];
  let segment = "";

  for (let i = 0; i < stateId.size(); i++) {
    const char = String.charCodeAt(stateId, i);
    switch (char) {
      // \
      case 92:
        // consume the next character
        segment += indexString(stateId, i + 1);
        // and skip over it
        i++;
        continue;
      // .
      case 46:
        result.push(segment);
        segment = "";
        continue;
    }
    segment += indexString(stateId, i);
  }

  result.push(segment);

  return result;
}

function toStateValue(stateValue: StateLike<any> | StateValue): StateValue {
  if (isMachineSnapshot(stateValue)) {
    return stateValue.value;
  }

  if (typeIs(stateValue, "string")) {
    return stateValue as StateValue;
  }

  const statePath = toStatePath(stateValue as never);
  return pathToStateValue(statePath);
}

export function pathToStateValue(statePath: string[]): StateValue {
  if (statePath.size() === 1) {
    return statePath[0];
  }

  const value: StateValue = {};
  let marker = value;

  for (let i = 0; i < statePath.size() - 1; i++) {
    if (i === statePath.size() - 2) {
      marker[statePath[i]] = statePath[i + 1];
    } else {
      const previous = marker;
      marker = {};
      previous[statePath[i]] = marker;
    }
  }

  return value;
}

export function mapValues<P, O extends Record<string, unknown>>(
  collection: O,
  iteratee: (item: O[keyof O], key: keyof O, collection: O, i: number) => P,
): { [key in keyof O]: P };
export function mapValues(
  collection: Record<string, unknown>,
  iteratee: (
    item: unknown,
    key: string,
    collection: Record<string, unknown>,
    i: number,
  ) => unknown,
) {
  const result: Record<string, unknown> = {};

  const collectionKeys = Object.keys(collection);
  for (let i = 0; i < collectionKeys.size(); i++) {
    const key = collectionKeys[i];
    result[key] = iteratee(collection[key], key, collection, i);
  }

  return result;
}

function toArrayStrict<T>(value: readonly T[] | T): readonly T[] {
  if (isArray(value)) {
    return value;
  }
  return [value];
}

export function toArray<T>(value: readonly T[] | T | undefined): readonly T[] {
  if (value === undefined) {
    return [];
  }
  return toArrayStrict(value);
}

export function resolveOutput<
  TContext extends MachineContext,
  TExpressionEvent extends EventObject,
>(
  mapper:
    | Mapper<TContext, TExpressionEvent, unknown, EventObject>
    | NonReducibleUnknown,
  context: TContext,
  event: TExpressionEvent,
  itself: AnyActorRef,
): unknown {
  if (typeIs(mapper, "function")) {
    return mapper({ context, event, self: itself });
  }

  if (
    isDevelopment &&
    !!mapper &&
    typeIs(mapper, "table") &&
    (Object.values(mapper) as defined[]).some((val) => typeIs(val, "function"))
  ) {
    warn(
      `Dynamically mapping values to individual properties is deprecated. Use a single function that returns the mapped object instead.\nFound object containing properties whose values are possibly mapping functions: ${Object.entries(
        mapper,
      )
        .filter(([, value]) => typeIs(value, "function"))
        .map(([key, value]) => `\n - ${key}: ${value}`)
        .join("")}`,
    );
  }

  return mapper;
}

function isArray(value: any): value is readonly any[] {
  return Array.isArray(value);
}

export function isErrorActorEvent(
  event: AnyEventObject,
): event is ErrorActorEvent {
  return String.startsWith(event.type, "xstate.error.actor");
}

export function toTransitionConfigArray(
  configLike: SingleOrArray<AnyTransitionConfig | TransitionConfigTarget>,
): Array<AnyTransitionConfig> {
  return toArrayStrict(configLike as defined).map((transitionLike) => {
    if (transitionLike === undefined || typeIs(transitionLike, "string")) {
      return { target: transitionLike };
    }

    return transitionLike;
  });
}

export function normalizeTarget<
  TContext extends MachineContext,
  TEvent extends EventObject,
>(
  target: SingleOrArray<string | StateNode<TContext, TEvent>> | undefined,
): ReadonlyArray<string | StateNode<TContext, TEvent>> | undefined {
  if (target === undefined || target === TARGETLESS_KEY) {
    return undefined;
  }
  return toArray(target);
}

export function toObserver<T>(
  nextHandler?: Observer<T> | ((value: T) => void),
  errorHandler?: (error: any) => void,
  completionHandler?: () => void,
): Observer<T> {
  const isObserver =
    typeIs(nextHandler, "table") && is<Observer<T>>(nextHandler);
  const itself = isObserver ? nextHandler : undefined;

  return {
    next: bind((isObserver ? nextHandler.next : nextHandler)!, itself),
    error: bind((isObserver ? nextHandler.error : errorHandler)!, itself),
    complete: bind(
      (isObserver ? nextHandler.complete : completionHandler)!,
      itself,
    ),
  };
}

export function createInvokeId(stateNodeId: string, index: number): string {
  return `${index}.${stateNodeId}`;
}

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
      ? invokeConfig[indexStr as never]
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

export function getAllOwnEventDescriptors(snapshot: AnyMachineSnapshot) {
  return [
    ...new Set([...Array.flatMap(snapshot._nodes, (sn) => sn.getOwnEvents())]),
  ];
}

export function omit<T extends object, K extends (keyof T)[]>(
  t: T,
  keys: K,
): Omit<T, K[number]> {
  const acc = {};
  for (const [k, v] of pairs(t)) {
    if (!keys.includes(k as keyof T)) {
      acc[k as never] = v as never;
    }
  }
  return acc as Omit<T, K[number]>;
}
