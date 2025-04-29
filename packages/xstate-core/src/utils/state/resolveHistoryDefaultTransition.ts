import { MachineContext, EventObject, AnyStateNode } from "types";
import { normalizeTarget } from "utils/misc/normalizeTarget";
import { getStateNodeByPath } from "./getStateNodeByPath";

export function resolveHistoryDefaultTransition<
	TContext extends MachineContext,
	TEvent extends EventObject,
>(stateNode: AnyStateNode & { type: "history" }) {
	const normalizedTarget = normalizeTarget<TContext, TEvent>(stateNode.config.target);
	if (!normalizedTarget) {
		return stateNode.parent!.getInitial();
	}
	return {
		target: normalizedTarget.map(t =>
			typeIs(t, "string") ? getStateNodeByPath(stateNode.parent!, t) : t,
		),
	};
}
