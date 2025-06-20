import { Object } from "@rbxts/luau-polyfill";

export function mapValues<P, O extends Record<string, unknown>>(
	collection: O,
	iteratee: (item: O[keyof O], key: keyof O, collection: O, i: number) => P,
): {
	[key in keyof O]: P;
};
export function mapValues(
	collection: Record<string, unknown>,
	iteratee: (
		item: unknown,
		key: string,
		collection: Record<string, unknown>,
		i: number,
	) => unknown,
) {
	const result: Record<string, unknown> = {};

	const collectionKeys = Object.keys(collection);
	for (let i = 0; i < collectionKeys.size(); i++) {
		const key = collectionKeys[i];
		result[key] = iteratee(collection[key], key, collection, i);
	}

	return result;
}
