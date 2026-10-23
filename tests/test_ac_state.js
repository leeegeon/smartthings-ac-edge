const fs = require('fs');
const path = require('path');

// Resolve packages from scratch node_modules
const scratchModules = path.resolve('C:/Users/dave0/.gemini/antigravity-ide/brain/03860043-61ea-46d0-8b40-3ea2a7101e7c/scratch/node_modules');
const luaparse = require(path.join(scratchModules, 'luaparse'));
const fengari = require(path.join(scratchModules, 'fengari'));
const { lua, lauxlib, lualib } = fengari;

const REPO_ROOT = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

console.log('=== 1. Checking Lua Syntax of all files in src/ ===');
const luaFiles = [
  'src/ac/state.lua',
  'src/ac/protocol.lua',
  'src/ac/init.lua',
  'src/init.lua',
  'src/lifecycles.lua',
  'src/disco.lua',
  'src/broadlink.lua',
  'src/config.lua',
  'src/devicetypes.lua',
];

for (const rel of luaFiles) {
  const fullPath = path.join(REPO_ROOT, rel);
  const code = fs.readFileSync(fullPath, 'utf8');
  try {
    luaparse.parse(code, { luaVersion: '5.3', comments: false, scope: true });
    console.log(`  [PASS] Syntax OK: ${rel}`);
  } catch (err) {
    console.error(`  [FAIL] Syntax Error in ${rel}:`, err.message);
    process.exit(1);
  }
}

console.log('\n=== 2. Running Unit Tests on src/ac/state.lua in Fengari Lua VM ===');

const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);

// Load state.lua
const stateLuaCode = fs.readFileSync(path.join(REPO_ROOT, 'src/ac/state.lua'), 'utf8');

