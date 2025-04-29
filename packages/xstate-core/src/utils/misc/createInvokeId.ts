export function createInvokeId(stateNodeId: string, index: number): string {
	return `${index}.${stateNodeId}`;
}
