# Batch & Bulk Operations

> **Loaded when:** the task involves operating on multiple layers, multiple comps, batch rename, bulk effect application, or any repetitive operation across collections.

All code in this file is ES3-compatible ExtendScript. See `extendscript-fundamentals.md` for baseline syntax rules.

---

## Core Pattern: Iterate and Apply

Every batch operation follows the same shape: iterate a collection with a `for` loop, test each item against a condition, and apply the operation to items that match.

```jsx
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (condition(layer)) {
        // apply operation to layer
    }
}
```

AE collections (layers, project items, properties) are **1-based**. JavaScript arrays returned by AE (`selectedLayers`, `selectedProperties`) are **0-based**. Never mix the two indexing schemes.

---

## Filtering Layers

### By Type: `instanceof`

The most reliable way to filter layers by type. Check from most specific to least specific because `TextLayer` and `ShapeLayer` are subclasses of `AVLayer`.

```jsx
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);

    if (layer instanceof TextLayer) {
        // Text layers only
    } else if (layer instanceof ShapeLayer) {
        // Shape layers only
    } else if (layer instanceof CameraLayer) {
        // Cameras only
    } else if (layer instanceof LightLayer) {
        // Lights only
    } else if (layer instanceof AVLayer) {
        // Solids, footage, precomps, nulls, adjustment layers
    }
}
```

### By Type: `matchName`

An alternative when you need string-based dispatch (e.g. mapping types to handler functions).

| `layer.matchName` | Layer Type |
|---|---|
| `"ADBE AV Layer"` | AVLayer (footage, solid, precomp, null, adjustment) |
| `"ADBE Text Layer"` | TextLayer |
| `"ADBE Vector Layer"` | ShapeLayer |
| `"ADBE Camera Layer"` | CameraLayer |
| `"ADBE Light Layer"` | LightLayer |

```jsx
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.matchName === "ADBE Vector Layer") {
        // Shape layer
    }
}
```

### By Subtype Flags: `nullLayer`, `adjustmentLayer`

Null objects and adjustment layers are both `AVLayer` instances. Use their boolean flags to distinguish them.

```jsx
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer instanceof AVLayer) {
        if (layer.nullLayer) {
            // Null object
        } else if (layer.adjustmentLayer) {
            // Adjustment layer
        }
    }
}
```

### By Name: String Matching

Use `String.prototype.indexOf` for prefix, suffix, and substring matching. Regex is available in ES3 but is unreliable for complex patterns in ExtendScript -- prefer explicit string methods.

```jsx
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    var name = layer.name;

    // Prefix match
    if (name.indexOf("bg_") === 0) {
        // layer name starts with "bg_"
    }

    // Suffix match
    var suffix = "_ref";
    if (name.indexOf(suffix, name.length - suffix.length) !== -1) {
        // layer name ends with "_ref"
    }

    // Contains match
    if (name.indexOf("hero") !== -1) {
        // layer name contains "hero" anywhere
    }

    // Case-insensitive match
    if (name.toLowerCase().indexOf("title") !== -1) {
        // matches "Title", "TITLE", "title", etc.
    }
}
```

---

## Operating on Selected Layers

`comp.selectedLayers` returns a standard JavaScript array (0-based). Use it to limit operations to what the user has manually selected.

```jsx
var sel = comp.selectedLayers;
if (sel.length === 0) {
    writeResult({ error: "No layers selected" });
    return;
}

for (var i = 0; i < sel.length; i++) {
    var layer = sel[i];
    // apply operation
}
```

---

## Batch Rename

Iterate layers and set the `.name` property.

```jsx
// Rename layers: replace a prefix
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.name.indexOf("old_") === 0) {
        layer.name = "new_" + layer.name.substring(4);
    }
}
```

```jsx
// Rename layers: add a numbered suffix
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    layer.name = layer.name + " [" + i + "]";
}
```

---

## Batch Apply Effect

Add effects using `addProperty` on the layer's effects group (`"ADBE Effect Parade"`). Every effect is identified by its matchName.

```jsx
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    var effects = layer.property("ADBE Effect Parade");
    var blur = effects.addProperty("ADBE Gaussian Blur 2");
    blur.property("ADBE Gaussian Blur 2-0001").setValue(15); // Blurriness
}
```

