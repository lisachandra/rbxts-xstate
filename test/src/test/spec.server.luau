_G.NOCOLOR = true
_G.__TEST__ = true
_G.__ROACT_17_MOCK_SCHEDULER__ = true

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TestService = game:GetService("TestService")

local Jest = require(ReplicatedStorage.TS.node_modules["@rbxts"].jest.src)

local status, result = Jest.runCLI(script, {
	verbose = false,
	ci = false,
	setupFiles = { TestService.setup },
	setupFilesAfterEnv = { TestService["setup-env"] }
}, {
	ReplicatedStorage.TS.packages,
}):awaitStatus()

if status == "Rejected" or result.results.numFailedTestSuites > 0 or result.results.numFailedTests > 0 then
	print(result)
	error("Tests failed!")
else
	print("Tests passed!")
end
