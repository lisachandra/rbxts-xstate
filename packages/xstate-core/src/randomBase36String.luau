-- Character set for base-36
local BASE36_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"

--- Generates a random base-36 string mimicking JS Math.random().toString(36).slice(2)
-- @param length (optional) The desired length of the string (default mimics typical JS output length)
-- @return string A random base-36 string
function random_base36_string(length)
  length = length or 12 -- Default length, adjust as needed (JS output varies slightly)
  local num = math.random() -- Get random number 0 <= num < 1
  local result_parts = {}

  -- Repeatedly multiply by 36 to extract base-36 digits for the fractional part
  for i = 1, length do
    num = num * 36
    local digit_val = math.floor(num)

    -- Get the corresponding base-36 character (Lua strings are 1-based)
    result_parts[i] = string.sub(BASE36_DIGITS, digit_val + 1, digit_val + 1)

    -- Subtract the integer part to keep only the new fractional part
    num = num - digit_val

    -- Optimization: If the number becomes exactly 0, we can stop early
    if num == 0 then
      break
    end
  end

  return table.concat(result_parts)
end

return random_base36_string