// Define Lua helper script to test state_manager
const testScript = `
local state_manager = (function()
${stateLuaCode}
end)()

local sm = state_manager.new({ coolingSetpoint = 25, powerCoolingMode = "normal" })

-- Helper to check table events
local function find_event(events, cap)
  for _, e in ipairs(events) do
    if e.capability == cap then return e end
  end
  return nil
end

-- Test 1: Rule 1 - Turn on power mode from 25°C -> temp 18, power on
local ev1 = sm:set_power_cooling_mode("on")
assert(#ev1 == 2, "Expected 2 events on power mode activation from 25C, got " .. #ev1)
local e_p1 = find_event(ev1, "powerCoolingMode")
local e_t1 = find_event(ev1, "coolingSetpoint")
assert(e_p1 and e_p1.value == "on", "Expected powerCoolingMode=on")
assert(e_t1 and e_t1.value == 18, "Expected coolingSetpoint=18")
assert(sm.coolingSetpoint == 18, "Internal setpoint should be 18")
assert(sm.powerCoolingMode == "on", "Internal powerCoolingMode should be on")

-- Test 2: Rule 5 - Turn on power mode when already 18°C -> only power mode on
local sm2 = state_manager.new({ coolingSetpoint = 18, powerCoolingMode = "off", acFanSpeed = "medium" })
local ev2 = sm2:set_power_cooling_mode("on")
assert(#ev2 == 1, "Expected only 1 event when already 18C, got " .. #ev2)
assert(find_event(ev2, "powerCoolingMode").value == "on", "Expected powerCoolingMode event")
assert(sm2.coolingSetpoint == 18, "Setpoint should remain 18")

-- Test 3: Rule 2 - While power mode is ON, user sets temp to 22°C -> power mode OFF
local ev3 = sm:set_cooling_setpoint(22)
assert(#ev3 == 2, "Expected 2 events (temp + power mode deactivation), got " .. #ev3)
local e_p3 = find_event(ev3, "powerCoolingMode")
local e_t3 = find_event(ev3, "coolingSetpoint")
assert(e_p3 and e_p3.value == "off", "Expected powerCoolingMode=off")
assert(e_t3 and e_t3.value == 22, "Expected coolingSetpoint=22")
assert(sm.powerCoolingMode == "off", "Internal powerCoolingMode should be off")
assert(sm.coolingSetpoint == 22, "Internal coolingSetpoint should be 22")

-- Test 4: Setting temp to 18 while in power mode does NOT deactivate power mode
sm:set_power_cooling_mode("on")
local ev4 = sm:set_cooling_setpoint(18)
assert(sm.powerCoolingMode == "on", "Power mode should stay ON when setpoint is 18")

-- Test 5: Deactivate power mode -> maintains 18°C
local ev5 = sm:set_power_cooling_mode("off")
assert(#ev5 == 1, "Expected 1 event (power mode off), got " .. #ev5)
assert(find_event(ev5, "powerCoolingMode").value == "off", "Expected powerCoolingMode=off")
assert(sm.coolingSetpoint == 18, "Setpoint should be maintained at 18")
assert(sm.powerCoolingMode == "off", "Internal powerCoolingMode should be off")

-- Test 6: While power mode is ON, user manually changes fan speed -> power mode automatically OFF
sm:set_power_cooling_mode("on")
assert(sm.powerCoolingMode == "on")
local ev6 = sm:set_fan_speed("high")
local e_p6 = find_event(ev6, "powerCoolingMode")
local e_f6 = find_event(ev6, "acFanSpeed")
assert(e_p6 and e_p6.value == "off", "Expected powerCoolingMode auto OFF on manual fan speed change")
assert(e_f6 and e_f6.value == "high", "Expected acFanSpeed=high")
assert(sm.powerCoolingMode == "off", "Internal power mode should be OFF")
assert(sm.acFanSpeed == "high", "Internal fan speed should be high")

-- Test 7: Fan speed 5 levels
local speeds = { "whisper", "low", "medium", "high", "natural" }
for _, sp in ipairs(speeds) do
  local ev_sp = sm:set_fan_speed(sp)
  assert(sm.acFanSpeed == sp, "Wrong internal fan speed")
end

-- Test 8: Reject invalid fan speed
local err_sp = sm:set_fan_speed("power")
assert(err_sp == nil, "Should reject fan speed 'power' as selectable speed")

-- Test 9: Oscillation mode (indirect / direct)
local ev_osc1 = sm:set_oscillation_mode("indirect")
assert(#ev_osc1 == 1 and ev_osc1[1].value == "indirect", "Expected indirect oscillation")
local ev_osc2 = sm:set_oscillation_mode("direct")
assert(#ev_osc2 == 1 and ev_osc2[1].value == "direct", "Expected direct oscillation")
local err_osc = sm:set_oscillation_mode("vertical")
assert(err_osc == nil, "Should reject unconfigured oscillation mode 'vertical'")

-- Test 10: Power (on / off)
local ev_on = sm:set_power("on")
assert(#ev_on == 1 and ev_on[1].value == "on", "Expected power on")
local ev_off = sm:set_power("off")
assert(#ev_off == 1 and ev_off[1].value == "off", "Expected power off")

-- Test 11: Temperature clamping (18 to 30)
sm:set_cooling_setpoint(15)
assert(sm.coolingSetpoint == 18, "Should clamp below MIN_TEMP to 18")
sm:set_cooling_setpoint(35)
assert(sm.coolingSetpoint == 30, "Should clamp above MAX_TEMP to 30")

return "ALL_TESTS_PASSED"
`;

const status = lauxlib.luaL_dostring(L, fengari.to_luastring(testScript));
if (status !== lua.LUA_OK) {
  const err = fengari.to_jsstring(lua.lua_tostring(L, -1));
  console.error('[FAIL] Lua execution error:', err);
  process.exit(1);
}

const result = fengari.to_jsstring(lua.lua_tostring(L, -1));
assert(result === 'ALL_TESTS_PASSED', `Unexpected test result: ${result}`);

console.log('  [PASS] Test 1: Rule 1 (Power mode ON from 25C -> Temp 18C, Power ON)');
console.log('  [PASS] Test 2: Rule 5 (Power mode ON when already 18C -> Power ON, redundant temp event omitted)');
console.log('  [PASS] Test 3: Rule 2 (Set temp to 22C while in Power mode -> Power mode auto OFF, Temp 22C)');
console.log('  [PASS] Test 4: Set temp to 18C while in Power mode -> Power mode preserved)');
console.log('  [PASS] Test 5: Rule 3 & 4 (Power mode OFF -> Temp 18C maintained without restoration)');
console.log('  [PASS] Test 6: Manual fan speed change while in Power mode -> Power mode auto OFF');
console.log('  [PASS] Test 7: Fan speed 5 levels verified (whisper, low, medium, high, natural)');
console.log('  [PASS] Test 8: Invalid fan speed correctly rejected');
console.log('  [PASS] Test 9: Oscillation modes verified (indirect, direct)');
console.log('  [PASS] Test 10: Power switch state verified (on, off)');
console.log('  [PASS] Test 11: Temperature bounds clamping verified (18C ~ 30C)');

