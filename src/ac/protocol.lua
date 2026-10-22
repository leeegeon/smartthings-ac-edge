-- src/ac/protocol.lua
-- LG Air Conditioner 28-bit Protocol (LG2 Variant) & Broadlink IR Packet Generator
-- Target Model: LG MNQ0720C2S and compatible LG split/window air conditioners

local protocol = {}

-- Standard LG AC 28-bit command constants
protocol.SIGNATURE = 0x88             -- First byte: LG manufacturer address
protocol.POWER_OFF = "88C0051"        -- Dedicated Power OFF frame (checksum 1)
protocol.POWER_COOLING = "8810089"    -- Dedicated Jet Cool / Power Cooling frame (checksum 9)
protocol.VANE_INDIRECT = "881309D"    -- Vane Highest / Indirect breeze / 천장각도 (checksum D)
protocol.VANE_DIRECT   = "8813048"    -- Vane Lowest / Direct wind / 하향각도 (checksum 8)
protocol.OSCILLATION_TOGGLE = "8813048" -- Legacy alias

-- Fan speed nibble mapping (confirmed via physical remote captures)
-- 1단 (미풍): 0x1
-- 2단 (약풍): 0x0
-- 3단 (중풍): 0x2
-- 4단 (강풍): 0x4
-- 5단 (자연풍/자동): 0x5
protocol.FAN_SPEED_NIBBLE = {
  ["whisper"] = 1,
  ["low"]     = 0,
  ["medium"]  = 2,
  ["high"]    = 4,
  ["natural"] = 5,
}

-- Temperature bounds
protocol.MIN_TEMP = 18
protocol.MAX_TEMP = 30
protocol.TEMP_OFFSET = 15

-- Calculate LG 28-bit checksum: sum of first 6 nibbles modulo 16
function protocol.calculate_checksum(n1, n2, n3, n4, n5, n6)
  return (n1 + n2 + n3 + n4 + n5 + n6) % 16
end

-- Construct 28-bit hex string for operating state
-- @param temp number (18-30)
-- @param fan_speed string ("whisper", "low", "medium", "high", "natural")
-- @param oscillation_mode string ("indirect", "direct")
-- @return string 7-character hex code (e.g. "8808A13")
function protocol.build_hex_code(temp, fan_speed, oscillation_mode)
  local n1 = 8
  local n2 = 8
  local n3 = 0
  -- N4: 8 for indirect breeze (간접바람), 0 for direct (일반/직접풍)
  local n4 = (oscillation_mode == "indirect") and 8 or 0

  local temp_num = tonumber(temp) or 24
  if temp_num < protocol.MIN_TEMP then temp_num = protocol.MIN_TEMP end
  if temp_num > protocol.MAX_TEMP then temp_num = protocol.MAX_TEMP end
  local n5 = math.floor(temp_num + 0.5) - protocol.TEMP_OFFSET

  local n6 = protocol.FAN_SPEED_NIBBLE[fan_speed] or 0
  local n7 = protocol.calculate_checksum(n1, n2, n3, n4, n5, n6)

  return string.format("%X%X%X%X%X%X%X", n1, n2, n3, n4, n5, n6, n7)
end

-- Convert 28-bit hex string into Broadlink IR raw packet binary string
-- @param hex_str string (e.g. "8800A4E")
-- @return string binary packet bytes
function protocol.hex_to_broadlink_bytes(hex_str)
  local val = tonumber(hex_str, 16)
  if not val then
    return nil, "Invalid hex code: " .. tostring(hex_str)
  end

  -- Pulse timing definitions in Broadlink tick units (approx 32.8us / tick):
  -- Header mark: ~3180us -> 97 (0x61)
  -- Header space: ~10500us -> 320 (0x0140), encoded as 0x00, 0x01, 0x40
  -- Bit mark: ~525us -> 16 (0x10)
  -- Bit 0 space: ~590us -> 18 (0x12)
  -- Bit 1 space: ~1670us -> 51 (0x33)
  -- Stop mark: ~525us -> 16 (0x10)
  -- Leadout space: ~109ms -> 3333 (0x0d05), encoded as 0x00, 0x0d, 0x05

  local body_parts = {
    string.char(0x61),
    string.char(0x00, 0x01, 0x40)
  }

  for i = 27, 0, -1 do
    local bit = (val >> i) & 1
    table.insert(body_parts, string.char(0x10))
    if bit == 1 then
      table.insert(body_parts, string.char(0x33))
    else
      table.insert(body_parts, string.char(0x12))
    end
  end

  table.insert(body_parts, string.char(0x10))
  table.insert(body_parts, string.char(0x00, 0x0d, 0x05))

  local body = table.concat(body_parts)
  -- Broadlink IR packet: 0x26 (IR), 0x00 (repeat), LE16 body length, body
  local packet = string.pack("<BB I2", 0x26, 0x00, #body) .. body
  return packet
end

-- Pure Lua base64 encoder fallback (used when st.base64 is unavailable, e.g. in standalone tests)
local b64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local function pure_base64_encode(data)
  return ((data:gsub(".", function(x)
    local r, b = "", x:byte()
    for i = 8, 1, -1 do
      r = r .. (b % 2 ^ i - b % 2 ^ (i - 1) > 0 and "1" or "0")
    end
    return r
  end) .. "0000"):gsub("%d%d%d?%d?%d?%d?", function(x)
    if #x < 6 then return "" end
    local c = 0
    for i = 1, 6 do
      c = c + (x:sub(i, i) == "1" and 2 ^ (6 - i) or 0)
    end
    return b64_chars:sub(c + 1, c + 1)
  end) .. ({ "", "==", "=" })[#data % 3 + 1])
end

-- Encode raw binary bytes into Base64 string
function protocol.base64_encode(data)
  local has_st_b64, st_b64 = pcall(require, "st.base64")
  if has_st_b64 and st_b64 and st_b64.encode then
    return st_b64.encode(data)
  end
  return pure_base64_encode(data)
end

-- Encode 28-bit hex string to Broadlink command string ready for broadlink.send_data
-- Format: "base64:<b64 payload>"
function protocol.encode_to_broadlink_code(hex_str)
  local raw_bytes, err = protocol.hex_to_broadlink_bytes(hex_str)
  if not raw_bytes then
    return nil, err
  end
  return "base64:" .. protocol.base64_encode(raw_bytes)
end

return protocol
