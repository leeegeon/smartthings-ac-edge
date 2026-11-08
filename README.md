# SmartThings Edge Driver for Broadlink RM & LG Air Conditioner

A custom **Samsung SmartThings Edge Driver** (LAN/Lua) that enables local network control of **LG Air Conditioners** through **Broadlink IR hardware** (e.g., Broadlink RM mini 3).

> [!NOTE]
> **Attribution & Origin:**
> This repository is forked and significantly evolved from [frostmar/smartthings-broadlink-edge](https://github.com/frostmar/smartthings-broadlink-edge) by Mark Frost (licensed under the **MIT License**).
> The original project provided basic IR learning and virtual remote buttons. This fork transforms it into a dedicated, stateful **LG Air Conditioner controller** supporting LG's 28-bit IR protocol, dedicated SmartThings profiles, custom capabilities, and bidirectional state synchronization.

---

## 🌟 Key Features

### 1. Dedicated LG Air Conditioner Interface
- **Power ON / OFF:**
  - Uses explicit LG power-on frame (`N4=0`) and dedicated power-off frame (`0x88C0051`). Unlike ambiguous toggle remotes, this ensures the AC never gets out of sync when turning on or off.
- **Thermostat Cooling Setpoint:**
  - Precise temperature adjustment from **18°C to 30°C** in 1°C increments (`thermostatCoolingSetpoint`).
- **5-Stage Fan Speed (`acFanSpeed`):**
  - Full support for all 5 fan speed levels supported by LG remotes:
    - **Whisper (1단 - 미풍)**
    - **Low (2단 - 약풍)**
    - **Medium (3단 - 중풍)**
    - **High (4단 - 강풍)**
    - **Natural / Auto (5단 - 자연풍/자동)**
- **Jet Cool / Power Cooling (`powerCoolingMode`):**
  - Dedicated rapid cooling toggle.
  - Automatically interlocks with fan speed adjustments (e.g., setting fan speed to level 5 auto-clears power cooling mode).
- **Vane Angle / Indirect Wind (`fanOscillationMode`):**
  - Ceiling / Indirect breeze angle (`0x881309D`) and Direct wind angle (`0x8813048`).
  - **No Double-Beep:** Optimized state transmission prevents redundant vane frame re-sends during temperature/fan adjustments, eliminating annoying double beeps.

### 2. Reliable Local LAN Execution
- **100% Local Processing:** Communicates directly with Broadlink RM devices over your local Wi-Fi network via UDP (port 80) with AES-128-CBC encryption.
- **Ultra-low Latency:** Instant response with zero cloud dependency.
- **Automatic LAN Discovery:** Automatically locates Broadlink hardware on the network using UDP broadcast and caches IP addresses.

### 3. Parent-Child Device Architecture
- **Bridge Device (Parent):** Manages connection to the physical Broadlink RM unit. Allows creating virtual remote buttons or dedicated AC child devices, as well as learning raw IR codes.
- **LG Air Conditioner Device (Child):** Operates as an independent SmartThings device. Can be assigned to any room (Living Room, Bedroom, etc.) and integrated with SmartThings Automations, Bixby, Google Assistant, or Alexa.

---

## 📱 System Architecture

```
 SmartThings App / Routines / Voice Assistants
                     │
                     ▼
       SmartThings Hub (Edge Driver: Lua)
                     │
                     │ Local Network (UDP Port 80, AES-128-CBC)
                     ▼
         Broadlink RM (e.g. RM mini 3)
                     │
                     │ Infrared (38 kHz, LG 28-bit Protocol)
                     ▼
            Physical LG Air Conditioner
```

---

## 🛠️ Supported Hardware

### Broadlink Hardware
- **Broadlink RM mini 3** (Device types: `0x5f36`, `0x6507`, `0x6508`, etc. Defined in `src/devicetypes.lua`)
- Supports devices compatible with the Broadlink V1/V2 UDP encryption protocol.

### Air Conditioners
- **LG Whisen Air Conditioners** using the standard **LG 28-bit IR protocol (LG2 variant)**.
- Compatible with most LG split, window, wall-mounted, and ceiling/cassette models (field-verified with model `MNQ0720C2S`).

---

## 🚀 Installation & Setup

### Prerequisites
- [Samsung SmartThings CLI](https://github.com/SmartThingsCommunity/smartthings-cli) installed and logged in:
  ```bash
  smartthings edge:channels
  ```
- SmartThings Hub v2, v3, or SmartThings Station on the same local subnet as the Broadlink device.

### 1. (Optional) Custom Capabilities
If you are deploying this driver under your own SmartThings developer account, register the custom capabilities located in `capabilities/`:

```bash
# 1. Fan Speed Capability
smartthings capabilities:create -i capabilities/optiontomorrow57882.acFanSpeed.yaml
smartthings capabilities:presentation:create <YOUR_NAMESPACE>.acFanSpeed 1 -i capabilities/optiontomorrow57882.acFanSpeed.presentation.yaml

# 2. Power Cooling Capability
smartthings capabilities:create -i capabilities/optiontomorrow57882.powerCoolingMode.yaml
smartthings capabilities:presentation:create <YOUR_NAMESPACE>.powerCoolingMode 1 -i capabilities/optiontomorrow57882.powerCoolingMode.presentation.yaml
```
*(If your namespace differs from `optiontomorrow57882`, update the capability ID references in `profiles/BroadlinkRM-AirConditioner.yaml` and `src/ac/init.lua` accordingly).*

### 2. Package & Install Driver

```bash
# 1. Package the driver
smartthings edge:drivers:package .

# 2. Assign the driver to your channel
smartthings edge:channels:assign <DRIVER_ID> --channel <CHANNEL_ID>

# 3. Install the driver to your hub
smartthings edge:drivers:install <DRIVER_ID> --channel <CHANNEL_ID> --hub <HUB_ID>
```

### 3. Monitor Logs (Optional)
To verify discovery and command transmissions in real-time:
```bash
smartthings edge:drivers:logcat --hub-address <YOUR_HUB_IP>
```

### 4. Add Device in SmartThings App
1. Open the **SmartThings mobile app**.
2. Tap **`+`** (Add) → **Add device** → **Scan for nearby devices**.
3. Your Broadlink device will be automatically detected and added as **`Broadlink IR Remote`** (Parent device).
4. Open the newly added `Broadlink IR Remote` device.
5. Tap the **`newAirConditionerDevice`** button.
6. A new child device named **`LG Air Conditioner #1`** will appear in your device list.
7. Move the AC device to your desired room and start controlling!

---

## 📂 Repository Structure

```
smartthings-ac-edge/
├── config.yaml                       # Driver package metadata (LAN & Discovery permissions)
├── device-config.yaml                # Device presentation configuration
├── LICENSE                           # MIT License with original attribution
├── README.md                         # This documentation
├── pronto2broadlink.py               # Utility script for converting Pronto Hex to Broadlink format
├── capabilities/                     # Custom SmartThings capability definitions
│   ├── optiontomorrow57882.acFanSpeed.*
│   ├── optiontomorrow57882.powerCoolingMode.*
│   ├── forgottenpeace60271.learnCode.*
│   └── i18n/                         # Korean localization for capabilities
├── profiles/                         # Device profiles
│   ├── BroadlinkRM.yaml              # Parent bridge profile
│   ├── BroadlinkRM-AirConditioner.yaml # LG AC child profile (AirConditioner category)
│   └── BroadlinkRM-VirtualRemote-1btn.yaml # 1-button virtual remote profile
├── src/                              # Driver source code (Lua)
│   ├── init.lua                      # Driver entry point & parent event handlers
│   ├── broadlink.lua                 # Broadlink UDP protocol, packet encryption & dispatch
│   ├── disco.lua                     # LAN discovery routines
│   ├── devicetypes.lua               # Supported Broadlink model IDs
│   ├── config.lua                    # Communication constants and default keys
│   ├── lifecycles.lua                # Device init/added/removed lifecycle handlers
│   ├── ac/                           # LG Air Conditioner sub-driver
│   │   ├── init.lua                  # Sub-driver capability handlers & Broadlink bridge binding
│   │   ├── protocol.lua              # LG 28-bit IR protocol encoder & Broadlink packet builder
│   │   └── state.lua                 # AC state manager (Power, Temp, Fan, Vane, Jet Cool)
│   └── lockbox/                      # AES-128-CBC encryption library
└── tests/
    ├── test_ac_state.js              # Unit tests for AC state transitions and Lua syntax check
    └── validate_yaml.py              # YAML validator for capability definitions
```

---

## 🧪 Testing

You can run syntax checks and state machine unit tests locally using Node.js:

```bash
npm install luaparse fengari
node tests/test_ac_state.js
```

---

## 📜 License & Acknowledgments

This project is released under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.

### Upstream & Third-Party Credits
- **[Mark Frost](https://github.com/frostmar/smartthings-broadlink-edge)**: Author of the original `smartthings-broadlink-edge` driver that provided the foundation for Broadlink LAN discovery and packet encryption.
- **[Ross Tyler](https://github.com/rtyle/lua-lockbox/tree/smartthings-edge)**: Author of the SmartThings Edge-compatible fork of `lua-lockbox` used for AES-128-CBC encryption.
- **[Matthew Garrett](https://github.com/mjg59/python-broadlink)**: For reverse-engineering the Broadlink communication protocol.
- **[Scott Kyle](https://gist.github.com/appden/42d5272bf128125b019c45bc2ed3311f)**: Author of `pronto2broadlink.py`.
