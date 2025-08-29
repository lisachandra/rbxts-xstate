local floor = math.floor
local insert = table.insert
local concat = table.concat

--- Converts a number to its string representation in a specified base.
-- @param n The number to convert.
-- @param base The base (radix) to use for conversion (optional, defaults to 10).
--             Must be an integer between 2 and 36.
-- @return A string representing the number in the specified base.
function numberToString(n, base)
    n = floor(n) -- Ensure we're working with an integer part, as per common base conversion.
    base = base or 10 -- Default to base 10 if no base is provided.

    if base < 2 or base > 36 then
        error("Base must be an integer between 2 and 36.")
    end

    if base == 10 then
        return tostring(n) -- Use Lua's native tostring for base 10 for consistency and efficiency.
    end

    local digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    local result_digits = {}
    local sign = ""

    if n == 0 then
        return "0"
    end

    if n < 0 then
        sign = "-"
        n = -n
    end

    -- Repeated division and modulo to get digits in the new base
    repeat
        local remainder = n % base
        insert(result_digits, 1, digits:sub(remainder + 1, remainder + 1))
        n = floor(n / base)
    until n == 0

    return sign .. concat(result_digits, "")
end

return numberToString
