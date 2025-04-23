import { Array, Error } from "@rbxts/luau-polyfill";
import {
	createEvent,
	fireEvent,
	queries,
	buildQueries,
	queryAllByAttribute,
	screen,
	waitFor,
	waitForElementToBeRemoved,
	MatcherOptions,
	BoundFunctions,
	within,
	document,
} from "../types";

const { getByText, queryByText, findByText, getAllByText, queryAllByText, findAllByText } = queries;

export async function testQueries() {
	// element queries
	const element = new Instance("Frame");
	getByText(element, "foo");
	getByText(element, 1);
	queryByText(element, "foo");
	await findByText(element, "foo");
	await findByText(element, "foo", undefined, { timeout: 10 });
	getAllByText(element, "bar");
	queryAllByText(element, "bar");
	await findAllByText(element, "bar");
	await findAllByText(element, "bar", undefined, { timeout: 10 });

	// screen queries
	screen.getByText("foo");
	screen.getByText<Instance>("foo");
	screen.queryByText("foo");
	await screen.findByText("foo");
	await screen.findByText("foo", undefined, { timeout: 10 });
	screen.debug(screen.getAllByText("bar"));
	screen.queryAllByText("bar");
	await screen.findAllByText("bar");
	await screen.findAllByText("bar", undefined, { timeout: 10 });
}

export async function testQueryHelpers() {
	const element = new Instance("Frame");
	const includesAutomationId = (content: string, automationId: string) => {
		for (const [id] of content.gmatch("%S+")) {
			if (id === automationId) {
				return true;
			}
		}

		return false;
	};
	const queryAllByAutomationId = (
		container: Instance,
		automationId: string[] | string,
		options?: MatcherOptions,
	) =>
		queryAllByAttribute(
			"testId",
			container,
			content =>
				Array.isArray(automationId)
					? automationId.every(id => includesAutomationId(content, id))
					: includesAutomationId(content, automationId),
			options,
		);

	const createIdRelatedErrorHandler =
		(errorMessage: string, defaultErrorMessage: string) =>
		<T>(container: Instance | undefined, ...args: T[]) => {
			const [key, value] = args;
			if (!container) {
				return "Container element not specified";
			}
			if (key && value) {
				return errorMessage
					.gsub("%[key%]", tostring(key), 1)[0]
					.gsub("%[value%]", tostring(value), 1)[0];
			}
			return defaultErrorMessage;
		};

	const [
		queryByAutomationId,
		getAllByAutomationId,
		getByAutomationId,
		findAllByAutomationId,
		findByAutomationId,
	] = buildQueries(
		queryAllByAutomationId,
		createIdRelatedErrorHandler(
			`Found multiple with key [key] and value [value]`,
			"Multiple error",
		),
		createIdRelatedErrorHandler(
			`Unable to find an element with the [key] attribute of: [value]`,
			"Missing error",
		),
	);
	queryByAutomationId(element, "id");
	getAllByAutomationId(element, "id");
	getByAutomationId(element, ["id", "automationId"]);
	await findAllByAutomationId(element, "id", {}, { timeout: 1000 });
	await findByAutomationId(element, "id", {}, { timeout: 1000 });
	// test optional params too
	await findAllByAutomationId(element, "id", {});
	await findByAutomationId(element, "id", {});
	await findAllByAutomationId(element, "id");
	await findByAutomationId(element, "id");

	await findAllByAutomationId(element, ["id", "id"], {});
	await findByAutomationId(element, ["id", "id"], {});
	await findAllByAutomationId(element, ["id", "id"]);
	await findByAutomationId(element, ["id", "id"]);

	const screenWithCustomQueries = within(document, {
		...queries,
		queryByAutomationId,
		getAllByAutomationId,
		getByAutomationId,
		findAllByAutomationId,
		findByAutomationId,
	});

	screenWithCustomQueries.queryByAutomationId("id");
	screenWithCustomQueries.getAllByAutomationId("id");
	screenWithCustomQueries.getByAutomationId(["id", "automationId"]);
	await screenWithCustomQueries.findAllByAutomationId("id", {}, { timeout: 1000 });
	await screenWithCustomQueries.findByAutomationId("id", {}, { timeout: 1000 });
}

