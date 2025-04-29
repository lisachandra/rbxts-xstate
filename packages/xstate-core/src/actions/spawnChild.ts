import isDevelopment from "../utils/polyfill/isDevelopment";
import { cloneMachineSnapshot } from "../State";
import { ProcessingStatus, createActor } from "../createActor";
import {
	ActionArgs,
	ActionFunction,
	AnyActorLogic,
	AnyActorRef,
	AnyActorScope,
	AnyMachineSnapshot,
	ConditionalRequired,
	EventObject,
	InputFrom,
	IsLiteralString,
	IsNotNever,
	MachineContext,
	Mapper,
	ParameterizedObject,
	ProvidedActor,
	RequiredActorOptions,
	BuiltinActionResolution,
	UnifiedArg,
} from "../types";
import { Error } from "@rbxts/luau-polyfill";
import { resolveReferencedActor } from "utils/misc/resolveReferencedActor";

type ResolvableActorId<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TEvent extends EventObject,
	TId extends string | undefined,
> = TId | ((args: UnifiedArg<TContext, TExpressionEvent, TEvent>) => TId);

function resolveSpawn(
	actorScope: AnyActorScope,
	snapshot: AnyMachineSnapshot,
	actionArgs: ActionArgs<any, any, any>,
	_actionParams: ParameterizedObject["params"] | undefined,
	{
		id,
		systemId,
		src,
		input,
		syncSnapshot,
	}: {
		id: ResolvableActorId<MachineContext, EventObject, EventObject, string>;
		systemId: string | undefined;
		src: AnyActorLogic | string;
		input?: unknown;
		syncSnapshot: boolean;
	},
): BuiltinActionResolution {
	const logic = typeIs(src, "string") ? resolveReferencedActor(snapshot.machine, src) : src;
	const resolvedId = typeIs(id, "function") ? id(actionArgs) : id;
	let actorRef: AnyActorRef | undefined;
	let resolvedInput: unknown | undefined = undefined;

	if (logic) {
		resolvedInput = typeIs(input, "function")
			? input({
					context: snapshot.context,
					event: actionArgs.event,
					self: actorScope.self,
				})
			: input;
		actorRef = createActor(logic as AnyActorLogic, {
			id: resolvedId,
			src,
			parent: actorScope.self,
			syncSnapshot,
			systemId,
			input: resolvedInput,
		});
	}

	if (isDevelopment && !actorRef) {
		warn(`Actor type '${src}' not found in machine '${actorScope.id}'.`);
	}
	return [
		cloneMachineSnapshot(snapshot, {
			children: {
				...snapshot.children,
				[resolvedId]: actorRef!,
			},
		}),
		{
			id,
			systemId,
			actorRef,
			src,
			input: resolvedInput,
		},
		undefined,
	];
}

function executeSpawn(
	actorScope: AnyActorScope,
	{ actorRef }: { id: string; actorRef: AnyActorRef },
) {
	if (!actorRef) {
		return;
	}

	actorScope.defer(() => {
		if (actorRef._processingStatus === ProcessingStatus.Stopped) {
			return;
		}
		actorRef.start();
	});
}

export interface SpawnAction<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
> {
	(args: ActionArgs<TContext, TExpressionEvent, TEvent>, params: TParams): void;
	_out_TActor?: TActor;
}

interface SpawnActionOptions<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
> {
	id?: ResolvableActorId<TContext, TExpressionEvent, TEvent, TActor["id"]>;
	systemId?: string;
	input?:
		| Mapper<TContext, TEvent, InputFrom<TActor["logic"]>, TEvent>
		| InputFrom<TActor["logic"]>;
	syncSnapshot?: boolean;
}

type DistributeActors<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
> =
	| (TActor extends any
			? ConditionalRequired<
					[
						src: TActor["src"],
						options?: SpawnActionOptions<TContext, TExpressionEvent, TEvent, TActor> & {
							[K in RequiredActorOptions<TActor>]: unknown;
						},
					],
					IsNotNever<RequiredActorOptions<TActor>>
				>
			: never)
	| [
			src: AnyActorLogic,
			options?: SpawnActionOptions<TContext, TExpressionEvent, TEvent, ProvidedActor> & {
				id?: never;
			},
	  ];

type SpawnArguments<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
> =
	IsLiteralString<TActor["src"]> extends true
		? DistributeActors<TContext, TExpressionEvent, TEvent, TActor>
		: [
				src: string | AnyActorLogic,
				options?: {
					id?: ResolvableActorId<TContext, TExpressionEvent, TEvent, string>;
					systemId?: string;
					input?: unknown;
					syncSnapshot?: boolean;
				},
			];

export function spawnChild<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
	TParams extends ParameterizedObject["params"] | undefined,
	TEvent extends EventObject,
	TActor extends ProvidedActor,
>(
	...[src, { id, systemId, input, syncSnapshot = false } = {} as never]: SpawnArguments<
		TContext,
		TExpressionEvent,
		TEvent,
		TActor
	>
): ActionFunction<TContext, TExpressionEvent, TEvent, TParams, TActor, never, never, never, never> {
	function spawnChild(_args: ActionArgs<TContext, TExpressionEvent, TEvent>, _params: TParams) {
		if (isDevelopment) {
			throw new Error(`This isn't supposed to be called`);
		}
	}

	spawnChild.type = "xstate.spawnChild";
	spawnChild.id = id;
	spawnChild.systemId = systemId;
	spawnChild.src = src;
	spawnChild.input = input;
	spawnChild.syncSnapshot = syncSnapshot;

	spawnChild.resolve = resolveSpawn;
	spawnChild.execute = executeSpawn;

	return spawnChild;
}
