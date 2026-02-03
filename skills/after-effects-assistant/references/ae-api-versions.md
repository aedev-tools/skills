# After Effects API Versions Reference

Mapping of After Effects versions to marketing names, years, API capabilities,
and scripting execution methods.

---

## Version-to-Year Mapping

| `app.version` Major | Marketing Name           | Year |
| -------------------- | ------------------------ | ---- |
| 16.x                 | After Effects CC 2019    | 2019 |
| 17.x                 | After Effects 2020       | 2020 |
| 18.x                 | After Effects 2021       | 2021 |
| 22.x                 | After Effects 2022       | 2022 |
| 23.x                 | After Effects 2023       | 2023 |
| 24.x                 | After Effects 2024       | 2024 |
| 25.x                 | After Effects 2025       | 2025 |

> **Note:** Versions 19, 20, and 21 were skipped. Adobe jumped directly from
> 18.x (2021) to 22.x (2022) to align the major version number with the
> calendar year.

---

## Version Detection Code

Use the following snippet in any ExtendScript context to determine the running
major version:

```jsx
var major = parseInt(app.version.split(".")[0], 10);
```

Example conditional usage:

```jsx
var major = parseInt(app.version.split(".")[0], 10);

if (major >= 24) {
    // AE 2024+ specific logic
} else if (major >= 22) {
    // AE 2022-2023 specific logic
} else {
    // AE 2021 and earlier
}
```

---

## Notable Scripting Additions by Version

### 17.x - After Effects 2020

- **JavaScript expression engine** introduced as an alternative to the legacy
  ExtendScript expression engine. Expressions can now run in a modern JS
  runtime, significantly improving evaluation performance.
- The legacy ExtendScript engine remains available and is the default for
  existing projects.

### 22.x - After Effects 2022

- **Multi-frame rendering API** - scripting hooks and awareness for the new
  multi-frame rendering pipeline. Scripts must account for thread-safety
  considerations when MFR is enabled.
- **`layer.id` property** - each layer now exposes a persistent unique `id`
  property that survives layer reordering, renaming, and duplication. This is
  the preferred way to reference layers programmatically instead of by index
  or name.

### 23.x - After Effects 2023

- **Properties panel scripting improvements** - enhanced access to the
  Properties panel, improving the ability to read and manipulate property
  groups and individual properties through scripts.

### 24.x - After Effects 2024

- **Layer tagging / labeling improvements** - expanded scripting control over
  layer labels and organizational tags, enabling better automated project
  organization workflows.
- **Text layer per-character 3D** - scripting support for per-character 3D
  transformations on text layers, allowing programmatic control of individual
  character positioning in 3D space.

### 25.x - After Effects 2025

- **Enhanced scripting for Motion Graphics templates** - improved API surface
  for creating, modifying, and exporting Motion Graphics templates (MOGRTs)
  via script, enabling more robust template automation pipelines.

---

## Execution Method by Version

### All Versions: AppleScript `DoScriptFile`

The traditional method for executing ExtendScript from an external process on
macOS:

```applescript
tell application "Adobe After Effects 2024"
    DoScriptFile "/path/to/script.jsx"
end tell
```

This works reliably through AE 2023 (23.x).

### 24.x and Later: JXA (`osascript -l JavaScript`)

Starting with After Effects 2024 (24.x), the AppleScript `DoScriptFile`
command became **unreliable**. The recommended approach for 24.x+ is to use
JavaScript for Automation (JXA) instead:

```bash
osascript -l JavaScript -e '
  var ae = Application("Adobe After Effects 2025");
  ae.doscriptfile("/path/to/script.jsx");
'
```

#### Choosing the Right Method

| AE Version | Recommended Method          | Notes                              |
| ---------- | --------------------------- | ---------------------------------- |
| 16.x-23.x  | AppleScript `DoScriptFile`  | Stable and well-tested             |
| 24.x+      | JXA via `osascript -l JavaScript` | AppleScript method is unreliable |

#### Version-Adaptive Execution Pattern

When building tools that must support multiple AE versions, detect the version
first and dispatch accordingly:

```bash
# Pseudocode for adaptive execution
ae_version=$(get_ae_major_version)
if [ "$ae_version" -ge 24 ]; then
    osascript -l JavaScript -e "Application('Adobe After Effects ...').doscriptfile('$script')"
else
    osascript -e "tell application \"Adobe After Effects ...\" to DoScriptFile \"$script\""
fi
```

---

## TODO

- TODO: Full command ID mapping per version
- TODO: Complete matchName changes between versions
- TODO: Deprecated APIs per version
- TODO: Document `app.executeCommand()` ID differences across versions
- TODO: Map `PropertyType` and `PropertyValueType` enum availability per version
- TODO: Document Windows execution methods (COM automation) per version
