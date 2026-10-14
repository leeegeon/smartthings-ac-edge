\# AGENTS.md — SmartThings Broadlink Air Conditioner Edge Driver



\## 1. Project Overview



Develop a custom Samsung SmartThings Edge Driver for controlling a real air conditioner through Broadlink infrared (IR) hardware.



The project should reuse the existing Broadlink communication and IR-control implementation wherever practical, while providing a simplified, air-conditioner-specific SmartThings device interface.



The initial reference repository is:



\- Repository: https://github.com/frostmar/smartthings-broadlink-edge

\- Reference SmartThings community topic: https://community.smartthings.com/t/edge-broadlink-ir-remote-control-driver-rm-mini-3/274700

\- Related virtual-device project: https://community.smartthings.com/t/st-edge-vedge-creator-a-virtual-device-generator-for-end-users/231786



These are reference materials, not proof that every device, function, or protocol is compatible with this project. Inspect the actual repository and verify claims against its source code, documentation, and available test results.



\### Primary objective



Create a dedicated SmartThings air conditioner device with a clean, minimal control interface. The driver should communicate with Broadlink hardware to transmit IR commands to the physical air conditioner.



The intended architecture is:



SmartThings app

→ Custom SmartThings Edge Driver

→ Existing or adapted Broadlink communication layer

→ Broadlink IR device

→ Physical air conditioner



The implementation should be designed around the actual capabilities of the selected Broadlink hardware and the IR protocol of the target air conditioner.



\### Current project status



\- No Broadlink hardware has been purchased yet.

\- The existing reference repository has not yet been fully audited for this project.

\- Compatibility with the intended hardware has not yet been experimentally verified.

\- The target air conditioner model and its exact IR protocol have not yet been confirmed.

\- The initial task is repository analysis and architecture planning, not an assumption that a complete implementation can already be produced or tested.



Do not claim that physical hardware tests have passed unless actual test evidence is available.



\---



\## 2. Design Priorities



Follow these priorities in order:



1\. \*\*Reuse proven functionality.\*\* Prefer adapting the existing Broadlink communication, device-discovery, IR-learning, IR-storage, and IR-transmission implementation over rewriting it.

2\. \*\*Provide a purpose-built AC interface.\*\* The SmartThings device must expose only the controls that are useful for operating an air conditioner.

3\. \*\*Maintain protocol correctness.\*\* IR commands must match the target air conditioner's actual command format and state model.

4\. \*\*Separate UI, device state, and transport logic.\*\* Keep the SmartThings capability handlers, AC state management, and Broadlink transport implementation logically distinct.

5\. \*\*Make hardware compatibility explicit.\*\* Verify the supported Broadlink model and protocol before relying on undocumented behavior.

6\. \*\*Keep the implementation maintainable.\*\* Prefer small, well-defined changes over broad rewrites of the reference driver.

7\. \*\*Be honest about verification.\*\* Distinguish static source-code analysis, simulated tests, successful command transmission, and confirmed physical AC operation.



If these priorities conflict, explain the trade-offs before choosing a substantially different architecture.



\---



\## 3. Target SmartThings User Interface



The desired result is a dedicated air conditioner device, not a general-purpose IR remote.



The current virtual-device workflow based on TAustin Virtual Devices V2.95 did not provide the desired degree of control over the device type and exposed controls. The purpose of this custom driver is to gain direct control over the device profile and its capabilities.



The desired interface should contain the following controls.



\### 3.1 Power



\- A single power control.

\- Support turning the air conditioner on and off.

\- Avoid duplicate power controls.

\- If the air conditioner's IR protocol requires a full-state command rather than an independent power command, implement power changes through the appropriate complete-state command.



\### 3.2 Operating mode



Expose only these four modes:



\- Cool

\- Heat

\- Auto

\- Fan



Do not expose unrelated modes such as Dry unless a future requirement explicitly requests them.



Do not assume that every physical air conditioner supports all four modes. Hardware and model capabilities must be verified. If a mode is unsupported by the target air conditioner, do not pretend that the command is available or that the mode change succeeded.



