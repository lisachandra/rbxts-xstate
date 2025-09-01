_G.NOCOLOR = true
_G.__TEST__ = true
_G.__DEV__ = true
_G.__ROACT_17_MOCK_SCHEDULER__ = true

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TestService = game:GetService("TestService")

local Jest = require(ReplicatedStorage.TS.node_modules["@rbxts"].jest.src)

local capableOfRunningReactTests = pcall(function()
	local a = game:GetService("CoreGui");
	print(a);
	assert(a ~= nil)
end)

local status, result = Jest.runCLI(script, {
	verbose = false,
	ci = true,
	setupFiles = { TestService.setup },
	setupFilesAfterEnv = { TestService["setup-env"] },
	snapshotFormat = {
		printBasicPrototype = false,
	},
}, {
	ReplicatedStorage.TS.shared["xstate-core"],
	capableOfRunningReactTests and ReplicatedStorage.TS.shared["xstate-react"] or nil,
}):awaitStatus()

if status == "Rejected" or result.results.numFailedTestSuites > 0 or result.results.numFailedTests > 0 then
	error("Tests failed!")
else
	print("Tests passed!")
end
