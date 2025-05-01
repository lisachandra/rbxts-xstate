const luaUnpack: Callback = getfenv(0)["unpack" as never];
export function bind<T extends Callback>(method: boolean, fn: T, ...args: any[]): T {
	return ((...extraArgs: defined[]) => {
		if (method) extraArgs.remove(0);
		return fn(luaUnpack([...args, ...extraArgs]));
	}) as never;
}