```jsx
// Apply effect only to layers that don't already have it
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    var effects = layer.property("ADBE Effect Parade");
    var existing = effects.property("ADBE Gaussian Blur 2");
    if (!existing) {
        effects.addProperty("ADBE Gaussian Blur 2");
    }
}
```

---

## Batch Keyframe Copy

Read all keyframe data from a source property and write it to one or more target properties. This copies times, values, interpolation types, and temporal ease.

```jsx
function copyKeyframesToTargets(srcProp, targetProps) {
    for (var t = 0; t < targetProps.length; t++) {
        var dst = targetProps[t];

        // Clear existing keyframes (reverse order)
        for (var k = dst.numKeys; k >= 1; k--) {
            dst.removeKey(k);
        }

        if (srcProp.numKeys === 0) {
            // Static value -- copy directly
            dst.setValue(srcProp.value);
        } else {
            for (var k = 1; k <= srcProp.numKeys; k++) {
                var time = srcProp.keyTime(k);
                var value = srcProp.keyValue(k);
                dst.setValueAtTime(time, value);

                var newIdx = dst.nearestKeyIndex(time);

                // Copy interpolation type
                dst.setInterpolationTypeAtKey(newIdx,
                    srcProp.keyInInterpolationType(k),
                    srcProp.keyOutInterpolationType(k)
                );

                // Copy temporal ease
                try {
                    dst.setTemporalEaseAtKey(newIdx,
                        srcProp.keyInTemporalEase(k),
                        srcProp.keyOutTemporalEase(k)
                    );
                } catch (e) {
                    // Temporal ease not supported on this property type
                }
            }
        }
    }
}
```

### Usage: Copy Opacity Keyframes from First Selected Layer to All Others

```jsx
var sel = comp.selectedLayers;
if (sel.length < 2) {
    writeResult({ error: "Select at least 2 layers (source + targets)" });
    return;
}

var srcProp = sel[0].property("ADBE Transform Group").property("ADBE Opacity");
var targets = [];
for (var i = 1; i < sel.length; i++) {
    targets.push(sel[i].property("ADBE Transform Group").property("ADBE Opacity"));
}
copyKeyframesToTargets(srcProp, targets);
```

---

## Across Compositions

Iterate `app.project.items` (1-based) and check each item with `instanceof CompItem` to operate across all compositions in the project.

```jsx
for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem) {
        var comp = item;
        for (var j = 1; j <= comp.numLayers; j++) {
            var layer = comp.layer(j);
            // apply operation across every layer in every comp
        }
    }
}
```

### Filtering Comps by Name

```jsx
for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name.indexOf("FINAL_") === 0) {
        // Only comps whose name starts with "FINAL_"
    }
}
```

---

## Performance: Suppress Dialogs

For batch operations that touch many items, suppress modal dialogs that AE may pop up during the operation. This prevents the script from hanging on a dialog that requires user interaction.

```jsx
app.beginSuppressDialogs();
try {
    // batch operations here
} finally {
    app.endSuppressDialogs(false); // false = discard any suppressed alert text
}
```

Combined with the undo group pattern:

```jsx
app.beginUndoGroup("AE Assistant: batch operation");
app.beginSuppressDialogs();
try {
    // batch operations
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endSuppressDialogs(false);
    app.endUndoGroup();
}
```

---

## MUST

- **MUST** wrap all batch mutation operations in `app.beginUndoGroup()` / `app.endUndoGroup()` so the entire batch can be undone with a single Ctrl+Z / Cmd+Z.

- **MUST** iterate in **reverse** when removing layers, removing keyframes, or performing any operation that changes collection length or indices:

```jsx
for (var i = comp.numLayers; i >= 1; i--) {
    var layer = comp.layer(i);
    if (shouldRemove(layer)) {
        layer.remove();
    }
}
```

- **MUST** check `layer.locked` before modifying a layer in a batch loop. Locked layers throw on write. Unlock first, modify, then re-lock:

```jsx
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    var wasLocked = layer.locked;
    if (wasLocked) layer.locked = false;

    // ... modify layer ...

    if (wasLocked) layer.locked = true;
}
```

