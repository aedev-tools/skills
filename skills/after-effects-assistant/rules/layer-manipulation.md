# Layer Manipulation

> Rule file for creating, deleting, duplicating, reordering, parenting, and configuring layers in After Effects via ExtendScript.

---

## Creating Layers

All layer creation methods live on `comp.layers` (a `LayerCollection`). Every method returns the newly created layer.

### Solid Layer

```jsx
// comp.layers.addSolid(color, name, width, height, pixelAspect)
// color is [r, g, b] with each channel in the 0-1 range
var solid = comp.layers.addSolid([1, 0, 0], "Red Solid", comp.width, comp.height, 1);
```

### Null Object

```jsx
// comp.layers.addNull(duration)
// duration is optional (defaults to comp duration)
var nullLayer = comp.layers.addNull();

// With explicit duration (in seconds)
var nullLayer = comp.layers.addNull(5);
```

### Shape Layer

```jsx
var shape = comp.layers.addShape();
```

### Text Layer

```jsx
// Pass a string directly
var text = comp.layers.addText("Hello");

// Or pass a TextDocument for more control
var textDoc = new TextDocument("Hello");
textDoc.fontSize = 72;
textDoc.font = "Arial";
textDoc.fillColor = [1, 1, 1];
var text = comp.layers.addText(textDoc);
```

**CRITICAL: Some TextDocument properties (like `justification`) can only be set AFTER the layer exists.** Set them by reading the source text property back from the layer, modifying it, and calling `setValue()`:

```jsx
// WRONG - justification on a standalone TextDocument throws
// "Unable to set value as it is not associated with a layer"
var textDoc = new TextDocument("Hello");
textDoc.justification = ParagraphJustification.CENTER_JUSTIFY; // ERROR

// CORRECT - set justification after creating the layer
var textLayer = comp.layers.addText("Hello");
var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
var textDoc = textProp.value;
textDoc.fontSize = 72;
textDoc.font = "Arial";
textDoc.fillColor = [1, 1, 1];
textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
textProp.setValue(textDoc);
```

Properties safe to set on standalone TextDocument (before addText): `text`, `fontSize`, `font`, `fillColor`, `strokeColor`, `strokeWidth`, `applyFill`, `applyStroke`.

Properties that MUST be set after layer creation (via setValue): `justification`, `baselineLocs`, `boxText`, `boxTextSize`, `baselineShift`, `tracking`.

### Camera

```jsx
// comp.layers.addCamera(name, centerPoint)
var cam = comp.layers.addCamera("Camera 1", [comp.width / 2, comp.height / 2]);
```

### Light

```jsx
// comp.layers.addLight(name, centerPoint)
var light = comp.layers.addLight("Light 1", [comp.width / 2, comp.height / 2]);
```

### Add Existing Footage or Composition as a Layer

```jsx
// comp.layers.add(item) — item is a FootageItem or CompItem from the project
var layer = comp.layers.add(footageItem);

// Example: find a project item by name and add it
var item = null;
for (var i = 1; i <= app.project.numItems; i++) {
    if (app.project.item(i).name === "logo.png") {
        item = app.project.item(i);
        break;
    }
}
if (item) {
    var layer = comp.layers.add(item);
}
```

---

## Deleting Layers

```jsx
layer.remove();
```

When deleting multiple layers in a loop, iterate in **reverse order** to avoid index shifting:

```jsx
// CORRECT: reverse iteration
for (var i = comp.numLayers; i >= 1; i--) {
    var layer = comp.layer(i);
    if (layer.name.indexOf("temp") === 0) {
        layer.remove();
    }
}
```

```jsx
// WRONG: forward iteration — indices shift after each removal
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.name.indexOf("temp") === 0) {
        layer.remove(); // next layer now has this index, gets skipped
    }
}
```

---

## Duplicating Layers

```jsx
// duplicate() returns the new layer (inserted directly above the original)
var newLayer = layer.duplicate();
newLayer.name = "Copy of " + layer.name;
```

---

## Reordering Layers

Layer index 1 is the topmost layer in the comp. Moving a layer changes the indices of other layers.

```jsx
// Move layer directly above another layer
layer.moveBefore(otherLayer);

// Move layer directly below another layer
layer.moveAfter(otherLayer);

// Move layer to top of comp (index 1)
layer.moveToBeginning();

// Move layer to bottom of comp
layer.moveToEnd();
```

### Example: Move a layer to a specific index

```jsx
// Move "Logo" to index 3
var logo = comp.layer("Logo");
var targetLayer = comp.layer(3);
logo.moveAfter(targetLayer);
```

