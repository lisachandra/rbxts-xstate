import { Matcher, MatcherOptions } from "./matches";
import { SelectorMatcherOptions } from "./query-helpers";
import { waitForOptions } from "./wait-for";

export type QueryByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => T | undefined;

export type AllByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => T[];

export type FindAllByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
	waitForElementOptions?: waitForOptions,
) => Promise<T[]>;

export type GetByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
) => T;

export type FindByBoundAttribute<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: MatcherOptions,
	waitForElementOptions?: waitForOptions,
) => Promise<T>;

export type QueryByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
) => T | undefined;

export type AllByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
) => T[];

export type FindAllByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
	waitForElementOptions?: waitForOptions,
) => Promise<T[]>;

export type GetByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
) => T;

export type FindByText<T extends Instance = Instance> = (
	container: Instance,
	id: Matcher,
	options?: SelectorMatcherOptions,
	waitForElementOptions?: waitForOptions,
) => Promise<T>;

interface ByRoleOptions {
	/** Suppress suggestions for a specific query */
	suggest?: boolean;
	/**
	 * If true includes elements in the query set that are usually excluded from
	 * the accessibility tree. `role="none"` or `role="presentation"` are
	 * included in either case.
	 */
	hidden?: boolean;
	/**
	 * If true only includes elements in the query set that are marked as
	 * selected in the accessibility tree, i.e., `aria-selected="true"`
	 */
	selected?: boolean;
	/**
	 * If true only includes elements in the query set that are marked as busy
	 * in the accessibility tree, i.e., `aria-busy="true"`
	 */
	busy?: boolean;
	/**
	 * If true only includes elements in the query set that are marked as
	 * checked in the accessibility tree, i.e., `aria-checked="true"`
	 */
	checked?: boolean;
	/**
	 * If true only includes elements in the query set that are marked as
	 * pressed in the accessibility tree, i.e., `aria-pressed="true"`
	 */
	pressed?: boolean;
	/**
	 * Filters elements by their `aria-current` state. `true` and `false` match
	 * `aria-current="true"` and `aria-current="false"` (as well as a missing
	 * `aria-current` attribute) respectively.
	 */
	current?: boolean | string;
	/**
	 * If true only includes elements in the query set that are marked as
	 * expanded in the accessibility tree, i.e., `aria-expanded="true"`
	 */
	expanded?: boolean;
	/**
	 * Includes elements with the `"heading"` role matching the indicated level,
	 * either by the semantic HTML heading elements `<h1>-<h6>` or matching the
	 * `aria-level` attribute.
	 */
	level?: number;
	value?: {
		now?: number;
		min?: number;
		max?: number;
		text?: Matcher;
	};
	/**
	 * Includes every role used in the `role` attribute For example
	 * *ByRole('progressbar', {queryFallbacks: true})` will find <div
	 * role="meter progressbar">`.
	 */
	queryFallbacks?: boolean;
	/** Only considers elements with the specified accessible name. */
	name?: string | ((accessibleName: string, element: Instance) => boolean);
	/** Only considers elements with the specified accessible description. */
	description?: string | ((accessibleDescription: string, element: Instance) => boolean);
}

