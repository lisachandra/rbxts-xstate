import * as React from "@rbxts/react";
import * as RTL from "@rbxts/react-testing-library";
import { describe } from "@rbxts/jest-globals";
import fireEvent from "@rbxts/react-roblox-fire";

// TS trips over signatures with generic overloads when using bare `typeof RTL.render`
// conditional types just resolve the last overload
// and that is enough for us here
type SimplifiedRTLRender = (
	...args: Parameters<typeof RTL.render>
) => ReturnType<typeof RTL.render>;

const reactModes = [
	["non-strict", React.Fragment],
	["strict", React.StrictMode],
] as const;

export function describeEachReactMode(
	name: string,
	fn: (suiteCase: {
		suiteKey: (typeof reactModes)[number][0];
		render: SimplifiedRTLRender;
	}) => void,
) {
	describe.each(reactModes)(name, (suiteKey, Wrapper) => {
		const render: SimplifiedRTLRender = (ui, ...rest) =>
			RTL.render(<Wrapper>{ui}</Wrapper>, ...rest);

		fn({
			suiteKey,
			render: (...args) => {
				const renderResult = render(...args);
				const { rerender } = renderResult;
				renderResult.rerender = ui => rerender(<Wrapper>{ui}</Wrapper>);
				return renderResult;
			},
		});
	});
}

export function createMockInputObject(properties: Partial<InputObject>): InputObject {
	return {
		Delta: Vector3.zero,
		Position: Vector3.zero,
		KeyCode: Enum.KeyCode.Unknown,
		UserInputState: Enum.UserInputState.End,
		UserInputType: Enum.UserInputType.MouseButton1,
		...properties,
	} satisfies Partial<InputObject> as never;
}

export function fireClickEvent<T extends GuiButton>(
	instance: T,
	inputObject: InputObject = createMockInputObject({}),
	clickCount = 1,
) {
	fireEvent(instance as GuiButton, "Activated", inputObject, clickCount);
}
