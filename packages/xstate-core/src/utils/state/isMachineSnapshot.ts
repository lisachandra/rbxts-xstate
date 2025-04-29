import type { AnyMachineSnapshot } from "types";

export function isMachineSnapshot(value: unknown): value is AnyMachineSnapshot {
	return !!value && typeIs(value, "table") && "machine" in value && "value" in value;
}
