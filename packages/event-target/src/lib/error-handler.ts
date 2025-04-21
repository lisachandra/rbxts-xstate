/**
 * Print a error message.
 *
 * @param maybeError The error object.
 */
export function reportError(maybeError: unknown): void {
	try {
		error(maybeError);
	} catch {
		// ignore.
	}
}
