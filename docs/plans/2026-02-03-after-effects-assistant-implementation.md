# After Effects Assistant — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Agent Skills-spec skill that automates After Effects by reading project state, generating ExtendScript, and executing it via osascript.

**Architecture:** A SKILL.md entry point routes to rule files for domain knowledge and scripts for project introspection. Scripts execute via JXA osascript, write JSON results to temp files, and Claude reads them back. All mutations wrap in undo groups.

**Tech Stack:** ExtendScript (ES3), Bash, JXA (JavaScript for Automation), Agent Skills spec

---

### Task 1: Create directory structure and JSON helper

**Files:**
- Create: `after-effects-assistant/scripts/lib/json2.jsx`
- Create: `after-effects-assistant/scripts/lib/utils.jsx`

**Step 1: Create the skill directory tree**

```bash
cd "/Users/michaelnahmias/Documents/projects/aedev.tools/after effects skills"
mkdir -p after-effects-assistant/scripts/lib
mkdir -p after-effects-assistant/rules
mkdir -p after-effects-assistant/references
```

**Step 2: Write json2.jsx**

Download Crockford's json2.js and save as `after-effects-assistant/scripts/lib/json2.jsx`. This provides `JSON.stringify` and `JSON.parse` in ES3.

Source: https://raw.githubusercontent.com/douglascrockford/JSON-js/master/json2.js

**Step 3: Write utils.jsx — shared helpers for all query scripts**

```jsx
// after-effects-assistant/scripts/lib/utils.jsx

// Write JSON result to temp output file
function writeResult(obj) {
    var jsonStr = JSON.stringify(obj);
    var outFile = new File("/tmp/ae-assistant-result.json");
    outFile.encoding = "UTF-8";
    outFile.open("w");
    outFile.write(jsonStr);
    outFile.close();
}

// Read arguments from temp input file
function readArgs() {
    var argFile = new File("/tmp/ae-assistant-args.json");
    if (!argFile.exists) return {};
    argFile.encoding = "UTF-8";
    argFile.open("r");
    var content = argFile.read();
    argFile.close();
    if (!content || content.length === 0) return {};
    return JSON.parse(content);
}

// Detect layer type string
function getLayerType(layer) {
    switch (layer.matchName) {
        case "ADBE Vector Layer": return "shape";
        case "ADBE Text Layer": return "text";
        case "ADBE Camera Layer": return "camera";
        case "ADBE Light Layer": return "light";
        case "ADBE AV Layer":
            if (layer.nullLayer) return "null";
            if (layer.adjustmentLayer) return "adjustment";
            if (layer.guideLayer) return "guide";
            if (layer.source instanceof CompItem) return "precomp";
            if (layer.source.mainSource instanceof SolidSource) return "solid";
            if (layer.source.mainSource instanceof PlaceholderSource) return "placeholder";
            if (layer.source.mainSource instanceof FileSource) {
                if (layer.source.footageMissing) return "missing";
                if (!layer.source.hasVideo && layer.source.hasAudio) return "audio";
                return "footage";
            }
            return "av";
        default: return "unknown";
    }
}

// Get blend mode display name
function getBlendModeName(mode) {
    for (var key in BlendingMode) {
        if (BlendingMode[key] === mode) return key;
    }
    return "unknown";
}
```

**Step 4: Verify files exist**

```bash
ls -la "/Users/michaelnahmias/Documents/projects/aedev.tools/after effects skills/after-effects-assistant/scripts/lib/"
```

Expected: `json2.jsx` and `utils.jsx` listed.

**Step 5: Commit**

```bash
git add after-effects-assistant/scripts/lib/
git commit -m "feat: add JSON and utility helpers for AE query scripts"
```

---

### Task 2: Write runner.sh — AE version detection and script execution

**Files:**
- Create: `after-effects-assistant/scripts/runner.sh`

**Step 1: Write runner.sh**

