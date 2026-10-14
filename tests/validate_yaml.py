import os
import sys
import yaml

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def test_yaml_files():
    print("=== 1. Checking YAML Syntax and Structure ===")
    yaml_files = [
        "config.yaml",
        "device-config.yaml",
        "profiles/BroadlinkRM.yaml",
        "profiles/BroadlinkRM-VirtualRemote-1btn.yaml",
        "profiles/BroadlinkRM-AirConditioner.yaml",
        "capabilities/forgottenpeace60271.learnCode.yaml",
        "capabilities/forgottenpeace60271.learnCode.presentation.yaml",
        "capabilities/forgottenpeace60271.powerCoolingMode.yaml",
        "capabilities/forgottenpeace60271.powerCoolingMode.presentation.yaml",
        "capabilities/forgottenpeace60271.acFanSpeed.yaml",
        "capabilities/forgottenpeace60271.acFanSpeed.presentation.yaml",
    ]

    docs = {}
    for rel_path in yaml_files:
        full_path = os.path.join(REPO_ROOT, rel_path)
        assert os.path.exists(full_path), f"File not found: {rel_path}"
        with open(full_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            assert data is not None, f"Failed to parse or empty YAML: {rel_path}"
            docs[rel_path] = data
            print(f"  [PASS] {rel_path} parsed successfully.")

    print("\n=== 2. Validating Device Profile: BroadlinkRM-AirConditioner ===")
    ac_profile = docs["profiles/BroadlinkRM-AirConditioner.yaml"]
    assert ac_profile.get("name") in ["BroadlinkRM-AirConditioner.v1", "BroadlinkRM-AirConditioner.v2"]
    main_comp = next((c for c in ac_profile["components"] if c["id"] == "main"), None)
    assert main_comp is not None, "Missing 'main' component in AC profile"
    
    cap_ids = [c["id"] for c in main_comp["capabilities"]]
    has_switch = "switch" in cap_ids
    has_setpoint = "thermostatCoolingSetpoint" in cap_ids
    has_fan_osc = "fanOscillationMode" in cap_ids
    has_fan_speed = any(c in cap_ids for c in ["optiontomorrow57882.acFanSpeed", "forgottenpeace60271.acFanSpeed"])
    has_power_mode = any(c in cap_ids for c in ["optiontomorrow57882.powerCoolingMode", "forgottenpeace60271.powerCoolingMode"])
    assert has_switch, "Missing switch capability"
    assert has_setpoint, "Missing thermostatCoolingSetpoint capability"
    assert has_fan_osc, "Missing fanOscillationMode capability"
    assert has_fan_speed, "Missing acFanSpeed capability"
    assert has_power_mode, "Missing powerCoolingMode capability"
    print(f"  [PASS] All 5 required capabilities present in AC profile: {cap_ids}")

    # Check coolingSetpoint range
    setpoint_cap = next(c for c in main_comp["capabilities"] if c["id"] == "thermostatCoolingSetpoint")
    range_config = setpoint_cap.get("config", {}).get("values", [{}])[0].get("range")
    assert range_config == [18, 30], f"Expected coolingSetpoint range [18, 30], got {range_config}"
    print(f"  [PASS] coolingSetpoint range verified: {range_config}")

    print("\n=== 3. Validating Power Cooling Mode Capability & Presentation ===")
    power_cap = docs["capabilities/forgottenpeace60271.powerCoolingMode.yaml"]
    power_pres = docs["capabilities/forgottenpeace60271.powerCoolingMode.presentation.yaml"]
    assert power_cap["id"] == "forgottenpeace60271.powerCoolingMode"
    assert power_pres["id"] == "forgottenpeace60271.powerCoolingMode"
    
    cap_enums = power_cap["attributes"]["powerCoolingMode"]["schema"]["properties"]["value"]["enum"]
    assert set(cap_enums) == {"normal", "power"}
    
    # Check detailView alternatives
    detail_list = next(item for item in power_pres["detailView"] if item.get("displayType") == "list")
    alts = {alt["key"]: alt["value"] for alt in detail_list["list"]["alternatives"]}
    assert alts.get("normal") == "일반 냉방", f"Expected '일반 냉방', got {alts.get('normal')}"
    assert alts.get("power") == "파워 냉방", f"Expected '파워 냉방', got {alts.get('power')}"
    print(f"  [PASS] Power mode alternatives verified: {alts}")

    print("\n=== 4. Validating AC Fan Speed Capability & Presentation ===")
    fan_cap = docs["capabilities/forgottenpeace60271.acFanSpeed.yaml"]
    fan_pres = docs["capabilities/forgottenpeace60271.acFanSpeed.presentation.yaml"]
    assert fan_cap["id"] == "forgottenpeace60271.acFanSpeed"
    assert fan_pres["id"] == "forgottenpeace60271.acFanSpeed"
    
    fan_enums = fan_cap["attributes"]["acFanSpeed"]["schema"]["properties"]["value"]["enum"]
    expected_fan_order = ["whisper", "low", "medium", "high", "natural"]
    assert fan_enums == expected_fan_order, f"Expected {expected_fan_order}, got {fan_enums}"

    # Check detailView alternatives and exact order: 미약풍 -> 약풍 -> 중풍 -> 강풍 -> 자연풍
    fan_detail = next(item for item in fan_pres["detailView"] if item.get("displayType") == "list")
    fan_alts = fan_detail["list"]["alternatives"]
    actual_order = [(alt["key"], alt["value"]) for alt in fan_alts]
    expected_order = [
        ("whisper", "미약풍"),
        ("low", "약풍"),
        ("medium", "중풍"),
        ("high", "강풍"),
        ("natural", "자연풍"),
    ]
    assert actual_order == expected_order, f"Fan speed order mismatch: {actual_order} != {expected_order}"
    print(f"  [PASS] Fan speed 5-level order verified: {[item[1] for item in actual_order]}")

    print("\n=== 5. Validating Device Presentation Configuration: device-config.yaml ===")
    dev_config = docs["device-config.yaml"]
    detail_caps = [item["capability"] for item in dev_config["detailView"]]
    assert "switch" in detail_caps
    assert "thermostatCoolingSetpoint" in detail_caps
    assert "fanOscillationMode" in detail_caps
    assert any(c in detail_caps for c in ["optiontomorrow57882.acFanSpeed", "forgottenpeace60271.acFanSpeed"])
    assert any(c in detail_caps for c in ["optiontomorrow57882.powerCoolingMode", "forgottenpeace60271.powerCoolingMode"])
    print(f"  [PASS] device-config.yaml contains all required capabilities in detailView: {detail_caps}")

    print("\n=== 6. Validating BroadlinkRM.yaml Parent Component Extension ===")
    parent_profile = docs["profiles/BroadlinkRM.yaml"]
    comp_ids = [c["id"] for c in parent_profile["components"]]
    assert "newAirConditionerDevice" in comp_ids, "BroadlinkRM.yaml missing newAirConditionerDevice component"
    print(f"  [PASS] Parent profile has newAirConditionerDevice component: {comp_ids}")

    print("\nAll YAML and Schema Validation Tests Passed Successfully!")

if __name__ == "__main__":
    test_yaml_files()
