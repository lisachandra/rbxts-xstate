import { bind } from "utils/polyfill/bind";
import type { Observer } from "types";
import { is } from "../polyfill/is";

export function toObserver<T>(
	nextHandler?: Observer<T> | ((value: T) => void),
	errorHandler?: (error: any) => void,
	completionHandler?: () => void,
): Observer<T> {
	const isObserver = typeIs(nextHandler, "table") && is<Observer<T>>(nextHandler);
	const itself = isObserver ? nextHandler : undefined;

	return {
		next: bind((isObserver ? nextHandler.next : nextHandler)!, itself),
		error: bind((isObserver ? nextHandler.error : errorHandler)!, itself),
		complete: bind((isObserver ? nextHandler.complete : completionHandler)!, itself),
	};
}
