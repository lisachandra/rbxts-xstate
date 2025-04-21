export {};
declare global {
	type Table = Record<number | string | symbol, unknown>;

	/** A general type for a value that may be nil (undefined). */

	type N<T> = T | undefined;

	/**
	 * Converts a type T into a Map where keys are the type's keys and values
	 * are the type's values.
	 */
	type Mapify<T> = Map<keyof T, T[keyof T]>;

	interface LuaGlobals {
		/** Type signature for the Lua unpack function. */
		unpack: <T extends Array<unknown>>(...args: T) => LuaTuple<T>;

		/** Type signature for the Lua setfenv function. */
		setfenv: (func: Callback, fenv: Table) => void;
	}

	interface _G extends Table {
		__COMPAT_WARNINGS__?: boolean;
		__DEV__?: boolean;
		__TEST__?: boolean;
		__VERSION__?: `${number}.${number}.${number}`;
		NOCOLOR?: boolean;
	}
}
