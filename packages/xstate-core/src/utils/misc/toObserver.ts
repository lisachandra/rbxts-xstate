import type { Observer } from "types";
import { is } from "../polyfill/is";

export function toObserver<T>(
	nextHandler?: Observer<T> | ((value: T) => void),
	errorHandler?: (error: any) => void,
	completionHandler?: () => void,
): Observer<T> {
	const isObserver =
		typeIs(nextHandler, "table") &&
		!("_isMockFunction" in nextHandler) &&
		is<Observer<T>>(nextHandler);

	return {
		next: isObserver ? nextHandler.next! : (nextHandler as (value: T) => void),
		error: isObserver ? nextHandler.error! : errorHandler,
		complete: isObserver ? nextHandler.complete! : completionHandler,
	};
}
