import { Error } from "@rbxts/luau-polyfill";

/**
 * Assert a condition.
 *
 * @param condition The condition that it should satisfy.
 * @param message The error message.
 * @param args The arguments for replacing placeholders in the message.
 */
export function assertType(
  condition: boolean,
  message: string,
  ...args: any[]
): asserts condition {
  if (!condition) {
    throw new Error(format(message, args));
  }
}

/**
 * Convert a text and arguments to one string.
 *
 * @param message The formating text
 * @param args The arguments.
 */
export function format(message: string, args: unknown[]): string {
  let i = 0;
  return message.gsub("%%[os]", () => {
    const currentArg = args[i];
    i++;
    return tostring(currentArg);
  })[0];
}

/**
 * Convert a value to a string representation.
 *
 * @param x The value to get the string representation.
 */
export function anyToString(x: any): string {
  return tostring(x);
}
