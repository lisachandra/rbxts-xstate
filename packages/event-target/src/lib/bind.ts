const luaUnpack: Callback = getfenv(0)["unpack" as never];
export function bind<T extends Callback>(fn: T, ...args: any[]): T {
	return ((...extraArgs: any[]) => fn(luaUnpack([...args, ...extraArgs]))) as never;
}