```bash
#!/bin/bash
# runner.sh — Detect AE version, execute ExtendScript, return result
# Usage: runner.sh <script.jsx> [args-json]
#
# - Detects installed AE versions in /Applications
# - If multiple found and no cached choice, prints them and exits with code 2
# - Writes args JSON to /tmp/ae-assistant-args.json if provided
# - Executes the .jsx via JXA osascript
# - Reads result from /tmp/ae-assistant-result.json
# - Prints result to stdout

set -euo pipefail

CONFIG_FILE="$HOME/.ae-assistant-config"
ARGS_FILE="/tmp/ae-assistant-args.json"
RESULT_FILE="/tmp/ae-assistant-result.json"
SCRIPT_PATH="$1"
ARGS_JSON="${2:-}"

# Resolve absolute path for the script
if [[ ! "$SCRIPT_PATH" = /* ]]; then
    SCRIPT_PATH="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)/$(basename "$SCRIPT_PATH")"
fi

# --- AE Version Detection ---

get_cached_version() {
    if [[ -f "$CONFIG_FILE" ]]; then
        cat "$CONFIG_FILE"
    fi
}

set_cached_version() {
    echo "$1" > "$CONFIG_FILE"
}

detect_ae_versions() {
    local versions=()
    for dir in /Applications/Adobe\ After\ Effects*/; do
        if [[ -d "$dir" ]]; then
            local name
            name=$(basename "$dir")
            versions+=("$name")
        fi
    done
    echo "${versions[@]}"
}

AE_APP=$(get_cached_version)

if [[ -z "$AE_APP" ]]; then
    IFS=' ' read -ra VERSIONS <<< "$(detect_ae_versions)"

    if [[ ${#VERSIONS[@]} -eq 0 ]]; then
        echo '{"error": "No Adobe After Effects installation found in /Applications"}' >&2
        exit 1
    elif [[ ${#VERSIONS[@]} -eq 1 ]]; then
        AE_APP="${VERSIONS[0]}"
        set_cached_version "$AE_APP"
    else
        echo "Multiple After Effects versions found:"
        for i in "${!VERSIONS[@]}"; do
            echo "  $((i+1)). ${VERSIONS[$i]}"
        done
        echo ""
        echo "Set your preferred version by running:"
        echo "  echo 'Adobe After Effects 2025' > ~/.ae-assistant-config"
        exit 2
    fi
fi

# --- Write args ---

if [[ -n "$ARGS_JSON" ]]; then
    echo "$ARGS_JSON" > "$ARGS_FILE"
else
    echo '{}' > "$ARGS_FILE"
fi

# --- Clean previous result ---

rm -f "$RESULT_FILE"

# --- Execute via JXA ---

osascript -l JavaScript -e "
    var ae = Application(\"$AE_APP\");
    ae.activate();
    ae.doscriptfile(\"$SCRIPT_PATH\");
" 2>&1

# --- Read result ---

if [[ -f "$RESULT_FILE" ]]; then
    cat "$RESULT_FILE"
else
    echo '{"error": "Script did not produce a result file"}'
fi
```

**Step 2: Make executable**

```bash
chmod +x "/Users/michaelnahmias/Documents/projects/aedev.tools/after effects skills/after-effects-assistant/scripts/runner.sh"
```

**Step 3: Commit**

```bash
git add after-effects-assistant/scripts/runner.sh
git commit -m "feat: add runner.sh for AE version detection and script execution"
```

---

### Task 3: Write active-state.jsx

**Files:**
- Create: `after-effects-assistant/scripts/active-state.jsx`

**Step 1: Write active-state.jsx**

```jsx
// active-state.jsx — Returns current AE working state
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var result = {
        aeVersion: app.version,
        activeComp: null,
        selectedLayers: [],
        selectedProperties: [],
        currentTime: null,
        workAreaStart: null,
        workAreaEnd: null
    };

    var comp = app.project.activeItem;
    if (comp && comp instanceof CompItem) {
        result.activeComp = {
            name: comp.name,
            duration: comp.duration,
            fps: comp.frameRate,
            width: comp.width,
            height: comp.height,
            numLayers: comp.numLayers
        };
        result.currentTime = comp.time;
        result.workAreaStart = comp.workAreaStart;
        result.workAreaEnd = comp.workAreaStart + comp.workAreaDuration;

        var sel = comp.selectedLayers;
        for (var i = 0; i < sel.length; i++) {
            result.selectedLayers.push({
                index: sel[i].index,
                name: sel[i].name,
                type: getLayerType(sel[i])
            });
        }

        var selProps = comp.selectedProperties;
        for (var j = 0; j < selProps.length; j++) {
            result.selectedProperties.push({
                name: selProps[j].name,
                matchName: selProps[j].matchName
            });
        }
    }

    writeResult(result);
})();
```

**Step 2: Commit**

```bash
git add after-effects-assistant/scripts/active-state.jsx
git commit -m "feat: add active-state.jsx query script"
```

---

### Task 4: Write project-overview.jsx

**Files:**
- Create: `after-effects-assistant/scripts/project-overview.jsx`

**Step 1: Write project-overview.jsx**

