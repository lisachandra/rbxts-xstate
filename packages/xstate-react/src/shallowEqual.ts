function is(x?: unknown, y?: unknown) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}

export function shallowEqual(objA?: unknown, objB?: unknown) {
  if (is(objA, objB)) return true;

  if (
    !typeIs(objA, 'table') ||
    objA === undefined ||
    !typeIs(objB, 'table') ||
    objB === undefined
  ) {
    return false;
  }

  for (const [key, value] of pairs(objA)) {
    if (!is(objB[key as never], value)) {
      return false;
    }
  }

  for (const [key, value] of pairs(objB)) {
    if (!is(objA[key as never], value)) {
      return false;
    }
  }

  return true;
}
