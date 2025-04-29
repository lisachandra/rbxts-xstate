export function hasIntersection<T>(s1: Iterable<T>, s2: Iterable<T>): boolean {
	const set1 = new Set(s1 as T[]);
	const set2 = new Set(s2 as T[]);

	for (const item of set1) {
		if (set2.has(item)) {
			return true;
		}
	}
	for (const item of set2) {
		if (set1.has(item)) {
			return true;
		}
	}
	return false;
}
