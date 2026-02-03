# Composition Management

> **Loaded when:** the task involves creating, configuring, precomposing, nesting, or finding compositions in After Effects via ExtendScript.

All code in this file is ES3-compatible ExtendScript. See `extendscript-fundamentals.md` for baseline syntax rules.

---

## Creating Compositions

```jsx
// app.project.items.addComp(name, width, height, pixelAspect, duration, fps)
// Returns a CompItem
var comp = app.project.items.addComp("Main Comp", 1920, 1080, 1, 10, 29.97);
```

All arguments are required:

| Argument | Type | Description |
|---|---|---|
| `name` | String | Composition name |
| `width` | Integer | Width in pixels |
| `height` | Integer | Height in pixels |
| `pixelAspect` | Number | Pixel aspect ratio (1 for square pixels) |
| `duration` | Number | Duration in seconds |
| `fps` | Number | Frame rate (e.g., 24, 29.97, 30, 60) |

---

## Composition Settings

### Dimensions and Timing

```jsx
// Read/write dimensions
comp.width = 1920;
comp.height = 1080;

// Duration in seconds
comp.duration = 30;

// Frame rate
comp.frameRate = 24;

// Pixel aspect ratio (1 = square pixels)
comp.pixelAspect = 1;
```

### Background Color

```jsx
// bgColor is [r, g, b] with each channel in the 0-1 range
comp.bgColor = [0, 0, 0];           // black
comp.bgColor = [0.1, 0.1, 0.15];    // dark blue-grey
```

### Nested Composition Overrides

```jsx
// When true, nested comps retain their own frame rate instead of inheriting the parent's
comp.preserveNestedFrameRate = true;

// When true, nested comps retain their own resolution instead of inheriting the parent's
comp.preserveNestedResolution = true;
```

---

## Work Area

The work area defines the region used by preview and render operations.

```jsx
// Work area start time in seconds
comp.workAreaStart = 2;

// Work area duration in seconds (not end time)
comp.workAreaDuration = 5;

// The work area spans from workAreaStart to workAreaStart + workAreaDuration
// In this example: 2s to 7s
```

---

## Display Start Time

Controls the timecode offset shown in the timeline. Does not affect actual layer timing.

```jsx
// Set the display start time in seconds
comp.displayStartTime = 3600;   // display timecode starts at 1:00:00:00

// displayStartFrame is read-only — it reflects displayStartTime as a frame number
var startFrame = comp.displayStartFrame;
```

---

## Motion Blur

```jsx
// Enable motion blur for the composition (layers must also have MB enabled individually)
comp.motionBlur = true;

// Shutter angle in degrees (0-720). Default is 180.
comp.shutterAngle = 180;

// Shutter phase in degrees (-360 to 360). Default is -90.
// Controls when the shutter opens relative to each frame
comp.shutterPhase = -90;
```

---

## Finding Compositions in the Project

Iterate `app.project.items` and check each item with `instanceof CompItem`.

```jsx
// Find all compositions
var comps = [];
for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem) {
        comps.push(item);
    }
}
```

### Find a Composition by Name

```jsx
function findCompByName(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem && item.name === name) {
            return item;
        }
    }
    return null;
}

var mainComp = findCompByName("Main Comp");
```

---

## Creating Compositions in Folders

Items are placed into folders by setting their `parentFolder` property. By default new items are created at the project root.

```jsx
// Create or find a folder
var folder = app.project.items.addFolder("Precomps");

// Create a comp and move it into the folder
var comp = app.project.items.addComp("Nested Comp", 1920, 1080, 1, 10, 24);
comp.parentFolder = folder;
```

### Find an Existing Folder by Name

```jsx
function findFolderByName(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FolderItem && item.name === name) {
            return item;
        }
    }
    return null;
}

var precompsFolder = findFolderByName("Precomps");
if (!precompsFolder) {
    precompsFolder = app.project.items.addFolder("Precomps");
}
```

---

## Nesting Compositions

Add an existing `CompItem` as a layer inside another composition using `comp.layers.add()`.

```jsx
var mainComp = app.project.activeItem;
var nestedComp = findCompByName("Lower Third");

if (mainComp && mainComp instanceof CompItem && nestedComp) {
    var precompLayer = mainComp.layers.add(nestedComp);
    // precompLayer is an AVLayer whose source is nestedComp
}
```

---

## Precomposing Layers

```jsx
// comp.layers.precompose(layerIndices, name, moveAllAttributes)
// layerIndices  : Array of 1-based layer indices (must be contiguous)
// name          : String name for the new precomp
// moveAllAttributes : Boolean
//   true  = moves all attributes (effects, masks, transforms, keyframes) into the precomp
//   false = moves only the layers; attributes stay on the collapsed layer in the parent comp

var newComp = comp.layers.precompose([1, 2, 3], "BG Elements", true);
// newComp is the newly created CompItem
```

### moveAllAttributes Explained

| `moveAllAttributes` | Behaviour |
|---|---|
| `true` | All effects, masks, transforms, track mattes, and keyframes are moved into the new precomp. The resulting layer in the parent comp is clean. |
| `false` | Only the layer sources are moved into the new precomp. Effects, masks, and transforms remain on the collapsed layer in the parent comp. Only valid when precomposing a single layer. |

---

## Collecting Layer Indices for Precompose

`comp.selectedLayers` is a 0-based JavaScript array, but `precompose()` requires 1-based layer indices. Extract `.index` from each selected layer.

```jsx
var sel = comp.selectedLayers;
var indices = [];
for (var i = 0; i < sel.length; i++) {
    indices.push(sel[i].index);
}

// Sort ascending so they are in contiguous order
indices.sort(function(a, b) { return a - b; });
```

