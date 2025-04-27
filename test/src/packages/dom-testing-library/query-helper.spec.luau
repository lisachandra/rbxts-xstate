-- ROBLOX upstream: https://github.com/testing-library/dom-testing-library/blob/v8.14.0/src/__tests__/query-helper.js
local JestGlobals = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["dom-testing-library"].out.node_modules[".luau-aliases"]["@jsdotlua"]["jest-globals"])
local expect = JestGlobals.expect
local test = JestGlobals.test
local beforeEach = JestGlobals.beforeEach
local afterEach = JestGlobals.afterEach
local jest = JestGlobals.jest

local queryHelpers = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["dom-testing-library"].out["query-helpers"])
local configModule = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["dom-testing-library"].out.config)
local configure = configModule.configure
local getConfig = configModule.getConfig

local originalConfig = getConfig()
beforeEach(function()
	configure(originalConfig)
end)

afterEach(function()
	configure(originalConfig)
end)
test("should delegate to config.getElementError", function()
	local getElementError = jest.fn()
	configure({ getElementError = getElementError })

	local message = "test Message"
	local container = {} -- dummy

	queryHelpers.getElementError(message, container :: any)
	expect(getElementError.mock.calls[1]).toEqual({ message, container :: any })
end)
return {}
