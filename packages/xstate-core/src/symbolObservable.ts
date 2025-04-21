import { Symbol } from "@rbxts/luau-polyfill";

export const symbolObservable: unique symbol = (() =>
	(typeIs(Symbol, "function") && Symbol.observable) || "@@observable")() as never;