console.log('\n=== 3. Running Unit Tests on src/ac/protocol.lua in Fengari Lua VM ===');

const protocolLuaCode = fs.readFileSync(path.join(REPO_ROOT, 'src/ac/protocol.lua'), 'utf8');
const protocolTestScript = `
local protocol = (function()
${protocolLuaCode}
end)()

-- Test 1: Power OFF constant
assert(protocol.POWER_OFF == "88C0051", "POWER_OFF should be 88C0051")

-- Test 2: Jet Cool / Power Cooling constant
assert(protocol.POWER_COOLING == "8810089", "POWER_COOLING should be 8810089")

-- Test 3: Fan speed mapping against physical remote captures (change frames while running)
-- 25C Fan 1 -> 8808A13
local c1 = protocol.build_hex_code(25, "whisper", protocol.FRAME_CHANGE)
assert(c1 == "8808A13", "Expected 8808A13 for 25C fan 1, got " .. tostring(c1))

-- 25C Fan 2 -> 8808A02
local c2 = protocol.build_hex_code(25, "low", protocol.FRAME_CHANGE)
assert(c2 == "8808A02", "Expected 8808A02 for 25C fan 2, got " .. tostring(c2))

-- 25C Fan 3 -> 8808A24
local c3 = protocol.build_hex_code(25, "medium", protocol.FRAME_CHANGE)
assert(c3 == "8808A24", "Expected 8808A24 for 25C fan 3, got " .. tostring(c3))

-- 25C Fan 4 -> 8808A46
local c4 = protocol.build_hex_code(25, "high", protocol.FRAME_CHANGE)
assert(c4 == "8808A46", "Expected 8808A46 for 25C fan 4, got " .. tostring(c4))

-- 25C Natural (5단) -> 8808A57
local c5 = protocol.build_hex_code(25, "natural", protocol.FRAME_CHANGE)
assert(c5 == "8808A57", "Expected 8808A57 for 25C natural, got " .. tostring(c5))

-- Power ON capture from physical remote: 25C Fan 4 -> 8800A4E
local c6 = protocol.build_hex_code(25, "high", protocol.FRAME_POWER_ON)
assert(c6 == "8800A4E", "Expected 8800A4E for 25C power-on fan 4, got " .. tostring(c6))

-- Default frame type is CHANGE
assert(protocol.build_hex_code(25, "high") == "8808A46", "Default frame type should be CHANGE")

-- 18C Fan 1 change -> 880831C ((8+8+0+8+3+1)%16 = 28%16 = 12 = C)
local c7 = protocol.build_hex_code(18, "whisper", protocol.FRAME_CHANGE)
assert(c7 == "880831C", "Expected 880831C for 18C fan 1, got " .. tostring(c7))

-- Test 4: Broadlink packet generation and base64 encoding
local b64_off = protocol.encode_to_broadlink_code(protocol.POWER_OFF)
assert(b64_off and b64_off:find("^base64:"), "Broadlink code should start with base64:")
assert(#b64_off == 99, "Broadlink code should be 99 chars (base64: + 92 chars b64), got " .. #b64_off)

return "PROTOCOL_TESTS_PASSED"
`;

const statusProto = lauxlib.luaL_dostring(L, fengari.to_luastring(protocolTestScript));
if (statusProto !== lua.LUA_OK) {
  const err = fengari.to_jsstring(lua.lua_tostring(L, -1));
  console.error('[FAIL] Protocol Lua execution error:', err);
  process.exit(1);
}

const resultProto = fengari.to_jsstring(lua.lua_tostring(L, -1));
assert(resultProto === 'PROTOCOL_TESTS_PASSED', `Unexpected protocol test result: ${resultProto}`);

console.log('  [PASS] Test 1: Power OFF frame verification (0x88C0051)');
console.log('  [PASS] Test 2: Jet Cool frame verification (0x8810089)');
console.log('  [PASS] Test 3: Fan speed 1~5 codes match physical captures (0x8808A13, 0x8808A02, 0x8808A24, 0x8808A46, 0x8808A57)');
console.log('  [PASS] Test 4: Power-on frame vs running change frame (0x8800A4E vs 0x8808A46)');
console.log('  [PASS] Test 5: Broadlink IR packet structure & base64 encoding verified');

console.log('\nAll Lua Syntax & Unit Tests Passed Successfully!');