/*
export type AllByRole<T extends Instance = Instance> = (
	container: Instance,
	role: ByRoleMatcher,
	options?: ByRoleOptions,
) => T[];

export type GetByRole<T extends Instance = Instance> = (
	container: Instance,
	role: ByRoleMatcher,
	options?: ByRoleOptions,
) => T;

export type QueryByRole<T extends Instance = Instance> = (
	container: Instance,
	role: ByRoleMatcher,
	options?: ByRoleOptions,
) => T | undefined;

export type FindByRole<T extends Instance = Instance> = (
	container: Instance,
	role: ByRoleMatcher,
	options?: ByRoleOptions,
	waitForElementOptions?: waitForOptions,
) => Promise<T>;

export type FindAllByRole<T extends Instance = Instance> = (
	container: Instance,
	role: ByRoleMatcher,
	options?: ByRoleOptions,
	waitForElementOptions?: waitForOptions,
) => Promise<T[]>;

export function getByLabelText<T extends Instance = Instance>(
	...args: Parameters<GetByText<T>>
): ReturnType<GetByText<T>>;
export function getAllByLabelText<T extends Instance = Instance>(
	...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>;
export function queryByLabelText<T extends Instance = Instance>(
	...args: Parameters<QueryByText<T>>
): ReturnType<QueryByText<T>>;
export function queryAllByLabelText<T extends Instance = Instance>(
	...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>;
export function findByLabelText<T extends Instance = Instance>(
	...args: Parameters<FindByText<T>>
): ReturnType<FindByText<T>>;
export function findAllByLabelText<T extends Instance = Instance>(
	...args: Parameters<FindAllByText<T>>
): ReturnType<FindAllByText<T>>;
*/
export function getByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>;
export function getAllByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function queryByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>;
export function queryAllByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function findByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>;
export function findAllByPlaceholderText<T extends Instance = Instance>(
	...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>;
export function getByText<T extends Instance = Instance>(
	...args: Parameters<GetByText<T>>
): ReturnType<GetByText<T>>;
export function getAllByText<T extends Instance = Instance>(
	...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>;
export function queryByText<T extends Instance = Instance>(
	...args: Parameters<QueryByText<T>>
): ReturnType<QueryByText<T>>;
export function queryAllByText<T extends Instance = Instance>(
	...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>;
export function findByText<T extends Instance = Instance>(
	...args: Parameters<FindByText<T>>
): ReturnType<FindByText<T>>;
export function findAllByText<T extends Instance = Instance>(
	...args: Parameters<FindAllByText<T>>
): ReturnType<FindAllByText<T>>;
/*
export function getByAltText<T extends Instance = Instance>(
	...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>;
export function getAllByAltText<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function queryByAltText<T extends Instance = Instance>(
	...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>;
export function queryAllByAltText<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function findByAltText<T extends Instance = Instance>(
	...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>;
export function findAllByAltText<T extends Instance = Instance>(
	...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>;
export function getByTitle<T extends Instance = Instance>(
	...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>;
export function getAllByTitle<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function queryByTitle<T extends Instance = Instance>(
	...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>;
export function queryAllByTitle<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function findByTitle<T extends Instance = Instance>(
	...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>;
export function findAllByTitle<T extends Instance = Instance>(
	...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>;
*/
export function getByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>;
export function getAllByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function queryByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>;
export function queryAllByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function findByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>;
export function findAllByDisplayValue<T extends Instance = Instance>(
	...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>;
/*
export function getByRole<T extends Instance = Instance>(
	...args: Parameters<GetByRole<T>>
): ReturnType<GetByRole<T>>;
export function getAllByRole<T extends Instance = Instance>(
	...args: Parameters<AllByRole<T>>
): ReturnType<AllByRole<T>>;
export function queryByRole<T extends Instance = Instance>(
	...args: Parameters<QueryByRole<T>>
): ReturnType<QueryByRole<T>>;
export function queryAllByRole<T extends Instance = Instance>(
	...args: Parameters<AllByRole<T>>
): ReturnType<AllByRole<T>>;
export function findByRole<T extends Instance = Instance>(
	...args: Parameters<FindByRole<T>>
): ReturnType<FindByRole<T>>;
export function findAllByRole<T extends Instance = Instance>(
	...args: Parameters<FindAllByRole<T>>
): ReturnType<FindAllByRole<T>>;
*/
export function getByTestId<T extends Instance = Instance>(
	...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>;
export function getAllByTestId<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function queryByTestId<T extends Instance = Instance>(
	...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>;
export function queryAllByTestId<T extends Instance = Instance>(
	...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>;
export function findByTestId<T extends Instance = Instance>(
	...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>;
export function findAllByTestId<T extends Instance = Instance>(
	...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>;
