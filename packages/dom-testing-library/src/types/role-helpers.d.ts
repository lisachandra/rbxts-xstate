export function logRoles(container: Instance, options?: LogRolesOptions): string;

interface LogRolesOptions {
	hidden?: boolean;
}

export function getRoles(container: Instance): {
	[index: string]: Instance[];
};

/** https://testing-library.com/docs/dom-testing-library/api-helpers#isinaccessible */
export function isInaccessible(element: Element): boolean;

export function computeHeadingLevel(element: Element): number | undefined;
