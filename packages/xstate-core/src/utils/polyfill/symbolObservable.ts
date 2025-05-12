import { Symbol } from "@rbxts/luau-polyfill";

declare global {
	interface SymbolConstructor {
		observable: symbol;
	}
}

export const symbolObservable: SymbolConstructor["observable"] = Symbol.for("observable") as never;
