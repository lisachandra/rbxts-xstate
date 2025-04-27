-- ROBLOX upstream: https://github.com/testing-library/react-testing-library/blob/v12.1.5/src/__tests__/auto-cleanup.js
local JestGlobals = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["react-testing-library"].out.node_modules[".luau-aliases"]["@jsdotlua"]["jest-globals"])
local expect = JestGlobals.expect
local test = JestGlobals.test

local document = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["react-testing-library"].out.node_modules[".luau-aliases"]["@jsdotlua"]["dom-testing-library"]).document

local React = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["react-testing-library"].out.node_modules[".luau-aliases"]["@jsdotlua"]["react"])
local render = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["react-testing-library"].out).render

-- This just verifies that by importing RTL in an
-- environment which supports afterEach (like jest)
-- we'll get automatic cleanup between tests.
test("first", function()
	render(React.createElement("TextLabel", { Text = "hi" }))
end)

test("second", function()
	expect(document).toBeEmptyDOMElement()
end)

return {}
