import { Error } from "@rbxts/luau-polyfill";
import { ProcessingStatus, createActor } from "./createActor";
import {
	ActorRefFromLogic,
	AnyActorLogic,
	AnyActorRef,
	AnyActorScope,
	AnyEventObject,
	AnyFunction,
	AnyMachineSnapshot,
	ConditionalRequired,
	GetConcreteByKey,
	InputFrom,
	IsLiteralString,
	IsNotNever,
	ProvidedActor,
	RequiredActorOptions,
	type RequiredLogicInput,
} from "./types";
import { resolveReferencedActor } from "utils/misc/resolveReferencedActor";

type SpawnOptions<TActor extends ProvidedActor, TSrc extends TActor["src"]> = TActor extends {
	src: TSrc;
}
	? ConditionalRequired<
			[
				options?: {
					id?: TActor["id"];
					systemId?: string;
					input?: InputFrom<TActor["logic"]>;
					syncSnapshot?: boolean;
				} & { [K in RequiredActorOptions<TActor>]: unknown },
			],
			IsNotNever<RequiredActorOptions<TActor>>
		>
	: never;

export type Spawner<TActor extends ProvidedActor> =
	IsLiteralString<TActor["src"]> extends true
		? {
				<TSrc extends TActor["src"]>(
					logic: TSrc,
					...[options]: SpawnOptions<TActor, TSrc>
				): ActorRefFromLogic<GetConcreteByKey<TActor, "src", TSrc>["logic"]>;
				<TLogic extends AnyActorLogic>(
					src: TLogic,
					...[options]: ConditionalRequired<
						[
							options?: {
								id?: never;
								systemId?: string;
								input?: InputFrom<TLogic>;
								syncSnapshot?: boolean;
							} & { [K in RequiredLogicInput<TLogic>]: unknown },
						],
						IsNotNever<RequiredLogicInput<TLogic>>
					>
				): ActorRefFromLogic<TLogic>;
			}
		: <TLogic extends AnyActorLogic | string>(
				src: TLogic,
				...[options]: ConditionalRequired<
					[
						options?: {
							id?: string;
							systemId?: string;
							input?: TLogic extends string ? unknown : InputFrom<TLogic>;
							syncSnapshot?: boolean;
						} & (TLogic extends AnyActorLogic
							? { [K in RequiredLogicInput<TLogic>]: unknown }
							: {}),
					],
					IsNotNever<TLogic extends AnyActorLogic ? RequiredLogicInput<TLogic> : never>
				>
			) => TLogic extends AnyActorLogic ? ActorRefFromLogic<TLogic> : AnyActorRef;

export function createSpawner(
	actorScope: AnyActorScope,
	{ machine, context }: AnyMachineSnapshot,
	event: AnyEventObject,
	spawnedChildren: Record<string, AnyActorRef>,
): Spawner<any> {
	const spawn: Spawner<any> = ((src, options) => {
		if (typeIs(src, "string")) {
			const logic = resolveReferencedActor(machine, src);

			if (!logic) {
				throw new Error(`Actor logic '${src}' not implemented in machine '${machine.id}'`);
			}

			const actorRef = createActor(logic as AnyActorLogic, {
				id: options?.id,
				parent: actorScope.self,
				syncSnapshot: options?.syncSnapshot,
				input: typeIs(options?.input, "function")
					? (options.input as Callback)({
							context,
							event,
							self: actorScope.self,
						})
					: options?.input,
				src,
				systemId: options?.systemId,
			}) as AnyActorRef;

			spawnedChildren[actorRef.id] = actorRef;

			return actorRef;
		} else {
			const actorRef = createActor(src, {
				id: options?.id,
				parent: actorScope.self,
				syncSnapshot: options?.syncSnapshot,
				input: options?.input,
				src,
				systemId: options?.systemId,
			});

			return actorRef;
		}
	}) as Spawner<any>;
	return ((src, options) => {
		const actorRef = spawn(src, options) as AnyActorRef; // TODO: fix types
		spawnedChildren[actorRef.id] = actorRef;
		actorScope.defer(() => {
			if (actorRef._processingStatus === ProcessingStatus.Stopped) {
				return;
			}
			actorRef.start();
		});
		return actorRef;
	}) as Spawner<any>;
}