```jsx
// project-overview.jsx — Lightweight project structure dump
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var result = {
        projectName: app.project.file ? app.project.file.name : "(unsaved)",
        projectPath: app.project.file ? app.project.file.fsName : null,
        numItems: app.project.numItems,
        items: []
    };

    function processFolder(folder, depth) {
        var items = [];
        for (var i = 1; i <= folder.numItems; i++) {
            var item = folder.item(i);
            var entry = {
                name: item.name,
                id: item.id
            };

            if (item instanceof FolderItem) {
                entry.type = "folder";
                entry.children = processFolder(item, depth + 1);
            } else if (item instanceof CompItem) {
                entry.type = "comp";
                entry.width = item.width;
                entry.height = item.height;
                entry.duration = item.duration;
                entry.fps = item.frameRate;
                entry.numLayers = item.numLayers;
            } else if (item instanceof FootageItem) {
                entry.type = "footage";
                entry.hasVideo = item.hasVideo;
                entry.hasAudio = item.hasAudio;
                entry.duration = item.duration;
                if (item.mainSource instanceof FileSource) {
                    entry.filePath = item.mainSource.file.fsName;
                } else if (item.mainSource instanceof SolidSource) {
                    entry.type = "solid";
                    entry.color = item.mainSource.color;
                    entry.width = item.width;
                    entry.height = item.height;
                } else if (item.mainSource instanceof PlaceholderSource) {
                    entry.type = "placeholder";
                }
                entry.footageMissing = item.footageMissing;
            }

            items.push(entry);
        }
        return items;
    }

    result.items = processFolder(app.project.rootFolder, 0);
    writeResult(result);
})();
```

**Step 2: Commit**

```bash
git add after-effects-assistant/scripts/project-overview.jsx
git commit -m "feat: add project-overview.jsx query script"
```

---

### Task 5: Write comp-detail.jsx

**Files:**
- Create: `after-effects-assistant/scripts/comp-detail.jsx`

**Step 1: Write comp-detail.jsx**

```jsx
// comp-detail.jsx — Medium detail for a specific composition
// Args: { "compName": "Main Comp" } or uses active comp if no args
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var args = readArgs();
    var comp = null;

    if (args.compName) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === args.compName) {
                comp = item;
                break;
            }
        }
        if (!comp) {
            writeResult({ error: "Composition not found: " + args.compName });
            return;
        }
    } else {
        comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }
    }

    var result = {
        comp: comp.name,
        width: comp.width,
        height: comp.height,
        duration: comp.duration,
        fps: comp.frameRate,
        bgColor: comp.bgColor,
        layers: []
    };

    for (var j = 1; j <= comp.numLayers; j++) {
        var layer = comp.layer(j);
        var layerInfo = {
            index: layer.index,
            name: layer.name,
            type: getLayerType(layer),
            enabled: layer.enabled,
            locked: layer.locked,
            shy: layer.shy,
            solo: layer.solo,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            startTime: layer.startTime,
            parent: layer.parent ? layer.parent.name : null,
            label: layer.label
        };

        // Blend mode (AVLayer only)
        if (layer instanceof AVLayer) {
            layerInfo.blendMode = getBlendModeName(layer.blendMode);
            layerInfo.trackMatteType = layer.trackMatteType;
            layerInfo.threeDLayer = layer.threeDLayer;
            layerInfo.motionBlur = layer.motionBlur;
        }

        // Effect count
        var effects = layer.property("ADBE Effect Parade");
        if (effects) {
            layerInfo.numEffects = effects.numProperties;
            layerInfo.effects = [];
            for (var e = 1; e <= effects.numProperties; e++) {
                layerInfo.effects.push({
                    name: effects.property(e).name,
                    matchName: effects.property(e).matchName,
                    enabled: effects.property(e).enabled
                });
            }
        }

        // Expression count
        var expressionCount = 0;
        function countExpressions(prop) {
            if (prop.propertyType === PropertyType.PROPERTY) {
                if (prop.expressionEnabled) expressionCount++;
            } else {
                for (var p = 1; p <= prop.numProperties; p++) {
                    countExpressions(prop.property(p));
                }
            }
        }
        countExpressions(layer);
        layerInfo.numExpressions = expressionCount;

        result.layers.push(layerInfo);
    }

    writeResult(result);
})();
```

**Step 2: Commit**

```bash
git add after-effects-assistant/scripts/comp-detail.jsx
git commit -m "feat: add comp-detail.jsx query script"
```

---

### Task 6: Write layer-detail.jsx

**Files:**
- Create: `after-effects-assistant/scripts/layer-detail.jsx`

**Step 1: Write layer-detail.jsx**

