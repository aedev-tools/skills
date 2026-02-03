# After Effects Assistant Skill — Design Document

## Overview

An Agent Skills-spec skill that lets Claude automate Adobe After Effects by reading project state, generating ExtendScript, and executing it via `osascript`. No CEP panel required.

## Skill Structure

```
after-effects-assistant/
├── SKILL.md
├── scripts/
│   ├── project-overview.jsx      # Lightweight: comps, folders, footage
│   ├── active-state.jsx          # Active comp, selected layers, CTI, work area
│   ├── comp-detail.jsx           # Medium: layer list for a specific comp
│   ├── layer-detail.jsx          # Deep: properties, keyframes, expressions for specific layers
│   └── runner.sh                 # AE version detection, execution via osascript, result capture
├── rules/
│   ├── extendscript-fundamentals.md
│   ├── layer-manipulation.md
│   ├── keyframes-animation.md
│   ├── expressions.md
│   ├── composition-management.md
│   ├── effects.md
│   ├── assets-footage.md
│   ├── rendering.md
│   └── batch-operations.md
└── references/
    └── ae-api-versions.md
```

## Execution Model

Scripts run via osascript against After Effects:
```bash
osascript -e 'tell application "Adobe After Effects <year>" to DoScriptFile "<path>"'
```

## Workflow

1. Run `active-state.jsx` to get current comp, selection, CTI position
2. Run `project-overview.jsx` on first interaction or when project context is needed
3. Load relevant rule file based on task type
4. Run targeted detail scripts if task needs property-level data
5. Always load `extendscript-fundamentals.md` (ES3 constraints)
6. Generate action script wrapped in undo group
7. Auto-run for reads/non-destructive additions. Confirm before destructive actions.
8. Execute via `runner.sh`, read JSON result back

## Progressive Context Loading

| Level | Script | Data | When |
|-------|--------|------|------|
| State | active-state.jsx | Active comp, selection, CTI, work area, AE version | Every interaction |
| Overview | project-overview.jsx | Comps, folders, footage items | First interaction or on demand |
| Medium | comp-detail.jsx | Layer list with types, in/out, parent, blend mode | Task targets a specific comp |
| Deep | layer-detail.jsx | Transform, keyframes, effects, expressions | Task targets specific layer properties |

## Rule File Routing

| Task involves | Load rule file |
|---|---|
| Layers (create, move, parent, duplicate) | layer-manipulation.md |
| Keyframes, animation, easing | keyframes-animation.md |
| Expressions | expressions.md |
| Compositions (create, precompose, nest) | composition-management.md |
| Effects and parameters | effects.md |
| Import, footage, assets | assets-footage.md |
| Render queue, export | rendering.md |
| Bulk/batch operations | batch-operations.md |
| Version-specific features | references/ae-api-versions.md |

## Safety

- Every action script wrapped in `app.beginUndoGroup()` / `app.endUndoGroup()`
- Auto-run: read-only queries, non-destructive additions
- Confirm first: deletions, replacing footage, clearing keyframes, render queue, overwrites
- Error handling with try/catch inside undo group

## Generated Script Template

```jsx
app.beginUndoGroup("AE Assistant: <action description>");
try {
    var comp = app.project.activeItem;
    // ... generated action code ...
} catch (e) {
    alert("AE Assistant Error: " + e.toString());
} finally {
    app.endUndoGroup();
}
```

## AE Version Detection

1. Scan `/Applications` for `Adobe After Effects *` directories
2. Multiple found: ask user which to use, cache choice in `~/.ae-assistant-config`
3. One found: use automatically
4. None found: error with instructions
5. Cached version used on subsequent runs, user can override

## ExtendScript Constraints (ES3)

- No `let`, `const`, arrow functions, template literals
- No `Array.map/filter/reduce`, no `JSON.parse/stringify`
- 1-based layer/item indexing
- Property access via matchNames (not display names) for reliability
- Custom JSON serialization for returning structured data

## Research Tasks

- Compile all AE scripting API command IDs per version year
- Document which features were added/deprecated in each version
- Map matchNames for all built-in effects across versions

## Query Script Output Formats

### active-state.jsx
```json
{
  "activeComp": "Main Comp",
  "selectedLayers": ["Logo", "Background"],
  "currentTime": 2.5,
  "workAreaStart": 0,
  "workAreaEnd": 10,
  "aeVersion": "25.1"
}
```

### project-overview.jsx
```json
{
  "projectName": "Brand Video",
  "items": [
    {"name": "Main Comp", "type": "comp", "duration": 30, "fps": 30, "width": 1920, "height": 1080},
    {"name": "logo.png", "type": "footage", "path": "/assets/logo.png"},
    {"name": "Assets", "type": "folder", "children": []}
  ]
}
```

### comp-detail.jsx
```json
{
  "comp": "Main Comp",
  "layers": [
    {"index": 1, "name": "Title", "type": "text", "inPoint": 0, "outPoint": 10, "enabled": true, "locked": false, "parent": null, "blendMode": "normal"}
  ]
}
```

### layer-detail.jsx
```json
{
  "layer": "Logo",
  "transform": {
    "position": {"value": [960, 540], "keyframes": [{"time": 0, "value": [960, 800]}, {"time": 1, "value": [960, 540]}]},
    "scale": {"value": [100, 100], "keyframes": []},
    "opacity": {"value": 100, "keyframes": []}
  },
  "effects": [
    {"name": "Gaussian Blur", "matchName": "ADBE Gaussian Blur 2", "params": {"Blurriness": 5}}
  ],
  "expressions": {}
}
```
