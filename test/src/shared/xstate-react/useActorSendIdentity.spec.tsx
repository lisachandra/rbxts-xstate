import { expect, test } from "@rbxts/jest-globals";
import * as React from "@rbxts/react";
import { act, render } from "@rbxts/react-testing-library";
import { createMachine } from "@rbxts/xstate";
import { useActor } from "@rbxts/xstate-react";

import { describeEachReactMode } from "./utils";

/**
 * `useActor` must hand back one stable send closure per actor ref.
 *
 * The hook used to return `actorRef.send` unwrapped, so every
 * snapshot-triggered re-render minted a fresh closure: any effect keyed on
 * `[send, ...]` tore down and re-fired without bound, wedging hosts whose
 * scheduler re-enters renders on every transition. The wrapper in `useActor`
 * (see `src/useActor.ts`) now memoizes the send closure on `[actorRef]`; this
 * spec pins that contract.
 */
const toggleMachine = createMachine({
	id: "sendIdentityToggle",
	initial: "closed",
	states: {
		closed: { on: { TOGGLE: "open" } },
		open: { on: { TOGGLE: "closed" } },
	},
});

type ToggleEvent = { type: "TOGGLE" };

const sendRefs = new Array<(event: ToggleEvent) => void>();
const openFlags = new Array<boolean>();

function SendProbe() {
	const [snapshot, send] = useActor(toggleMachine);

	sendRefs.push(send);
	openFlags.push(snapshot.matches("open"));

	return <frame />;
}

describeEachReactMode("useActor send identity", () => {
	test("should return a stable send closure that keeps driving the actor across re-renders", () => {
		expect.hasAssertions();

		sendRefs.clear();
		openFlags.clear();

		const result = render(<SendProbe />);
		const first = sendRefs[0];

		/* A transition re-renders the probe; the closure keeps one identity per actor ref. */
		act(() => {
			first?.({ type: "TOGGLE" });
		});

		expect(sendRefs.size()).toBeGreaterThanOrEqual(2);
		expect(sendRefs[sendRefs.size() - 1]).toBe(first);
		expect(openFlags[openFlags.size() - 1]).toBe(true);
		/* Every render pushed both a ref and a flag - the failures below describe send, not bookkeeping. */
		expect(openFlags.size()).toBe(sendRefs.size());

		/* The first-render closure still reaches the actor after the re-renders. */
		act(() => {
			first?.({ type: "TOGGLE" });
		});

		expect(openFlags[openFlags.size() - 1]).toBe(false);
		expect(openFlags.size()).toBe(sendRefs.size());

		result.unmount();

		/* Unmount did not swap the closure either - one identity per actor ref for the hook's whole life. */
		expect(sendRefs[sendRefs.size() - 1]).toBe(first);
	});
});
