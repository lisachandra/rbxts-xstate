import { AnyMachineSnapshot, AnyEventObject, AnyActorScope, UnknownAction } from "types";
import { bind } from "utils/polyfill/bind";
import { is } from "utils/polyfill/is";
import { getAction } from "./getAction";
import { BuiltinAction } from "./types";

export function resolveAndExecuteActionsWithContext(
	currentSnapshot: AnyMachineSnapshot,
	event: AnyEventObject,
	actorScope: AnyActorScope,
	actions: UnknownAction[],
	extra: {
		internalQueue: AnyEventObject[];
		deferredActorIds: string[] | undefined;
	},
	retries: (readonly [BuiltinAction, unknown])[] | undefined,
): AnyMachineSnapshot {
	const { machine } = currentSnapshot;
	let intermediateSnapshot = currentSnapshot;

	for (const action of actions) {
		const isInline = typeIs(action, "function");
		const resolvedAction = isInline
			? action
			: // the existing type of `.actions` assumes non-nullable `TExpressionAction`

				// it's fine to cast this here to get a common type and lack of errors in the rest of the code
				// our logic below makes sure that we call those 2 "variants" correctly
				getAction(machine, typeIs(action, "string") ? action : action.type);
		const actionArgs = {
			context: intermediateSnapshot.context,
			event,
			self: actorScope.self,
			system: actorScope.system,
		};

		const actionParams =
			isInline || typeIs(action, "string")
				? undefined
				: "params" in action
					? typeIs(action.params, "function")
						? action.params({ context: intermediateSnapshot.context, event })
						: action.params
					: undefined;

		if (!resolvedAction || !("resolve" in resolvedAction)) {
			actorScope.actionExecutor({
				type: typeIs(action, "string")
					? action
					: typeIs(action, "table") && !is<Callback>(action)
						? action.type
						: action["name" as never] || "(anonymous)",
				info: actionArgs,
				params: actionParams,
				exec: resolvedAction,
			});
			continue;
		}

		const builtinAction = resolvedAction as BuiltinAction;

		const [nextState, params, actions] = builtinAction.resolve(
			actorScope,
			intermediateSnapshot,
			actionArgs,
			actionParams,
			resolvedAction, // this holds all params
			extra,
		);
		intermediateSnapshot = nextState;

		if ("retryResolve" in builtinAction) {
			retries?.push([builtinAction, params]);
		}

		if ("execute" in builtinAction) {
			actorScope.actionExecutor({
				type: builtinAction.type,
				info: actionArgs,
				params: params,
				exec: bind(builtinAction.execute, undefined, actorScope, params) as never,
			});
		}

		if (actions) {
			intermediateSnapshot = resolveAndExecuteActionsWithContext(
				intermediateSnapshot,
				event,
				actorScope,
				actions,
				extra,
				retries,
			);
		}
	}

	return intermediateSnapshot;
}
