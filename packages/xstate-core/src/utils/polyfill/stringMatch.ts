import RegExp from "@rbxts/regexp";

export function stringMatch(stringValue: string, regex: RegExp) {
	let currentMatches = regex.exec(stringValue);
	const matches = [];

	while (currentMatches) {
		const match = currentMatches[1];
		matches.push(match);
		const nextInput = currentMatches.input!.sub(currentMatches.index! + match.size());
		currentMatches = regex.exec(nextInput);
	}

	return matches;
}