- **MUST** verify the active item is a `CompItem` before operating on layers:

```jsx
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    writeResult({ error: "No active composition" });
    return;
}
```

- **MUST** use 1-based indexing for AE collections (`comp.layer(1)`, `app.project.item(1)`) and 0-based indexing for JavaScript arrays (`comp.selectedLayers[0]`).

- **MUST** balance every `app.beginSuppressDialogs()` with a matching `app.endSuppressDialogs()`. Place the end call in a `finally` block so it runs even on error.

- **MUST** check `instanceof` or `matchName` before accessing type-specific properties. Accessing `layer.nullLayer` on a `CameraLayer` or `LightLayer` will throw because those properties only exist on `AVLayer`.

---

## FORBIDDEN

- **FORBIDDEN:** Using `Array.prototype.forEach`, `.map`, `.filter`, or `.reduce`. These do not exist in ES3. Use `for` loops for all iteration.

```jsx
// WRONG -- runtime error: forEach is not a function
comp.selectedLayers.forEach(function(layer) { layer.enabled = false; });

// CORRECT
var sel = comp.selectedLayers;
for (var i = 0; i < sel.length; i++) {
    sel[i].enabled = false;
}
```

- **FORBIDDEN:** Forward iteration when deleting. Indices shift downward after each removal, causing layers to be skipped.

```jsx
// WRONG -- layers get skipped
for (var i = 1; i <= comp.numLayers; i++) {
    comp.layer(i).remove();
}

// CORRECT -- reverse iteration
for (var i = comp.numLayers; i >= 1; i--) {
    comp.layer(i).remove();
}
```

- **FORBIDDEN:** Using `let`, `const`, arrow functions, template literals, destructuring, or any ES5+ syntax. All code must be ES3.

- **FORBIDDEN:** Using `alert()` in batch scripts. A single `alert()` inside a loop over hundreds of layers will create hundreds of modal dialogs.

- **FORBIDDEN:** Calling `app.beginSuppressDialogs()` without a matching `app.endSuppressDialogs()`. Unbalanced calls leave AE in a broken state where all dialogs are permanently suppressed until restart.

---

## Gotchas

- **Reverse iteration on delete.** When removing layers in a loop, you MUST iterate from `comp.numLayers` down to `1`. Forward iteration causes index shifting: after removing layer 3, the old layer 4 becomes the new layer 3 and gets skipped on the next iteration.

```jsx
// Removing layers 3, 4, 5 in a forward loop:
// Remove layer 3 -> old layer 4 is now layer 3 -> i++ goes to 4 -> old layer 5 (now 4) is skipped

// CORRECT: reverse iteration avoids this entirely
for (var i = comp.numLayers; i >= 1; i--) {
    if (shouldRemove(comp.layer(i))) {
        comp.layer(i).remove();
    }
}
```

- **Index shifting during modification.** Any operation that changes a layer's index (moving, adding, duplicating, or deleting layers) invalidates cached indices for layers below the change point. If you must move or reorder layers inside a loop, either iterate in reverse or collect target layers by reference first, then operate on the collected references.

```jsx
// Safe: collect references first, then operate
var targets = [];
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.name.indexOf("move_") === 0) {
        targets.push(layer);
    }
}
for (var i = 0; i < targets.length; i++) {
    targets[i].moveToEnd();
}
```

- **`beginSuppressDialogs` must be balanced.** Every `app.beginSuppressDialogs()` call must have a matching `app.endSuppressDialogs()`. If the script errors out between the two calls, dialogs remain suppressed for the rest of the AE session. Always use `try/finally`:

```jsx
app.beginSuppressDialogs();
try {
    // operations
} finally {
    app.endSuppressDialogs(false);
}
```

- **`selectedLayers` is a snapshot.** `comp.selectedLayers` returns an array at the moment it is called. If you change selection during the loop (e.g., by selecting/deselecting layers), the array does not update. Always capture it to a variable before iterating.

```jsx
var sel = comp.selectedLayers; // capture once
for (var i = 0; i < sel.length; i++) {
    // sel[i] is still valid even if selection changes during iteration
}
```

