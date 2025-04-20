interface RuntimeLib {
  Promise: PromiseConstructor;
  TRY_BREAK: 2;
  TRY_CONTINUE: 3;
  TRY_RETURN: 1;

  async: <T extends Array<unknown>, U>(
    callback: (...args: T) => U,
  ) => (...args: T) => Promise<U>;
  await: <T>(promise: Promise<T> | T) => T;
  bit_lrsh: (a: number, b: number) => number;
  generator: <T extends Array<unknown>, U>(
    callback: (...args: T) => Generator<U>,
  ) => Generator<U>;
  getModule: (
    context: Instance,
    scope: string,
    moduleName: string,
  ) => ModuleScript;
  import: (
    context: Instance,
    module: ModuleScript,
    ...path: Array<string>
  ) => unknown;
  instanceof: (obj: unknown, theClass: unknown) => boolean;
  reset: () => void;
  try: <T extends Array<unknown>, U, V, W>(
    tryFn: () => [number, ...T] | U,
    catchFn?: (error: unknown) => [number, ...T] | V,
    finallyFn?: () => [number, ...T] | W,
  ) => LuaTuple<[number?, ...T]>;
}

declare const RuntimeLib: RuntimeLib;

export = RuntimeLib;
