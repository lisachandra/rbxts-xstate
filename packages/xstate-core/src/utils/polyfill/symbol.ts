import { Symbol } from "@rbxts/luau-polyfill";

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

export = {
	iterator: Symbol.for("iterator"),
	asyncIterator: Symbol.for("asyncIterator"),
	observable: Symbol.for("observable"),
} as SymbolConstructor;
