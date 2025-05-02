import { Object } from "@rbxts/luau-polyfill";
import isDevelopment from "utils/polyfill/isDevelopment";
import type { MachineContext, EventObject, Mapper, NonReducibleUnknown, AnyActorRef } from "types";

export function resolveOutput<
	TContext extends MachineContext,
	TExpressionEvent extends EventObject,
>(
	mapper: Mapper<TContext, TExpressionEvent, unknown, EventObject> | NonReducibleUnknown,
	context: TContext,
	event: TExpressionEvent,
	itself: AnyActorRef,
): unknown {
	if (typeIs(mapper, "function") || (typeIs(mapper, "table") && "_isMockFunction" in mapper)) {
		return (mapper as Callback)({ context, event, self: itself });
	}

	if (
		isDevelopment &&
		!!mapper &&
		typeIs(mapper, "table") &&
		(Object.values(mapper) as defined[]).some(val => typeIs(val, "function"))
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
