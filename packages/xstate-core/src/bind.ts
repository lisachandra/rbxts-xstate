const luaUnpack: Callback = getfenv(0)["unpack" as never];
export function bind<T extends Callback>(method: T, ...args: any[]): T {
  return ((...extraArgs: any[]) =>
    method(luaUnpack([...args, ...extraArgs]))) as never;
}