Use standard SmartThings capabilities where they adequately represent the required controls. Investigate the appropriate standard capability and its command/state conventions before implementing custom capabilities.



\### 3.3 Temperature



\- Provide one temperature adjustment control.

\- Avoid duplicate temperature controls, such as two separate controls for the same target temperature.

\- Use a single coherent target-temperature state.

\- Respect the actual air conditioner's supported temperature range and increment.

\- Do not assume a particular temperature range or step size until the target model is known.



If a standard SmartThings thermostat capability exposes more controls than desired, investigate the available standard capabilities and profile options before deciding whether a custom capability is necessary.



The preferred solution is to achieve the desired interface with standard capabilities whenever possible, without introducing unnecessary custom UI dependencies.



\### 3.4 Fan speed



\- Provide one fan-speed control.

\- Support only the fan-speed values that are meaningful for the target air conditioner.

\- Determine the correct mapping between SmartThings fan-speed values and the air conditioner's IR protocol.

\- Do not claim that fan speed changed merely because the driver accepted a command.



\### 3.5 Interface acceptance criteria



The final interface should:



\- Clearly identify the device as an air conditioner.

\- Display one power control, one operating-mode control, one temperature control, and one fan-speed control.

\- Avoid duplicate or unrelated controls.

\- Avoid exposing raw IR-learning or arbitrary-remote controls in the normal AC operating interface.

\- Remain compatible with the SmartThings device profile and the capabilities actually implemented by the driver.



The exact rendered interface may depend on the SmartThings app and its support for the selected capabilities. Do not guarantee a precise visual layout solely from the driver profile definition. Verify it in the app when hardware and a compatible installation environment are available.



\---



\## 4. Broadlink Communication Layer



\### 4.1 Reuse before rewriting



Inspect the reference repository to determine how it implements:



\- Broadlink device discovery.

\- Device identification and model detection.

\- Local network communication.

\- Authentication or packet initialization, if applicable.

\- IR learning.

\- Learned-code storage and retrieval.

\- IR transmission.

\- Error handling and communication timeouts.

\- SmartThings Edge device lifecycle and driver initialization.



Identify the actual files, functions, event handlers, and data structures responsible for these operations.



Do not invent function names or assume a particular source-file structure. Report findings using exact paths and symbols that exist in the checked-out repository.



\### 4.2 Preserve working transport logic



Prefer reusing existing communication code with a thin AC-specific layer above it.



The intended separation is:



\- \*\*Transport layer:\*\* Communicates with Broadlink hardware.

\- \*\*IR layer:\*\* Learns, stores, selects, and transmits IR codes.

\- \*\*AC state layer:\*\* Tracks the requested power, mode, target temperature, and fan speed.

\- \*\*SmartThings adapter:\*\* Converts SmartThings commands into AC state changes and reports the resulting driver state.

\- \*\*Device profile:\*\* Defines the capabilities shown by the SmartThings app.



These may map to different files or modules depending on the existing repository. Do not reorganize the entire project merely to match this conceptual structure if the existing structure can support it with smaller changes.



\### 4.3 Hardware compatibility



The reference project has previously been identified as targeting Broadlink RM Mini 3, but its actual supported models and protocol implementation must be verified directly against the current source code and reliable documentation.



In particular:



\- Determine how the driver identifies a Broadlink device.

\- Determine whether model support is hard-coded or derived from device responses.

\- Determine which packet formats, authentication steps, or transport assumptions are model-specific.

\- Check whether a newer model, including an RM4 Mini, requires protocol changes.

\- Do not assume that RM Mini 3 and RM4 Mini are interchangeable.

\- Do not assume that compatibility with one Broadlink model proves compatibility with all Broadlink devices.



Since hardware has not yet been purchased, recommend hardware only after identifying which model the existing implementation is most likely to support with the least modification.



If compatibility cannot be established from source code and reliable documentation, label it as unverified and identify the smallest practical experiment needed to confirm it.



\---



\## 5. Air Conditioner IR Protocol and State Management



This is a core design constraint.



