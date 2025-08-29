import { console, String } from "@rbxts/luau-polyfill";
import { AnyActorScope, createEmptyActor } from "../index";
import numberToString from "utils/polyfill/numberToString";

export function createMockActorScope(): AnyActorScope {
	const emptyActor = createEmptyActor();
	return {
		self: emptyActor,
		logger: console.log,
		id: "",
		sessionId: String.slice(numberToString(math.random(), 32), 2 + 1),
		defer: () => {},
		system: emptyActor.system, // TODO: mock system?
		stopChild: () => {},
		emit: () => {},
		actionExecutor: () => {},
	};
}
