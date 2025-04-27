declare const getSet: {
	/**
	 * Defines a getter and a setter on a table for a specific key. Both are
	 * optional.
	 */
	defineProperty: <T, U>(
		table: object,
		key: string,
		descriptor: {
			get?: (this: U) => T;
			set?: (this: U, value: T) => void;
		},
	) => void;

	/**
	 * Prevents new properties from being added to a table. Existing properties
	 * may be modified and configured.
	 */
	preventExtensions: (table: object) => void;

	/** Determines if a table is may be extended. */
	isExtensible: (table: object) => boolean;

	/**
	 * Prevents new properties from being added to a table, and existing
	 * properties may be modified, but not configured.
	 */
	seal: (table: object) => void;

	/** Determines if a table is sealed. */
	isSealed: (table: object) => boolean;

	freeze: (table: object) => void;

	isFrozen: (table: object) => boolean;
};

export = getSet;