Many air conditioners do not use independent IR commands for every individual control. Instead, a single IR transmission may encode the entire desired operating state, including power, mode, temperature, and fan speed.



For example, the desired state might be:



\- Power: On

\- Mode: Cool

\- Target temperature: 24 °C

\- Fan speed: Auto



A change to only the temperature may still require transmitting an IR message representing the complete state.



This behavior must be verified for the target air conditioner. Do not assume that all AC models use the same protocol.



\### 5.1 State representation



Design an explicit AC state model containing, at minimum:



\- Power state.

\- Operating mode.

\- Target temperature.

\- Fan speed.



Use consistent internal representations and define mappings to the values expected by the SmartThings capabilities and the target AC protocol.



Keep the internal state model separate from the transport implementation.



\### 5.2 State transitions



When the user changes a setting:



1\. Receive the SmartThings command.

2\. Validate the requested value.

3\. Update the requested AC state.

4\. Construct the correct IR command or select the matching learned code.

5\. Transmit the command through the Broadlink communication layer.

6\. Report state according to the actual level of confirmation available.



Avoid sending contradictory commands or unnecessarily duplicating transmissions. If multiple commands arrive in quick succession, consider whether the implementation needs serialization, debouncing, or state coalescing. Make that decision based on the actual transport behavior and protocol requirements.



\### 5.3 Learned codes versus generated codes



Two approaches may be possible, depending on the target AC:



\*\*Approach A: Learned command mapping\*\*



Learn and store IR codes for the supported combinations of power, mode, temperature, and fan speed.



This can be useful when the existing Broadlink implementation supports learning and transmission but the AC protocol cannot be generated directly.



However, a naive lookup table can grow very large. Evaluate whether the target air conditioner's state space can be represented with a manageable number of learned codes.



\*\*Approach B: Protocol-aware command generation\*\*



Decode the AC protocol and construct the complete IR message programmatically from the requested state.



This can be more flexible and scalable, but requires reliable protocol knowledge, correct checksums or integrity fields where applicable, and correct timing and transmission formatting.



Do not choose either approach before examining the target AC protocol and the reference driver's actual IR capabilities.



A hybrid approach is acceptable if it has a clear justification.



\### 5.4 State reporting and limitations of IR



IR is generally a one-way control channel. Successful transmission does not necessarily prove that the air conditioner received or executed the command.



Unless the system has an independent feedback mechanism, distinguish among:



\- The command requested by the user.

\- The command accepted for transmission by the driver.

\- The command transmitted successfully by the Broadlink device.

\- The actual physical state of the air conditioner.



Do not claim actual state confirmation when only transmission success is known.



If the driver optimistically reports the requested state, document that behavior and its limitations. Consider what should happen after a driver restart, a failed transmission, a manual change using the original remote, or an external power interruption.



Do not add a fictitious temperature sensor or real-state feedback merely to satisfy a SmartThings capability.



\---



\## 6. SmartThings Edge Driver Architecture



Inspect the existing driver before selecting the final capability and profile definitions.



Determine:



\- How the driver registers and initializes.

\- How device profiles are defined.

\- Which capabilities and attributes are currently exposed.

\- How command handlers are registered.

\- How capability events are emitted.

\- How the driver manages device discovery and lifecycle events.

\- How the driver logs errors and communicates diagnostic information.

\- How the project is packaged, installed, and deployed.



Use the existing project conventions where appropriate.



\### 6.1 Prefer standard capabilities



Prefer standard SmartThings capabilities for power, thermostat mode, target temperature, and fan speed when they can provide the required semantics and UI.



Before using a capability, verify:



\- Its exact command and attribute names.

\- Required argument formats and value ranges.

\- Its behavior in the SmartThings app.

\- Whether it introduces extra controls or duplicate temperature representations.

\- Whether the Edge Driver API and current project environment support it.



Do not invent capability identifiers, command names, or attribute names.



If standard capabilities cannot provide the required minimal interface, explain why and propose the smallest custom-capability solution that meets the requirements.



\### 6.2 Avoid unnecessary scope



The initial product is an AC controller, not a universal remote-control application.