```jsx
// layer-detail.jsx — Deep detail for specific layers
// Args: { "compName": "Main Comp", "layerNames": ["Logo"] }
//   or: { "layerNames": ["Logo"] } (uses active comp)
//   or: {} (uses selected layers in active comp)
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var args = readArgs();
    var comp = null;

    if (args.compName) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === args.compName) {
                comp = item;
                break;
            }
        }
        if (!comp) {
            writeResult({ error: "Composition not found: " + args.compName });
            return;
        }
    } else {
        comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }
    }

    // Determine which layers to detail
    var layers = [];
    if (args.layerNames && args.layerNames.length > 0) {
        for (var n = 0; n < args.layerNames.length; n++) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === args.layerNames[n]) {
                    layers.push(comp.layer(j));
                    break;
                }
            }
        }
    } else {
        // Use selected layers
        var sel = comp.selectedLayers;
        for (var s = 0; s < sel.length; s++) {
            layers.push(sel[s]);
        }
    }

    if (layers.length === 0) {
        writeResult({ error: "No layers found or selected" });
        return;
    }

    // Extract keyframe data for a property
    function getPropertyDetail(prop) {
        var detail = {
            name: prop.name,
            matchName: prop.matchName,
            value: null,
            numKeys: prop.numKeys,
            keyframes: [],
            expressionEnabled: prop.expressionEnabled,
            expression: prop.expressionEnabled ? prop.expression : null
        };

        try { detail.value = prop.value; } catch(e) {}

        for (var k = 1; k <= prop.numKeys; k++) {
            var kf = {
                time: prop.keyTime(k),
                value: prop.keyValue(k)
            };

            try {
                kf.inInterpolationType = prop.keyInInterpolationType(k);
                kf.outInterpolationType = prop.keyOutInterpolationType(k);
            } catch(e2) {}

            try {
                kf.temporalEaseIn = [];
                kf.temporalEaseOut = [];
                var easeIn = prop.keyInTemporalEase(k);
                var easeOut = prop.keyOutTemporalEase(k);
                for (var ei = 0; ei < easeIn.length; ei++) {
                    kf.temporalEaseIn.push({
                        speed: easeIn[ei].speed,
                        influence: easeIn[ei].influence
                    });
                }
                for (var eo = 0; eo < easeOut.length; eo++) {
                    kf.temporalEaseOut.push({
                        speed: easeOut[eo].speed,
                        influence: easeOut[eo].influence
                    });
                }
            } catch(e3) {}

            detail.keyframes.push(kf);
        }

        return detail;
    }

    // Recursively extract property group
    function getGroupDetail(group) {
        var detail = {
            name: group.name,
            matchName: group.matchName,
            properties: []
        };
        for (var p = 1; p <= group.numProperties; p++) {
            var prop = group.property(p);
            if (prop.propertyType === PropertyType.PROPERTY) {
                detail.properties.push(getPropertyDetail(prop));
            } else {
                detail.properties.push(getGroupDetail(prop));
            }
        }
        return detail;
    }

    var result = {
        comp: comp.name,
        layers: []
    };

    for (var l = 0; l < layers.length; l++) {
        var layer = layers[l];
        var layerData = {
            index: layer.index,
            name: layer.name,
            type: getLayerType(layer)
        };

        // Transform group
        var xf = layer.property("ADBE Transform Group");
        if (xf) {
            layerData.transform = {};
            var transformProps = [
                "ADBE Anchor Point", "ADBE Position", "ADBE Scale",
                "ADBE Rotate Z", "ADBE Opacity"
            ];
            // Add 3D props if applicable
            if (layer instanceof AVLayer && layer.threeDLayer) {
                transformProps.push("ADBE Rotate X", "ADBE Rotate Y", "ADBE Orientation");
            }
            for (var t = 0; t < transformProps.length; t++) {
                var tfProp = xf.property(transformProps[t]);
                if (tfProp) {
                    layerData.transform[transformProps[t]] = getPropertyDetail(tfProp);
                }
            }
        }

        // Effects
        var effects = layer.property("ADBE Effect Parade");
        if (effects && effects.numProperties > 0) {
            layerData.effects = [];
            for (var e = 1; e <= effects.numProperties; e++) {
                layerData.effects.push(getGroupDetail(effects.property(e)));
            }
        }

        // Masks
        var masks = layer.property("ADBE Mask Parade");
        if (masks && masks.numProperties > 0) {
            layerData.masks = [];
            for (var m = 1; m <= masks.numProperties; m++) {
                layerData.masks.push(getGroupDetail(masks.property(m)));
            }
        }

        // Text layer source text
        if (layer instanceof TextLayer) {
            var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
            if (textProp) {
                var textDoc = textProp.value;
                layerData.text = {
                    text: textDoc.text,
                    fontSize: textDoc.fontSize,
                    font: textDoc.font,
                    fillColor: textDoc.fillColor,
                    strokeColor: textDoc.strokeColor,
                    justification: textDoc.justification
                };
            }
        }

        result.layers.push(layerData);
    }

    writeResult(result);
})();
```

**Step 2: Commit**

```bash
git add after-effects-assistant/scripts/layer-detail.jsx
git commit -m "feat: add layer-detail.jsx deep query script"
```

---

### Task 7: Write SKILL.md

**Files:**
- Create: `after-effects-assistant/SKILL.md`

**Step 1: Write SKILL.md**

