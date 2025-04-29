import { Array } from "@rbxts/luau-polyfill";

export function toArrayStrict<T>(value: readonly T[] | T): readonly T[] {
	if (isArray(value)) {
		return value;
	}
	return [value];
}

export function toArray<T>(value: readonly T[] | T | undefined): readonly T[] {
	if (value === undefined) {
		return [];
	}
	return toArrayStrict(value);
}
export function isArray(value: any): value is readonly any[] {
	return Array.isArray(value);
}
