-- ROBLOX upstream: https://github.com/testing-library/dom-testing-library/blob/v8.14.0/types/wait-for-element-to-be-removed.d.ts
local LuauPolyfill = require(script.Parent.Parent:WaitForChild('node_modules'):WaitForChild('.luau-aliases'):WaitForChild('@jsdotlua'):WaitForChild('luau-polyfill'))
type Promise<T> = LuauPolyfill.Promise<T>

local exports = {}

local waitForModule = require(script.Parent:WaitForChild('wait-for'))
type waitForOptions = waitForModule.waitForOptions

export type waitForElementToBeRemoved<T> = <T>(callback: T | (() -> T), options: waitForOptions?) -> Promise<nil>

return exports
