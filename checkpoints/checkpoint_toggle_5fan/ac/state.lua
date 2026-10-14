-- src/ac/state.lua
-- Pure Lua AC state manager for LG MNQ0720C2S
-- Enforces power mode, setpoint interlock rules, and maintains UI state.

local state_manager = {}
state_manager.__index = state_manager

-- Supported constants and valid ranges
state_manager.MIN_TEMP = 18
state_manager.MAX_TEMP = 30
state_manager.DEFAULT_TEMP = 24
state_manager.POWER_MODE_TEMP = 18

state_manager.VALID_POWER = {
  ["on"] = true,
  ["off"] = true,
}

state_manager.VALID_POWER_MODES = {
  ["on"] = true,
  ["off"] = true,
  ["normal"] = true,
  ["power"] = true,
}

state_manager.VALID_FAN_SPEEDS = {
  ["whisper"] = true, -- 미약풍
  ["low"] = true,     -- 약풍
  ["medium"] = true,  -- 중풍
  ["high"] = true,    -- 강풍
  ["natural"] = true, -- 자연풍
}

state_manager.VALID_OSCILLATION_MODES = {
  ["indirect"] = true, -- 간접바람
  ["direct"] = true,   -- 직접바람
}

function state_manager.new(initial_state)
  local self = setmetatable({}, state_manager)
  initial_state = initial_state or {}

  self.power = initial_state.power or "off"
  self.coolingSetpoint = initial_state.coolingSetpoint or state_manager.DEFAULT_TEMP
  self.acFanSpeed = initial_state.acFanSpeed or "low"
  self.fanOscillationMode = initial_state.fanOscillationMode or "direct"

  local raw_pcm = initial_state.powerCoolingMode or "off"
  if raw_pcm == "power" or raw_pcm == "on" then
    self.powerCoolingMode = "on"
  else
    self.powerCoolingMode = "off"
  end

  return self
end

function state_manager:get_state()
  return {
    power = self.power,
    coolingSetpoint = self.coolingSetpoint,
    acFanSpeed = self.acFanSpeed,
    fanOscillationMode = self.fanOscillationMode,
    powerCoolingMode = self.powerCoolingMode,
  }
end

-- Rule 1, 3, 4, 5: Set Power Cooling Mode (on / off toggle)
function state_manager:set_power_cooling_mode(mode)
  if not state_manager.VALID_POWER_MODES[mode] then
    return nil, "Invalid power cooling mode: " .. tostring(mode)
  end

  local target_mode = (mode == "power" or mode == "on") and "on" or "off"
  local events = {}
  local is_currently_on = (self.powerCoolingMode == "on" or self.powerCoolingMode == "power")
  local mode_changed = (is_currently_on ~= (target_mode == "on"))

  if target_mode == "on" then
    -- Rule 1: 파워모드를 켜면 파워모드 상태를 활성화하고 설정 온도를 18°C로 변경한다.
    if mode_changed then
      self.powerCoolingMode = "on"
      table.insert(events, { capability = "powerCoolingMode", value = "on" })
    end

    -- Rule 5: 사용자가 파워모드를 켰을 때 이미 온도가 18°C라면 파워모드 상태만 활성화한다.
    if self.coolingSetpoint ~= state_manager.POWER_MODE_TEMP then
      self.coolingSetpoint = state_manager.POWER_MODE_TEMP
      table.insert(events, { capability = "coolingSetpoint", value = state_manager.POWER_MODE_TEMP, unit = "C" })
    end
  else -- target_mode == "off"
    -- Rule 3 & 4: 파워모드를 끄더라도 설정 온도는 18°C로 유지한다. 다른 값으로 복원하지 않는다.
    if mode_changed then
      self.powerCoolingMode = "off"
      table.insert(events, { capability = "powerCoolingMode", value = "off" })
    end
    -- 설정 온도는 복원하지 않고 현재 값을 유지하므로 온도 변경 이벤트 없음
  end

  return events
end

-- Rule 2: Set Cooling Setpoint
function state_manager:set_cooling_setpoint(temp)
  local num_temp = tonumber(temp)
  if not num_temp then
    return nil, "Invalid temperature: " .. tostring(temp)
  end

  -- Round to integer and clamp to valid range
  num_temp = math.floor(num_temp + 0.5)
  if num_temp < state_manager.MIN_TEMP then
    num_temp = state_manager.MIN_TEMP
  elseif num_temp > state_manager.MAX_TEMP then
    num_temp = state_manager.MAX_TEMP
  end

  local events = {}

  -- Rule 2: 파워모드가 켜진 상태에서 사용자가 18°C 이외의 온도를 설정하면 파워모드를 자동으로 해제한다.
  local is_power_on = (self.powerCoolingMode == "on" or self.powerCoolingMode == "power")
  if is_power_on and num_temp ~= state_manager.POWER_MODE_TEMP then
    self.powerCoolingMode = "off"
    table.insert(events, { capability = "powerCoolingMode", value = "off" })
  end

  if self.coolingSetpoint ~= num_temp or #events > 0 then
    self.coolingSetpoint = num_temp
    table.insert(events, { capability = "coolingSetpoint", value = num_temp, unit = "C" })
  end

  return events
end

-- Set Power (switch on / off)
function state_manager:set_power(power)
  if not state_manager.VALID_POWER[power] then
    return nil, "Invalid power state: " .. tostring(power)
  end

  local events = {}
  if self.power ~= power then
    self.power = power
    table.insert(events, { capability = "switch", value = power })
  end
  return events
end

-- Set Fan Speed (5 levels)
function state_manager:set_fan_speed(speed)
  if not state_manager.VALID_FAN_SPEEDS[speed] then
    return nil, "Invalid fan speed: " .. tostring(speed)
  end

  local events = {}
  if self.acFanSpeed ~= speed then
    self.acFanSpeed = speed
    table.insert(events, { capability = "acFanSpeed", value = speed })
  end
  return events
end

-- Set Oscillation Mode (indirect / direct)
function state_manager:set_oscillation_mode(mode)
  if not state_manager.VALID_OSCILLATION_MODES[mode] then
    return nil, "Invalid oscillation mode: " .. tostring(mode)
  end

  local events = {}
  if self.fanOscillationMode ~= mode then
    self.fanOscillationMode = mode
    table.insert(events, { capability = "fanOscillationMode", value = mode })
  end
  return events
end

return state_manager
