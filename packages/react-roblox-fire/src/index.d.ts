declare const fireEvent: <T extends Instance, S extends InstanceEventNames<T>>(
	instance: T,
	eventName: S,
	...args: T[S] extends RBXScriptSignal<infer C> ? Parameters<C> : never
) => void;

export = fireEvent;
