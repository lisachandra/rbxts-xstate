import { Error } from "@rbxts/luau-polyfill";

type MutationObserverInit = object;

export interface waitForOptions {
	container?: Instance;
	timeout?: number;
	interval?: number;
	onTimeout?: (error: Error) => Error;
	mutationObserverOptions?: MutationObserverInit;
}

export function waitFor<T>(callback: () => Promise<T> | T, options?: waitForOptions): Promise<T>;