```markdown
---
name: after-effects-assistant
description: >
  Automate Adobe After Effects via ExtendScript. Use when the user asks to
  create, modify, or query anything in an After Effects project — layers,
  keyframes, expressions, effects, compositions, assets, rendering, batch
  operations. Generates and executes JSX ExtendScript via osascript on macOS.
compatibility: Requires macOS with Adobe After Effects installed. Needs "Allow Scripts to Write Files and Access Network" enabled in AE Preferences > Scripting & Expressions.
allowed-tools: Bash(osascript:*) Bash(chmod:*) Bash(cat:*) Read Write
metadata:
  author: aedev-tools
  version: "1.0"
---

## Overview

This skill automates After Effects by generating ExtendScript (.jsx) and executing it via osascript. It reads project state through query scripts, uses rule files for domain knowledge, and wraps all mutations in undo groups.

## First-Time Setup

1. Run `scripts/runner.sh` with any query script to detect the AE version
2. If multiple AE versions are installed, the user must choose one — runner.sh will prompt
3. Ensure AE Preferences > Scripting & Expressions > "Allow Scripts to Write Files and Access Network" is enabled

## Workflow

For every user request:

### Step 1: Gather context (auto-run, no confirmation needed)

Run the active state query:
```bash
bash scripts/runner.sh scripts/active-state.jsx
```
Then read `/tmp/ae-assistant-result.json` for active comp, selected layers, CTI.

If this is the first interaction or the project context is unknown, also run:
```bash
bash scripts/runner.sh scripts/project-overview.jsx
```

### Step 2: Drill down if needed (auto-run)

If the task targets a specific comp:
```bash
bash scripts/runner.sh scripts/comp-detail.jsx '{"compName": "Comp Name"}'
```

If the task targets specific layers:
```bash
bash scripts/runner.sh scripts/layer-detail.jsx '{"layerNames": ["Layer 1", "Layer 2"]}'
```

Omit `compName` to use the active comp. Omit `layerNames` to use selected layers.

### Step 3: Load domain knowledge

Read the relevant rule file from `rules/`. Always read `rules/extendscript-fundamentals.md` — it contains ES3 constraints that apply to every generated script.

| Task involves | Load rule file |
|---|---|
| Layers (create, move, parent, duplicate) | [rules/layer-manipulation.md](rules/layer-manipulation.md) |
| Keyframes, animation, easing | [rules/keyframes-animation.md](rules/keyframes-animation.md) |
| Expressions | [rules/expressions.md](rules/expressions.md) |
| Compositions (create, precompose, nest) | [rules/composition-management.md](rules/composition-management.md) |
| Effects and parameters | [rules/effects.md](rules/effects.md) |
| Import, footage, assets | [rules/assets-footage.md](rules/assets-footage.md) |
| Render queue, export | [rules/rendering.md](rules/rendering.md) |
| Bulk/batch operations | [rules/batch-operations.md](rules/batch-operations.md) |
| Version-specific features | [references/ae-api-versions.md](references/ae-api-versions.md) |

### Step 4: Generate the action script

Every generated script MUST follow this template:

```jsx
#include "<path-to-skill>/scripts/lib/json2.jsx"
#include "<path-to-skill>/scripts/lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: <action description>");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        // ... action code ...

        writeResult({ success: true, message: "<what was done>" });
    } catch (e) {
        writeResult({ error: e.toString(), line: e.line });
    } finally {
        app.endUndoGroup();
    }
})();
```

### Step 5: Execute or confirm

**Auto-run** (no confirmation needed):
- All read-only queries (active-state, project-overview, comp-detail, layer-detail)
- Non-destructive additions: adding a keyframe, adding an effect, creating a layer, creating a comp

**Confirm before running** (show the script and ask the user):
- Deleting layers or comps
- Removing keyframes
- Replacing footage
- Clearing expressions
- Render queue operations
- Any operation the user might not expect

### Step 6: Execute and read result

```bash
# Write the generated script to a temp file, then run it
bash scripts/runner.sh /tmp/ae-assistant-action.jsx '{"arg1": "value1"}'
```

Read `/tmp/ae-assistant-result.json` for the result.

## MUST

- ALWAYS wrap mutations in `app.beginUndoGroup()` / `app.endUndoGroup()`
- ALWAYS use matchNames for property access, not display names (display names are localized)
- ALWAYS use 1-based indexing for layers and project items
- ALWAYS include json2.jsx and utils.jsx via #include
- ALWAYS wrap in an IIFE to avoid global scope pollution
- ALWAYS use `var`, never `let` or `const` (ES3)
- ALWAYS write results to /tmp/ae-assistant-result.json via writeResult()
- ALWAYS check `comp instanceof CompItem` before accessing comp properties

## FORBIDDEN

- NEVER use ES5+ syntax: let, const, arrow functions, template literals, destructuring
- NEVER use Array.map, Array.filter, Array.reduce, Array.forEach (not in ES3)
- NEVER use JSON.parse or JSON.stringify without including json2.jsx
- NEVER hardcode layer indices — use names, selection, or iteration
- NEVER run destructive operations without user confirmation
- NEVER assume a comp is active without checking
```

