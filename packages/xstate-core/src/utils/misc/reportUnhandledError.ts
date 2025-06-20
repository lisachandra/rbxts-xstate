import { Error, setTimeout } from "@rbxts/luau-polyfill";

/**
 * This function makes sure that unhandled errors are thrown in a separate
 * macrotask. It allows those errors to be detected by global error handlers and
 * reported to bug tracking services without interrupting our own stack of
 * execution.
 *
 * @param err Error to be thrown
 */
export function reportUnhandledError(err: unknown, trace = debug.traceback("\n")) {
	setTimeout(() => {
		const message = typeIs(err, "table") && "message" in err ? err : new Error(`${err}`);
		throw message + trace;
	});
}