---

## Parenting

```jsx
// Set parent
layer.parent = otherLayer;

// Remove parent (unparent)
layer.parent = null;
```

### Example: Parent all selected layers to a null

```jsx
var nullCtrl = comp.layers.addNull();
nullCtrl.name = "Controller";
var sel = comp.selectedLayers;
for (var i = 0; i < sel.length; i++) {
    sel[i].parent = nullCtrl;
}
```

---

## Renaming

```jsx
layer.name = "New Name";
```

---

## Layer Flags

### Visibility, Lock, Solo, Shy

```jsx
layer.enabled = true;   // visibility (eye icon)
layer.enabled = false;

layer.locked = true;     // lock the layer
layer.locked = false;

layer.solo = true;       // solo the layer
layer.solo = false;

layer.shy = true;        // mark layer as shy
layer.shy = false;
```

### 3D Layer (AVLayer only)

```jsx
// Only works on AVLayer instances (solids, footage, shapes, text, nulls)
// Does NOT apply to cameras or lights (they are always 3D)
layer.threeDLayer = true;
layer.threeDLayer = false;
```

### Adjustment Layer (AVLayer only)

```jsx
layer.adjustmentLayer = true;
layer.adjustmentLayer = false;
```

### Guide Layer

```jsx
layer.guideLayer = true;
layer.guideLayer = false;
```

### Full Example: Create an Adjustment Layer

```jsx
var adj = comp.layers.addSolid([0, 0, 0], "Adjustment", comp.width, comp.height, 1);
adj.adjustmentLayer = true;
adj.name = "Color Correction";
```

---

## Timing

All time values are in **seconds** (floating point).

```jsx
// In point — when the layer becomes visible
layer.inPoint = 1.0;

// Out point — when the layer stops being visible
layer.outPoint = 5.0;

// Start time — shifts the layer's internal timeline
// Positive values delay the layer content; negative values pre-roll it
layer.startTime = 0.5;

// Stretch — time stretch factor as a percentage
// 100 = normal speed, 200 = half speed, 50 = double speed
layer.stretch = 100;
```

### Example: Trim a Layer to the Work Area

```jsx
layer.inPoint = comp.workAreaStart;
layer.outPoint = comp.workAreaStart + comp.workAreaDuration;
```

### Example: Offset a Layer to Start at the Current Time

```jsx
var offset = comp.time - layer.inPoint;
layer.startTime = layer.startTime + offset;
```

---

## Labels

```jsx
// label is an integer 0-16
// 0 = None, 1 = Red, 2 = Yellow, 3 = Aqua, 4 = Pink, 5 = Lavender,
// 6 = Peach, 7 = Sea Foam, 8 = Blue, 9 = Green, 10 = Purple,
// 11 = Orange, 12 = Brown, 13 = Fuchsia, 14 = Cyan, 15 = Sandstone, 16 = Dark Green
layer.label = 1;  // Red
layer.label = 8;  // Blue
layer.label = 0;  // None (remove label color)
```

---

## MUST

- **MUST** check `layer.locked` before modifying any layer property. Locked layers throw errors on write operations. Unlock first, make changes, then re-lock if needed:

```jsx
var wasLocked = layer.locked;
if (wasLocked) {
    layer.locked = false;
}

// ... modify the layer ...

if (wasLocked) {
    layer.locked = true;
}
```

- **MUST** wrap all layer modifications in an undo group:

```jsx
app.beginUndoGroup("AE Assistant: modify layers");
try {
    // ... layer operations ...
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```

- **MUST** verify the comp exists and is a `CompItem` before accessing `comp.layers`:

```jsx
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    writeResult({ error: "No active composition" });
    return;
}
```

- **MUST** use 1-based indexing when accessing layers by index (`comp.layer(1)` is the first layer). The `selectedLayers` array is 0-based.

---

## FORBIDDEN

- **FORBIDDEN:** Accessing `layer.source` on cameras or lights without a try/catch. These layer types have no source and will throw:

```jsx
// WRONG — will throw on cameras and lights
var src = layer.source;

// CORRECT — guard with try/catch
try {
    var src = layer.source;
} catch (e) {
    // layer has no source (camera, light)
}

// ALSO CORRECT — check type first
if (layer instanceof AVLayer) {
    var src = layer.source;
}
```

- **FORBIDDEN:** Using `layer.threeDLayer` or `layer.adjustmentLayer` on CameraLayer or LightLayer. These properties only exist on AVLayer.