Do not expose or implement unrelated user-facing features unless they are needed for the AC workflow or already required internally by the reusable transport layer.



Internal support for discovery, learning, logging, and diagnostics may remain available when necessary, but it should not clutter the ordinary AC device interface.



\### 6.3 Preserve existing functionality



If the reference repository contains working features that are unrelated to the new AC profile:



\- Avoid removing them unless they conflict with the new architecture.

\- Prefer creating an AC-specific profile or device implementation over destructive modifications to general-purpose behavior.

\- Determine whether the best solution is to extend the existing driver, add a separate driver, or create a separate device type within the existing project.

\- Choose the least disruptive option that satisfies the requirements and explain the choice.



\---



\## 7. Development Workflow



Work incrementally and maintain a clear separation between investigation, design, implementation, and verification.



\### Phase 1: Repository audit



Initially, perform code-only analysis.



Do not edit files until the relevant architecture, transport entry points, device compatibility assumptions, and capability definitions have been identified.



Inspect:



\- Repository tree and project metadata.

\- README and installation instructions.

\- Driver manifest and profile definitions.

\- Device discovery and initialization.

\- Broadlink communication and model identification.

\- IR learning, storage, and transmission.

\- Capability command handlers and emitted events.

\- Tests, examples, known limitations, and deployment instructions.



Provide a concise report with:



1\. Relevant file paths.

2\. Actual function or handler names.

3\. The end-to-end path from a SmartThings command to an IR transmission.

4\. The existing code that can be reused.

5\. The changes required for the AC-specific interface.

6\. Known hardware and protocol limitations.

7\. Questions that cannot be answered without the target hardware or AC model.



Clearly distinguish facts observed in the source from inferences and unresolved questions.



\### Phase 2: Architecture proposal



Before modifying the repository, propose:



\- The minimal device profile.

\- The capability-to-command mapping.

\- The AC state representation.

\- The Broadlink transport integration.

\- The IR code storage or generation strategy.

\- Error handling and state-reporting behavior.

\- A list of files to create or modify.



Explain why each proposed change is necessary.



Avoid implementing speculative compatibility fixes for hardware that is not available.



\### Phase 3: Minimal implementation



After the architecture is reviewed, implement the smallest functional increment.



Prioritize:



1\. A minimal AC device profile.

2\. Correct registration of the desired capabilities.

3\. Command handlers that update and validate AC state.

4\. Reuse of the existing Broadlink transmission implementation.

5\. A clear interface between state management and IR command generation or lookup.

6\. Logging and error handling sufficient for troubleshooting.



Do not claim complete AC operation until the target protocol and actual transmission path have been verified.



\### Phase 4: Validation



Run the checks supported by the repository and environment, such as:



\- Syntax checks.

\- Static analysis or linting, if configured.

\- Unit tests, if available.

\- Driver packaging and validation.

\- Installation and device discovery checks.

\- Capability command tests.

\- IR learning and transmission tests.

\- Physical AC operation tests when hardware becomes available.



Report exactly which checks were run and their results.



If a test cannot run because hardware, credentials, network access, or a SmartThings environment is missing, identify the blocker rather than silently treating the test as passed.



\### Phase 5: Hardware integration



Once suitable Broadlink hardware and the target AC are available:



1\. Confirm the Broadlink device is discovered and identified correctly.

2\. Confirm the driver can communicate with it.

3\. Learn or capture representative AC IR commands.

4\. Determine whether the protocol represents individual controls or complete state.

5\. Test each supported operating mode.

6\. Test temperature and fan-speed changes.

7\. Test power transitions and rapid consecutive commands.

8\. Test failures, restarts, and changes made using the original remote.

9\. Confirm that the SmartThings UI remains consistent with the implemented capability model.



Document any protocol-specific limitations.



\---



\## 8. Coding and Change Management Rules



\- Read relevant source files before modifying them.

\- Do not assume a function or module exists until it has been located in the repository.

\- Do not rewrite working transport code without a specific technical reason.

\- Keep changes focused and easy to review.

\- Follow the repository's language, formatting, and module conventions.

\- Use clear names for AC state, commands, and protocol representations.

