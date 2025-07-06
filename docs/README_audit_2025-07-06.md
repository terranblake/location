# README/UI Consistency Audit - 2025-07-06

This document compares statements in `README.md` with the actual behavior of the People → Person → Device flow found in the front‑end (HTML/JS).

| README Line & Quote | Expected (per README) | Actual (observed in UI code) | Suggested Fix |
| --- | --- | --- | --- |
| 83: "**Devices & People Views**: Switch between your devices and shared family/friend devices" | People tab lists distinct people with their devices. | `people-view` just mirrors each device as a separate "person" with no grouping by actual user. | Update README to note that the current People view shows devices individually. |
| 87: "**Color-coded Tracking**: Each person gets a unique color palette for their devices" | Devices belonging to the same person share colors. | `getDeviceColor()` assigns colors per device ID, so two devices for the same person get different colors. | Update README or change JS to color by owner. |
| 86: "**Device Actions**: Play sound, secure device, and erase device functionality" | Buttons execute real actions. | Buttons call placeholder `alert()`s in `playSound`, `secureDevice`, `eraseDevice`. | Update README to mention actions are placeholders or implement real backend. |

Additional observations:
- The UI defaults to the **Devices** tab via `showDevicesView()` in `initViews()`. The README does not specify a default. If People were intended as the default, this is a mismatch. Clarify expected default in the README.

- There is no dedicated "Person" page linking a person to multiple devices. The code only switches between a list of devices and a per-device detail view.
