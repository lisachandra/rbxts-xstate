import type { Observer } from "types";
import { is } from "../polyfill/is";
import { bind } from "utils/polyfill/bind";

export function toObserver<T>(
	nextHandler?: Observer<T> | ((value: T) => void),
	errorHandler?: (error: any) => void,
	completionHandler?: () => void,
): Observer<T> {
	const isObserver = typeIs(nextHandler, "table") && is<Observer<T>>(nextHandler);
	const itself = isObserver ? nextHandler : undefined;

	return {
		next: isObserver ? bind(false, nextHandler.next!, itself) : nextHandler,
		error: isObserver ? bind(false, nextHandler.error!, itself) : errorHandler,
		complete: isObserver ? bind(false, nextHandler.complete!, itself) : completionHandler,
	};
}
