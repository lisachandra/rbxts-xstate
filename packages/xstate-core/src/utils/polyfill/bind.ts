const luaUnpack: Callback = getfenv(0)["unpack" as never];
export function bind<T extends Callback>(method: boolean, fn: T, ...args: any[]): T {
	return ((...extraArgs: defined[]) => {
		if (method) extraArgs.remove(0);
		// print(args, extraArgs, debug.traceback());
		return fn(luaUnpack([...args, ...extraArgs]));
	}) as never;
}