**Step 2: Commit**

```bash
git add after-effects-assistant/SKILL.md
git commit -m "feat: add SKILL.md entry point for after-effects-assistant"
```

---

### Task 8: Write extendscript-fundamentals.md

**Files:**
- Create: `after-effects-assistant/rules/extendscript-fundamentals.md`

**Step 1: Write the fundamentals rule file**

This is the most critical rule file — it MUST be loaded on every interaction. Contents should cover:

- ES3 syntax constraints (no let/const/arrow/template literals/destructuring)
- No native JSON — must include json2.jsx
- No Array.map/filter/reduce/forEach — use for loops
- 1-based indexing for layers (`comp.layer(1)`) and project items (`app.project.item(1)`)
- 0-based indexing for selectedLayers array (`comp.selectedLayers[0]`)
- Property access via matchNames (ADBE Position, ADBE Scale, etc.)
- The AE DOM hierarchy: app.project > CompItem > Layer > PropertyGroup > Property
- Type checking patterns: `instanceof CompItem`, `instanceof AVLayer`, `instanceof TextLayer`
- Common matchNames table for transform, effects, masks, text
- File I/O pattern: `new File(path)`, `.open("r"/"w")`, `.read()`, `.write()`, `.close()`
- The undo group pattern with try/catch/finally
- IIFE wrapping pattern to avoid global pollution
- Common gotchas:
  - `layer.source` throws if layer has no source (nulls, cameras, lights)
  - `property.value` throws on some property types
  - String concatenation with `+` (no template literals)
  - `$.writeln()` for debug logging to ExtendScript console
  - `alert()` blocks AE — avoid in automated scripts, use writeResult instead

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/extendscript-fundamentals.md
git commit -m "feat: add extendscript-fundamentals.md rule file"
```

---

### Task 9: Write layer-manipulation.md

**Files:**
- Create: `after-effects-assistant/rules/layer-manipulation.md`

**Step 1: Write the rule file**

Cover these patterns with code examples:

- **Creating layers**: `comp.layers.addSolid()`, `comp.layers.addNull()`, `comp.layers.addShape()`, `comp.layers.addText()`, `comp.layers.addCamera()`, `comp.layers.addLight()`
- **Deleting layers**: `layer.remove()`
- **Duplicating**: `layer.duplicate()` returns the new layer
- **Reordering**: `layer.moveBefore(otherLayer)`, `layer.moveAfter(otherLayer)`, `layer.moveToBeginning()`, `layer.moveToEnd()`
- **Parenting**: `layer.parent = otherLayer` or `layer.parent = null`
- **Renaming**: `layer.name = "New Name"`
- **Enable/disable**: `layer.enabled = true/false`
- **Lock/unlock**: `layer.locked = true/false`
- **Solo**: `layer.solo = true/false`
- **Shy**: `layer.shy = true/false`
- **3D layer**: `layer.threeDLayer = true/false`
- **Adjustment layer**: `layer.adjustmentLayer = true/false`
- **Guide layer**: `layer.guideLayer = true/false`
- **In/out points**: `layer.inPoint`, `layer.outPoint`, `layer.startTime`
- **Labels**: `layer.label` (integer 0-16)

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/layer-manipulation.md
git commit -m "feat: add layer-manipulation.md rule file"
```

---

### Task 10: Write keyframes-animation.md

**Files:**
- Create: `after-effects-assistant/rules/keyframes-animation.md`

**Step 1: Write the rule file**

Cover these patterns with code examples:

- **Reading keyframes**: `prop.numKeys`, `prop.keyTime(k)`, `prop.keyValue(k)`
- **Setting values at times**: `prop.setValueAtTime(time, value)`
- **Batch setting**: `prop.setValuesAtTimes([times], [values])`
- **Adding keyframes**: `prop.addKey(time)` returns index
- **Removing keyframes**: `prop.removeKey(index)` — MUST remove from highest to lowest index
- **Static values**: `prop.setValue(value)` — sets non-keyframed value
- **Interpolation types**: `KeyframeInterpolationType.LINEAR`, `.BEZIER`, `.HOLD`
- **Setting interpolation**: `prop.setInterpolationTypeAtKey(index, inType, outType)`
- **Temporal ease**: `new KeyframeEase(speed, influence)`, `prop.setTemporalEaseAtKey(index, [easeIn], [easeOut])`
- **Spatial tangents**: `prop.setSpatialTangentsAtKey(index, inTangent, outTangent)`
- **Common easing presets**:
  - Ease in: influence 75, speed 0
  - Ease out: influence 75, speed 0
  - Easy ease: influence 33.33 both
