import { Error } from "@rbxts/luau-polyfill";
import { Matcher, MatcherOptions } from "./matches";
import { waitForOptions } from "./wait-for";

export type WithSuggest = { suggest?: boolean };

export type GetErrorFunction<Arguments extends any[] = [string]> = (
	c: Element | undefined,
	...args: Arguments
) => string;

export interface SelectorMatcherOptions extends MatcherOptions {
	selector?: string;
	ignore?: boolean | string;
}

export type QueryByAttribute = (
	attribute: string,
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => Instance | undefined;

export type AllByAttribute = (
	attribute: string,
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => Instance[];

export const queryByAttribute: QueryByAttribute;
export const queryAllByAttribute: AllByAttribute;
export function getElementError(message: string | undefined, container: Instance): Error;

/** Query methods have a common call signature. Only the return type differs. */
export type QueryMethod<Arguments extends any[], Return> = (
	container: Instance,
	...args: Arguments
) => Return;
export type QueryBy<Arguments extends any[]> = QueryMethod<Arguments, Instance | undefined>;
export type GetAllBy<Arguments extends any[]> = QueryMethod<Arguments, Instance[]>;
export type FindAllBy<Arguments extends any[]> = QueryMethod<
	[Arguments[0], Arguments[1]?, waitForOptions?],
	Promise<Instance[]>
>;
export type GetBy<Arguments extends any[]> = QueryMethod<Arguments, Instance>;
export type FindBy<Arguments extends any[]> = QueryMethod<
	[Arguments[0], Arguments[1]?, waitForOptions?],
	Promise<Instance>
>;

export type BuiltQueryMethods<Arguments extends any[]> = [
	QueryBy<Arguments>,
	GetAllBy<Arguments>,
	GetBy<Arguments>,
	FindAllBy<Arguments>,
	FindBy<Arguments>,
];

export function buildQueries<Arguments extends any[]>(
	queryAllBy: GetAllBy<Arguments>,
	getMultipleError: GetErrorFunction<Arguments>,
	getMissingError: GetErrorFunction<Arguments>,
): BuiltQueryMethods<Arguments>;