export function testBoundFunctions() {
	const boundfunctions = {} as BoundFunctions<{
		customQueryOne: (container: Instance, text: string) => Instance;
		customQueryTwo: (container: Instance, text: string, text2: string) => Instance;
		customQueryThree: (container: Instance, number: number) => Instance;
	}>;

	boundfunctions.customQueryOne("one");
	boundfunctions.customQueryTwo("one", "two");
	boundfunctions.customQueryThree(3);
}

/*
export async function testByRole() {
	const element = document.createElement("button");
	element.setAttribute("aria-hidden", "true");

	assert(queryByRole(element, "button") === undefined);
	assert(queryByRole(element, "button", { hidden: true }) !== undefined);

	assert(screen.queryByRole("button") === undefined);
	assert(screen.queryByRole("button", { hidden: true }) !== undefined);

	assert((await findByRole(element, "button", undefined, { timeout: 10 })) === undefined);
	assert(
		(await findByRole(element, "button", { hidden: true }, { timeout: 10 })) !== undefined,
	);

	assert(
		queryAllByRole(document, "progressbar", { queryFallbacks: true }).length === 1,
	);

	// `name` option
	assert(queryByRole(element, "button", { name: "Logout" }) === undefined);
	assert(queryByRole(element, "button", { name: /^Log/ }) === undefined);
	assert(
		queryByRole(element, "button", {
			name: (name, el) => name === "Login" && el.hasAttribute("disabled"),
		}) === undefined,
	);

	assert(queryByRole(element, "foo") === undefined);
	assert(screen.queryByRole("foo") === undefined);
}

export function testA11yHelper() {
	const element = document.createElement("svg");
	assert(!isInaccessible(element));
}
*/

export function eventTest() {
	fireEvent.popState(document, {
		location: "http://www.example.com/?page=1",
		state: { page: 1 },
	});

	// Instance
	const element = new Instance("Frame");
	fireEvent.click(getByText(element, "foo"));

	// ChildNode
	const child = new Instance("Frame");
	//element.appendChild(child);
	child.Parent = element;
	/*
	if (!element.firstChild) {
		// Narrow Type
		throw new Error(`Can't find firstChild`);
	}
	*/
	fireEvent.click(child);

	// Custom event
	const customEvent = createEvent("customEvent", element);
	fireEvent(element, customEvent);
}

export async function testWaitFors() {
	const element = new Instance("Frame");

	await waitFor(() => getByText(element, "apple"));
	await waitFor(() => getAllByText(element, "apple"));
	const result: Instance = await waitFor(() => getByText(element, "apple"));
	if (!result) {
		// Use value
		throw new Error(`Can't find result`);
	}

	await waitForElementToBeRemoved(() => getByText(element, "apple"), {
		interval: 3000,
		container: element,
		timeout: 5000,
	});
	await waitForElementToBeRemoved(getByText(element, "apple"));
	await waitForElementToBeRemoved(getAllByText(element, "apple"));

	await waitFor(async () => {});
}

export function testWithin() {
	const container = within(document);
	// container.queryAllByLabelText("Some label");

	container.getByText("Click me");
	container.getByText<Instance>("Click me");
	container.getAllByText<Instance>("Click me");

	/*
	await container.findByRole("button", { name: /click me/i });
	container.getByRole<Instance>("button", { name: /click me/i });

	let withinQueries = within(document);
	withinQueries = within(document);
	withinQueries.getByRole<Instance>("button", { name: /click me/i });
	withinQueries = within(document);
	withinQueries.getByRole<Instance>("button", { name: /click me/i });
	*/
}
