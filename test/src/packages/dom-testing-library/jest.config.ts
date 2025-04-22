import { Config } from "@rbxts/jest";

export = {
	displayName: "dom-testing-library",
	testMatch: ["**/*.spec"],
	setupFilesAfterEnv: [script.Parent!.WaitForChild<ModuleScript>("setup-env")],
} satisfies Config;
