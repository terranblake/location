# README Audit - 2025-07-06

This document records mismatches between `README.md` and the current behaviour of the web UI. Focus areas are the People tab, Person view and Device view.

| README Line | Expected (from README) | Actual Behaviour | Suggested Fix |
|-------------|-----------------------|-----------------|---------------|
| 83 | People view lists shared family or friend devices | People tab shows the same devices as "Your Devices" with no sharing capabilities | Update README to note People view is a placeholder or implement sharing logic |
| 86 | Actions perform real Play Sound / Secure / Erase functions | Buttons only trigger alert messages with no real effect | Clarify they are placeholders or implement backend action handling |
| 87 | Each person has a unique color palette for their devices | Colors are assigned per device; People view groups each device as its own "person" | Update docs or implement per-person color grouping |
