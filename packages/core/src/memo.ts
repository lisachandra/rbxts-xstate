const cache = new WeakMap<never, never>();

export function memo<T>(object: any, key: string, fn: () => T): T {
  let memoizedData = cache.get(object as never) as never;

  if (!memoizedData) {
    memoizedData = { [key]: fn() } as never;
    cache.set(object as never, memoizedData);
  } else if (!(key in memoizedData)) {
    memoizedData[key as never] = fn() as never;
  }

  return memoizedData[key];
}