- **Roving keyframes**: `prop.setRovingAtKey(index, true)`
- **Property value types**: Position [x,y] or [x,y,z], Scale [x,y] or [x,y,z] as percentages, Rotation in degrees, Opacity 0-100, Color [r,g,b] 0-1 range
- **Separated dimensions**: Check `prop.dimensionsSeparated`, access via ADBE Position_0/_1/_2

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/keyframes-animation.md
git commit -m "feat: add keyframes-animation.md rule file"
```

---

### Task 11: Write expressions.md

**Files:**
- Create: `after-effects-assistant/rules/expressions.md`

**Step 1: Write the rule file**

Cover:
- **Setting an expression**: `prop.expression = "time * 100"`
- **Enabling/disabling**: `prop.expressionEnabled = true/false`
- **Reading**: `prop.expression` returns the string
- **Expression errors**: `prop.expressionError` returns error string or empty
- **Common expression patterns**: wiggle, loopOut, loopIn, valueAtTime, linear, ease, clamp
- **Linking properties**: `thisComp.layer("Name").transform.position`
- **Expression controls**: slider, checkbox, color, point, layer, dropdown
- **The expression language**: JavaScript-like but runs inside AE's expression engine, not ExtendScript
- **Gotcha**: Expressions are strings set via ExtendScript. Escape quotes properly.
- **Gotcha**: `prop.value` returns the post-expression value. `prop.valueAtTime(t, true)` returns pre-expression.

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/expressions.md
git commit -m "feat: add expressions.md rule file"
```

---

### Task 12: Write composition-management.md

**Files:**
- Create: `after-effects-assistant/rules/composition-management.md`

**Step 1: Write the rule file**

Cover:
- **Creating comps**: `app.project.items.addComp(name, width, height, pixelAspect, duration, fps)`
- **Comp settings**: `.width`, `.height`, `.duration`, `.frameRate`, `.bgColor`, `.pixelAspect`
- **Precompose**: `comp.layers.precompose([indices], name, moveAll)` — indices is 1-based array
- **Nesting**: Add comp as layer: find the CompItem, the layer referencing it uses `comp.layers.add(compItem)`
- **Work area**: `comp.workAreaStart`, `comp.workAreaDuration`
- **Display start time**: `comp.displayStartTime`
- **Motion blur**: `comp.motionBlur`
- **Comp in folders**: `folder.items.addComp(...)` vs `app.project.items.addComp(...)`
- **Finding comps by name**: iterate `app.project.items`, check `instanceof CompItem`
- **Gotcha**: precompose indices must be contiguous and 1-based

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/composition-management.md
git commit -m "feat: add composition-management.md rule file"
```

---

### Task 13: Write effects.md

**Files:**
- Create: `after-effects-assistant/rules/effects.md`

**Step 1: Write the rule file**

Cover:
- **Adding effects**: `layer.property("ADBE Effect Parade").addProperty("matchName")`
- **Removing effects**: `effect.remove()`
- **Effect parameters**: Access by index `effect.property(1)` or matchName
- **Setting values**: `effect.property("paramMatchName").setValue(value)`
- **Enabling/disabling**: `effect.enabled = true/false`
- **Common effect matchNames**: Gaussian Blur (`ADBE Gaussian Blur 2`), Fill (`ADBE Fill`), Tint (`ADBE Tint`), etc.
- **Finding effects by name**: iterate `effects.numProperties`
- **Gotcha**: `addProperty` requires the matchName, not display name
- **Gotcha**: Some effects have different matchNames across AE versions

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/effects.md
git commit -m "feat: add effects.md rule file"
```

---

### Task 14: Write assets-footage.md

**Files:**
- Create: `after-effects-assistant/rules/assets-footage.md`

**Step 1: Write the rule file**

Cover:
- **Importing**: `app.project.importFile(new ImportOptions(new File(path)))`
- **Import as comp**: `importOptions.importAs = ImportAsType.COMP`
- **Replacing footage**: `footageItem.replace(new File(newPath))`
- **Creating folders**: `app.project.items.addFolder(name)`
- **Moving items to folders**: `item.parentFolder = folder`
- **Footage properties**: `.mainSource`, `.hasVideo`, `.hasAudio`, `.footageMissing`
- **Proxies**: `footageItem.setProxy(new File(proxyPath))`, `footageItem.setProxyToNone()`
- **Gotcha**: Import paths must be absolute on macOS

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/assets-footage.md
git commit -m "feat: add assets-footage.md rule file"
```

---

### Task 15: Write rendering.md

**Files:**
- Create: `after-effects-assistant/rules/rendering.md`

**Step 1: Write the rule file**

Cover:
- **Adding to render queue**: `app.project.renderQueue.items.add(comp)`
- **Output module**: `rqItem.outputModule(1)`
- **Setting output path**: `outputModule.file = new File(path)`
- **Applying templates**: `outputModule.applyTemplate(templateName)`, `rqItem.applyTemplate(templateName)`
- **Listing templates**: `outputModule.templates`, `rqItem.templates`
- **Starting render**: `app.project.renderQueue.render()`
- **Render status**: `rqItem.status` — `RQItemStatus.QUEUED`, `.RENDERING`, `.DONE`, etc.
- **Gotcha**: `render()` blocks the script until complete
- **Gotcha**: Render queue must have at least one queued item

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/rendering.md
git commit -m "feat: add rendering.md rule file"
```

