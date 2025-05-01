import type { Observer } from "types";
import { is } from "../polyfill/is";

export function toObserver<T>(
	nextHandler?: Observer<T> | ((value: T) => void),
	errorHandler?: (error: any) => void,
	completionHandler?: () => void,
): Observer<T> {
	const isObserver = typeIs(nextHandler, "table") && is<Observer<T>>(nextHandler);
	// const itself = isObserver ? nextHandler : undefined;

	return {
		next: isObserver ? nextHandler.next : nextHandler,
		error: isObserver ? nextHandler.error : errorHandler,
		complete: isObserver ? nextHandler.complete : completionHandler,
	};
}