- **Regex is unreliable in ExtendScript.** Some regex features behave inconsistently or differently than in modern JavaScript. For batch name matching, prefer explicit string methods (`indexOf`, `substring`, `toLowerCase`) over regex.

- **Cross-comp iteration can be slow.** Iterating all layers in all comps in a large project can take significant time. Use `app.beginSuppressDialogs()` and consider adding a progress check or limiting the scope (e.g., filtering comps by name or folder).

- **`addProperty` on effects returns null if the matchName is wrong.** Double-check the effect matchName. There is no error thrown -- you get `null` back silently, and subsequent `.property()` calls on it will throw.

- **Locked layers in batch loops.** A single locked layer in the middle of a batch operation will throw an error and abort the entire script if not handled. Always check `layer.locked` before writing, or wrap individual layer operations in `try/catch`.

---

## Complete Example 1: Rename All Layers Matching a Pattern

Rename every layer whose name starts with `"Layer "` (the AE default) to a descriptive name with a zero-padded number.

```jsx
(function() {
    app.beginUndoGroup("AE Assistant: batch rename layers");
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var prefix = "Layer ";
        var newPrefix = "Element";
        var renamed = 0;

        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer.name.indexOf(prefix) === 0) {
                // Zero-pad the number to 3 digits
                var num = String(renamed + 1);
                while (num.length < 3) {
                    num = "0" + num;
                }
                layer.name = newPrefix + "_" + num;
                renamed++;
            }
        }

        writeResult({
            success: true,
            message: "Renamed " + renamed + " layers"
        });
    } catch (e) {
        writeResult({ error: e.toString(), line: e.line });
    } finally {
        app.endUndoGroup();
    }
})();
```

---

## Complete Example 2: Apply an Effect to All Selected Layers

Add a Gaussian Blur effect to every selected layer, setting Blurriness to 20 and the Repeat Edge Pixels option to on.

```jsx
(function() {
    app.beginUndoGroup("AE Assistant: batch apply Gaussian Blur");
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

        var applied = 0;
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];

            // Skip cameras and lights (they cannot have effects)
            if (layer instanceof CameraLayer || layer instanceof LightLayer) {
                continue;
            }

            var wasLocked = layer.locked;
            if (wasLocked) layer.locked = false;

            var effects = layer.property("ADBE Effect Parade");
            var blur = effects.addProperty("ADBE Gaussian Blur 2");
            if (blur) {
                blur.property("ADBE Gaussian Blur 2-0001").setValue(20); // Blurriness
                blur.property("ADBE Gaussian Blur 2-0002").setValue(1);  // Repeat Edge Pixels (on)
                applied++;
            }

            if (wasLocked) layer.locked = true;
        }

        writeResult({
            success: true,
            message: "Applied Gaussian Blur to " + applied + " layer" + (applied !== 1 ? "s" : "")
        });
    } catch (e) {
        writeResult({ error: e.toString(), line: e.line });
    } finally {
        app.endUndoGroup();
    }
})();
```

---

## Complete Example 3: Disable All Shape Layers in All Comps

Iterate every composition in the project and turn off visibility for every shape layer.

```jsx
(function() {
    app.beginUndoGroup("AE Assistant: disable all shape layers");
    app.beginSuppressDialogs();
    try {
        var disabledCount = 0;
        var compsProcessed = 0;

        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (!(item instanceof CompItem)) {
                continue;
            }

            var comp = item;
            compsProcessed++;

            for (var j = 1; j <= comp.numLayers; j++) {
                var layer = comp.layer(j);
                if (layer instanceof ShapeLayer) {
                    var wasLocked = layer.locked;
                    if (wasLocked) layer.locked = false;

                    layer.enabled = false;
                    disabledCount++;

                    if (wasLocked) layer.locked = true;
                }
            }
        }

        writeResult({
            success: true,
            message: "Disabled " + disabledCount + " shape layer" + (disabledCount !== 1 ? "s" : "") +
                     " across " + compsProcessed + " composition" + (compsProcessed !== 1 ? "s" : "")
        });
    } catch (e) {
        writeResult({ error: e.toString(), line: e.line });
    } finally {
        app.endSuppressDialogs(false);
        app.endUndoGroup();
    }
})();
```