---

### Task 16: Write batch-operations.md

**Files:**
- Create: `after-effects-assistant/rules/batch-operations.md`

**Step 1: Write the rule file**

Cover:
- **Pattern**: iterate layers/comps with for loop, apply same operation
- **Filtering layers by type**: check matchName or instanceof
- **Filtering by name pattern**: string matching with `indexOf`, regex not available in ES3
- **Batch rename**: iterate and set `.name`
- **Batch apply effect**: iterate and `addProperty`
- **Batch keyframe copy**: read keyframes from source property, write to target
- **Across comps**: iterate project items, find CompItems, apply operation
- **Performance**: use `app.beginSuppressDialogs()` and `app.endSuppressDialogs()` for batch operations that might trigger dialogs
- **Gotcha**: Modifying layer indices during iteration (deletion) — iterate in reverse

**Step 2: Commit**

```bash
git add after-effects-assistant/rules/batch-operations.md
git commit -m "feat: add batch-operations.md rule file"
```

---

### Task 17: Write ae-api-versions.md (initial stub)

**Files:**
- Create: `after-effects-assistant/references/ae-api-versions.md`

**Step 1: Write initial reference file**

Create a stub with known version differences. This will be expanded with the full research task later.

Cover what is known:
- Version number to year mapping (16=CC2019, 17=CC2020, 18=CC2021, 22=2022, 23=2023, 24=2024, 25=2025)
- Notable additions per version (e.g., layer tagging in 24.x, properties panel scripting in 25.x)
- JXA requirement for 2024+ (AppleScript DoScriptFile is unreliable)
- Mark as TODO: full command ID mapping per version

**Step 2: Commit**

```bash
git add after-effects-assistant/references/ae-api-versions.md
git commit -m "feat: add ae-api-versions.md reference stub"
```

---

### Task 18: End-to-end test — run active-state.jsx against real AE

**Step 1: Verify AE is running and has a project open**

Open After Effects manually with any project.

**Step 2: Run the active state query**

```bash
cd "/Users/michaelnahmias/Documents/projects/aedev.tools/after effects skills"
bash after-effects-assistant/scripts/runner.sh after-effects-assistant/scripts/active-state.jsx
```

Expected: JSON output with aeVersion, activeComp info, selectedLayers.

**Step 3: Run project overview**

```bash
bash after-effects-assistant/scripts/runner.sh after-effects-assistant/scripts/project-overview.jsx
```

Expected: JSON with project structure, comps, footage items.

**Step 4: Run comp detail**

```bash
bash after-effects-assistant/scripts/runner.sh after-effects-assistant/scripts/comp-detail.jsx
```

Expected: JSON with layer list for active comp.

**Step 5: Run layer detail on selected layer**

Select a layer in AE, then:
```bash
bash after-effects-assistant/scripts/runner.sh after-effects-assistant/scripts/layer-detail.jsx
```

Expected: JSON with transform keyframes, effects, expressions for selected layer.

**Step 6: Fix any issues found during testing**

If scripts fail, debug and fix. Common issues:
- #include paths may need adjustment (relative to script location)
- File permissions on /tmp/
- AE scripting preference not enabled

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found in end-to-end testing"
```

---

### Task 19: Final commit — complete skill package

**Step 1: Verify all files exist**

```bash
find after-effects-assistant -type f | sort
```

Expected output:
```
after-effects-assistant/SKILL.md
after-effects-assistant/references/ae-api-versions.md
after-effects-assistant/rules/assets-footage.md
after-effects-assistant/rules/batch-operations.md
after-effects-assistant/rules/composition-management.md
after-effects-assistant/rules/effects.md
after-effects-assistant/rules/expressions.md
after-effects-assistant/rules/extendscript-fundamentals.md
after-effects-assistant/rules/keyframes-animation.md
after-effects-assistant/rules/layer-manipulation.md
after-effects-assistant/rules/rendering.md
after-effects-assistant/scripts/active-state.jsx
after-effects-assistant/scripts/comp-detail.jsx
after-effects-assistant/scripts/layer-detail.jsx
after-effects-assistant/scripts/lib/json2.jsx
after-effects-assistant/scripts/lib/utils.jsx
after-effects-assistant/scripts/project-overview.jsx
after-effects-assistant/scripts/runner.sh
```

**Step 2: Read SKILL.md to verify it references all files correctly**

**Step 3: Commit the complete skill**

```bash
git add after-effects-assistant/
git commit -m "feat: complete after-effects-assistant skill v1.0"
```
