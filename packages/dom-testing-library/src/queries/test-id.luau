-- ROBLOX upstream: https://github.com/testing-library/dom-testing-library/blob/v8.14.0/src/queries/test-id.ts
local LuauPolyfill = require(script.Parent.Parent:WaitForChild('node_modules'):WaitForChild('.luau-aliases'):WaitForChild('@jsdotlua'):WaitForChild('luau-polyfill'))
type Array<T> = LuauPolyfill.Array<T>

local exports = {}

local checkContainerType = require(script.Parent.Parent:WaitForChild('helpers')).checkContainerType
local wrapAllByQueryWithSuggestion = require(script.Parent.Parent:WaitForChild('query-helpers')).wrapAllByQueryWithSuggestion
local typesModule = require(script.Parent.Parent:WaitForChild('types'))
type AllByBoundAttribute<T = Instance> = typesModule.AllByBoundAttribute<T>
type GetErrorFunction<Argument = any> = typesModule.GetErrorFunction<Argument>
local all_utilsModule = require(script.Parent:WaitForChild('all-utils'))
local queryAllByAttribute = all_utilsModule.queryAllByAttribute
local getConfig = all_utilsModule.getConfig
local buildQueries = all_utilsModule.buildQueries

local function getTestIdAttribute()
	return getConfig().testIdAttribute
end

local queryAllByTestId: AllByBoundAttribute
function queryAllByTestId(...: any)
	local args = { ... }
	checkContainerType(args[1])
	return queryAllByAttribute(getTestIdAttribute(), ...)
end

local getMultipleError: GetErrorFunction<unknown>
function getMultipleError(c, id)
	return ('Found multiple elements by: [%s="%s"]'):format(getTestIdAttribute(), tostring(id))
end
local getMissingError: GetErrorFunction<unknown>
function getMissingError(c, id)
	return ('Unable to find an element by: [%s="%s"]'):format(getTestIdAttribute(), tostring(id))
end

local queryAllByTestIdWithSuggestions =
	wrapAllByQueryWithSuggestion(queryAllByTestId, debug.info(queryAllByTestId, "n"), "queryAll")

-- ROBLOX deviation START: buildQueries returns a list
local queryByTestId, getAllByTestId, getByTestId, findAllByTestId, findByTestId =
	buildQueries(queryAllByTestId, getMultipleError, getMissingError)
-- ROBLOX deviation END

exports.queryByTestId = queryByTestId
exports.queryAllByTestId = queryAllByTestIdWithSuggestions
exports.getByTestId = getByTestId
exports.getAllByTestId = getAllByTestId
exports.findAllByTestId = findAllByTestId
exports.findByTestId = findByTestId

return exports