- **FORBIDDEN:** Using ES5+ syntax. Use `var`, not `let`/`const`. Use string concatenation with `+`, not template literals.

---

## Gotchas

- **Locked layers block ALL modifications:** `layer.moveToEnd()`, `layer.moveBefore()`, `layer.moveAfter()`, `layer.moveToBeginning()`, setting properties, adding effects — ALL throw errors on locked layers. Always check and temporarily unlock:

```jsx
var wasLocked = layer.locked;
if (wasLocked) layer.locked = false;
layer.moveToEnd();  // or any other operation
if (wasLocked) layer.locked = true;
```

- **Index shifting on move:** `layer.moveBefore()`, `layer.moveAfter()`, `layer.moveToBeginning()`, and `layer.moveToEnd()` change the indices of other layers. Never cache layer indices across move operations. Re-fetch layers by name or re-read indices after moving.

- **Index shifting on delete:** When deleting layers in a loop, always iterate in reverse (`for (var i = comp.numLayers; i >= 1; i--)`) to avoid skipping layers due to index shifting.

- **addSolid color range:** `addSolid` expects color values as `[r, g, b]` in the **0.0 to 1.0** range, not 0-255. To convert from 0-255: `[r/255, g/255, b/255]`.

```jsx
// Convert hex #FF6600 to AE color
var color = [0xFF / 255, 0x66 / 255, 0x00 / 255];  // [1.0, 0.4, 0.0]
var solid = comp.layers.addSolid(color, "Orange Solid", comp.width, comp.height, 1);
```

- **duplicate() position:** `layer.duplicate()` places the new layer directly above the original (at the same index, pushing the original down by one). The returned layer reference points to the new copy.

- **Parenting and transforms:** Setting `layer.parent` does not change the layer's visual position. AE recalculates the transform values to keep the layer in the same world-space position. If you want to preserve the raw transform values instead, save them before parenting and restore after.

- **Null layers are AVLayers:** Null objects are instances of AVLayer with `nullLayer === true`. They support `threeDLayer`, `parent`, and transform properties, but have no visual content.

- **selectedLayers is 0-based:** `comp.selectedLayers` returns a JavaScript array (0-based), while `comp.layer(index)` uses 1-based indexing. Do not confuse the two:

```jsx
// 0-based array
var sel = comp.selectedLayers;
for (var i = 0; i < sel.length; i++) {
    var layer = sel[i]; // direct layer reference, no index needed
}

// 1-based layer access
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
}
```

- **Camera and Light layers:** These are always 3D. They do not have `threeDLayer`, `adjustmentLayer`, or `guideLayer` properties. They are instances of `CameraLayer` and `LightLayer`, not `AVLayer`.

- **layer.stretch behavior:** Stretch is percentage-based. Setting `layer.stretch = 200` makes the layer play at half speed (doubled duration). Setting it to `50` doubles the playback speed (halved duration). Stretch affects `inPoint` and `outPoint` relative to `startTime`.

---

## Complete Example: Build a Layer Stack

```jsx
app.beginUndoGroup("AE Assistant: build layer stack");
try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return;
    }

    // Create a background solid
    var bg = comp.layers.addSolid(
        [0.1, 0.1, 0.15], "Background",
        comp.width, comp.height, 1
    );
    bg.moveToEnd();
    bg.locked = true;
    bg.label = 1; // Red

    // Create a null controller
    var ctrl = comp.layers.addNull();
    ctrl.name = "Master Controller";
    ctrl.threeDLayer = false;
    ctrl.label = 5; // Lavender

    // Create a text layer
    var textDoc = new TextDocument("Title");
    textDoc.fontSize = 120;
    textDoc.fillColor = [1, 1, 1];
    var title = comp.layers.addText(textDoc);
    title.name = "Title Text";
    title.parent = ctrl;
    title.label = 8; // Blue

    // Create a shape layer
    var shape = comp.layers.addShape();
    shape.name = "Underline";
    shape.parent = ctrl;
    shape.label = 8; // Blue

    // Trim all layers to 5 seconds
    var layers = [bg, ctrl, title, shape];
    for (var i = 0; i < layers.length; i++) {
        var wasLocked = layers[i].locked;
        if (wasLocked) layers[i].locked = false;
        layers[i].inPoint = 0;
        layers[i].outPoint = 5;
        if (wasLocked) layers[i].locked = true;
    }

    writeResult({
        success: true,
        message: "Created layer stack with 4 layers",
        layers: [bg.name, ctrl.name, title.name, shape.name]
    });
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```
