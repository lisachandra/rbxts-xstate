export function omit<T extends object, K extends (keyof T)[]>(t: T, keys: K): Omit<T, K[number]> {
	const acc = {};
	for (const [k, v] of pairs(t)) {
		if (!keys.includes(k as keyof T)) {
			acc[k as never] = v as never;
		}
	}
	return acc as Omit<T, K[number]>;
}