---

## MUST

- **MUST** wrap all composition creation and modification in an undo group:

```jsx
app.beginUndoGroup("AE Assistant: create composition");
try {
    // ... comp operations ...
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```

- **MUST** verify the active item is a `CompItem` before accessing `comp.layers` or calling `precompose()`:

```jsx
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    writeResult({ error: "No active composition" });
    return;
}
```

- **MUST** supply all six arguments to `addComp()`. Omitting any argument throws an error.

- **MUST** use 1-based layer indices in the array passed to `precompose()`. Layer index 1 is the topmost layer.

- **MUST** sort layer indices when collecting them from `selectedLayers` for precompose, since selection order is not guaranteed to match layer stack order.

- **MUST** enable motion blur on individual layers (`layer.motionBlur = true`) in addition to the composition-level `comp.motionBlur = true`. Neither alone is sufficient.

---

## FORBIDDEN

- **FORBIDDEN:** Passing 0-based indices to `precompose()`. The method expects 1-based layer indices matching `layer.index`. Using 0-based array positions from `selectedLayers` will precompose the wrong layers or throw an out-of-range error.

```jsx
// WRONG -- using 0-based loop counter as the index
var sel = comp.selectedLayers;
var indices = [];
for (var i = 0; i < sel.length; i++) {
    indices.push(i);  // WRONG: this is the array position, not the layer index
}

// CORRECT -- use the layer's actual .index property
var sel = comp.selectedLayers;
var indices = [];
for (var i = 0; i < sel.length; i++) {
    indices.push(sel[i].index);  // CORRECT: 1-based layer index
}
```

- **FORBIDDEN:** Using `moveAllAttributes = false` when precomposing multiple layers. AE only supports `false` for single-layer precompose. Passing `false` with multiple indices throws an error.

- **FORBIDDEN:** Setting `comp.workAreaDuration` to 0 or a negative value. This causes undefined behavior.

- **FORBIDDEN:** Using ES5+ syntax. Use `var`, not `let`/`const`. Use string concatenation with `+`, not template literals.

---

## Gotchas

- **Precompose indices must be contiguous.** The array of layer indices passed to `precompose()` must form an unbroken range in the layer stack (e.g., `[2, 3, 4]`). Non-contiguous indices (e.g., `[1, 3, 5]`) will throw an error. If you need to precompose non-adjacent layers, move them to be adjacent first using `layer.moveBefore()` or `layer.moveAfter()`.

- **Precompose with `moveAllAttributes = true` moves everything.** Effects, masks, track mattes, transforms, expressions, and keyframes are all moved into the precomp. The resulting layer in the parent composition is a bare reference to the new precomp. This is usually what you want for a clean hand-off.

- **Precompose with `moveAllAttributes = false` keeps attributes on the parent layer.** Only the source layers are moved into the precomp. Effects, masks, and transforms stay on the collapsed layer in the parent comp. This is only valid for single-layer precompose.

- **`precompose()` returns a `CompItem`, not a layer.** The return value is the newly created composition in the project panel. To get the new precomp layer in the parent comp, find it by name or index after the call -- precompose replaces the original layers with a single new layer at the topmost original index.

- **`comp.workAreaDuration` is a duration, not an end time.** The work area ends at `comp.workAreaStart + comp.workAreaDuration`. Setting `workAreaDuration = 5` with `workAreaStart = 2` means the work area spans from 2s to 7s.

- **`comp.displayStartTime` only changes display timecode.** It shifts how frame numbers and timecodes appear in the UI. It does not change where layers sit on the timeline or affect `layer.inPoint`, `layer.startTime`, or `comp.workAreaStart`.

- **`comp.bgColor` uses the 0-1 range.** Like all AE color arrays, values are `[r, g, b]` where each channel is 0.0 to 1.0, not 0-255.

- **Adding a comp as a layer creates a live link.** Changes to the nested comp are immediately reflected in the parent. There is no "flattening" -- the nested comp layer is a live reference to the `CompItem`.

- **`selectedLayers` order vs. layer stack order.** `comp.selectedLayers` returns layers in selection order (the order the user clicked), which may not match the layer stack order. Always extract `.index` from each layer and sort the indices before passing to `precompose()`.

---

## Complete Example: Create a New Comp and Precompose Selected Layers

```jsx
app.beginUndoGroup("AE Assistant: precompose selected layers");
try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return;
    }

    var sel = comp.selectedLayers;
    if (sel.length === 0) {
        writeResult({ error: "No layers selected" });
        return;
    }

    // Collect 1-based layer indices and sort ascending
    var indices = [];
    for (var i = 0; i < sel.length; i++) {
        indices.push(sel[i].index);
    }
    indices.sort(function(a, b) { return a - b; });

    // Verify indices are contiguous
    for (var i = 1; i < indices.length; i++) {
        if (indices[i] !== indices[i - 1] + 1) {
            writeResult({
                error: "Selected layers are not contiguous in the layer stack. "
                     + "Indices: " + indices.join(", ")
            });
            return;
        }
    }

    // Create the precomp (moveAllAttributes = true)
    var precompName = "Precomp - " + sel[0].name;
    var newComp = comp.layers.precompose(indices, precompName, true);

    // Optionally organize: move the new precomp into a folder
    var folder = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FolderItem && item.name === "Precomps") {
            folder = item;
            break;
        }
    }
    if (!folder) {
        folder = app.project.items.addFolder("Precomps");
    }
    newComp.parentFolder = folder;

    writeResult({
        success: true,
        message: "Precomposed " + indices.length + " layers into \"" + precompName + "\"",
        precompName: newComp.name,
        precompId: newComp.id,
        layerCount: indices.length
    });
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```