\- Validate incoming command values before using them.

\- Handle communication failures explicitly.

\- Do not suppress errors merely to make the UI appear responsive.

\- Do not hard-code secrets, device credentials, or network-specific assumptions.

\- Avoid adding dependencies unless they are necessary and compatible with the SmartThings Edge environment.

\- Check the repository's license and preserve applicable copyright and license notices.

\- Do not claim that generated code has been executed, compiled, installed, or tested unless that actually happened.

\- After making changes, summarize the files modified, the rationale, validation performed, and remaining limitations.

\- Do not discard unrelated user changes or reset the working tree without explicit authorization.



If a change requires assumptions about an unknown AC model or Broadlink device, isolate those assumptions behind a small interface or configuration point wherever practical.



\---



\## 9. Out of Scope for the Initial Version



Unless explicitly requested later, do not prioritize:



\- Support for every Broadlink model.

\- A universal IR remote UI.

\- Unrelated appliances such as televisions, fans, or lighting.

\- Cloud-based IR transmission services.

\- Actual AC-state feedback that the hardware does not provide.

\- A large custom UI framework.

\- Unnecessary migration of the entire reference repository.

\- Premature optimization unrelated to reliability or the target user experience.



The initial goal is a reliable, maintainable AC-specific SmartThings Edge Driver using the smallest practical set of changes to the existing Broadlink implementation.



\---



\## 10. Definition of Done



The project can be considered functionally complete for the selected AC and Broadlink device when all applicable criteria below have been verified:



\### SmartThings interface

\- \[ ] The device appears as an air conditioner in SmartThings.

\- \[ ] The interface provides one power control.

\- \[ ] The interface provides the supported Cool, Heat, Auto, and Fan modes without exposing unrelated modes.

\- \[ ] The interface provides one target-temperature control.

\- \[ ] The interface provides one fan-speed control.

\- \[ ] There are no unintended duplicate or unrelated controls.



\### Communication

\- \[ ] The intended Broadlink model is explicitly identified and its compatibility is documented.

\- \[ ] The driver can discover and communicate with the selected hardware.

\- \[ ] IR commands are transmitted using the existing or appropriately adapted communication layer.

\- \[ ] Errors are logged and handled without falsely reporting success.



\### AC behavior

\- \[ ] Power transitions work.

\- \[ ] Each advertised operating mode works on the target AC.

\- \[ ] Temperature changes work within the supported range.

\- \[ ] Fan-speed changes work for the supported settings.

\- \[ ] State transitions produce valid IR commands.

\- \[ ] Any limitations caused by one-way IR communication are documented.



\### Quality and verification

\- \[ ] Available static checks and tests have been run.

\- \[ ] Physical behavior has been tested where the necessary hardware is available.

\- \[ ] Verified results are distinguished from assumptions and untested behavior.

\- \[ ] Installation and configuration instructions are documented.



A checkbox should only be marked complete when supported by actual evidence.



\---



\## 11. Instructions for Future AI Coding Sessions



At the start of a new task, read this file and inspect the current repository state.



Then:



1\. Identify the user's immediate request.

2\. Determine which parts of the project architecture are relevant.

3\. Inspect the actual source code before making repository-specific claims.

4\. Preserve all design goals and constraints in this document.

5\. Avoid repeating completed analysis unless the source has changed or the information is necessary.

6\. If a previous implementation or plan exists, inspect it before proposing a replacement.

7\. Ask a focused question only when an unresolved decision materially blocks safe or correct implementation.

8\. Otherwise, proceed with the smallest justified next step.



When reporting findings, separate them into:



\- \*\*Verified:\*\* Directly supported by source code or executed tests.

\- \*\*Inferred:\*\* A reasonable interpretation that still requires confirmation.

\- \*\*Unverified:\*\* Requires hardware, documentation, or an experiment that has not yet been performed.



Do not silently turn an inference into a verified fact.



The long-term goal remains unchanged: a clean, dedicated SmartThings air conditioner interface powered by a reliable Broadlink IR implementation, with minimal unnecessary code changes and clearly documented hardware and protocol constraints.

