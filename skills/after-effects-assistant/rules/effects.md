# Effects

> **Loaded when:** the task involves adding, removing, configuring, or querying effects on layers in After Effects via ExtendScript.

All code in this file is ES3-compatible ExtendScript. See `extendscript-fundamentals.md` for baseline syntax rules.

---

## Effect Parade (The Effects Container)

Every layer has a property group called "ADBE Effect Parade" that holds all of its effects. This is the entry point for all effect operations.

```jsx
var effects = layer.property("ADBE Effect Parade");
var effectCount = effects.numProperties; // number of effects on the layer
```

---

## Adding Effects

MUST use `addProperty()` with the effect's **matchName** to add an effect.

```jsx
var effects = layer.property("ADBE Effect Parade");
var blur = effects.addProperty("ADBE Gaussian Blur 2");
```

The returned object is a `PropertyGroup` representing the newly added effect. You can immediately configure its parameters.

```jsx
var fill = effects.addProperty("ADBE Fill");
fill.property("ADBE Fill-0002").setValue([1, 0, 0]); // Color -> red
fill.property("ADBE Fill-0007").setValue(1);          // Opacity -> 100%
```

---

## Removing Effects

```jsx
var effect = layer.property("ADBE Effect Parade").property(1);
effect.remove();
```

When removing multiple effects in a loop, MUST iterate in **reverse order** to avoid index shifting:

```jsx
var effects = layer.property("ADBE Effect Parade");
for (var i = effects.numProperties; i >= 1; i--) {
    effects.property(i).remove();
}
```

---

## Accessing Effect Parameters

Effect parameters can be accessed by **1-based index** or by **matchName**.

### By Index

```jsx
var effect = layer.property("ADBE Effect Parade").property(1);

// Access the first parameter of the effect (1-based)
var firstParam = effect.property(1);
```

### By matchName

```jsx
var blur = layer.property("ADBE Effect Parade").property("ADBE Gaussian Blur 2");

// Blurriness parameter
var blurriness = blur.property("ADBE Gaussian Blur 2-0001");
```

### Iterating All Parameters

```jsx
var effect = layer.property("ADBE Effect Parade").property(1);
for (var p = 1; p <= effect.numProperties; p++) {
    var param = effect.property(p);
    var paramName = param.name;
    var paramMatchName = param.matchName;
    // param.value may throw on non-valued properties; wrap in try/catch
    try {
        var val = param.value;
    } catch (e) {
        // parameter does not expose a value (e.g., group headers)
    }
}
```

---

## Setting Effect Parameter Values

Use `setValue()` on the specific parameter property.

```jsx
var blur = layer.property("ADBE Effect Parade").property("ADBE Gaussian Blur 2");

// Set Blurriness to 10
blur.property("ADBE Gaussian Blur 2-0001").setValue(10);

// Set Blur Dimensions to "Horizontal and Vertical" (value 1)
blur.property("ADBE Gaussian Blur 2-0002").setValue(1);

// Set Repeat Edge Pixels checkbox on (value 1)
blur.property("ADBE Gaussian Blur 2-0003").setValue(1);
```

---

## Keyframing Effect Parameters

Effect parameters support the same keyframe API as any other AE property.

```jsx
var blurriness = blur.property("ADBE Gaussian Blur 2-0001");

// Set keyframes
blurriness.setValueAtTime(0, 0);
blurriness.setValueAtTime(1, 25);
blurriness.setValueAtTime(2, 0);

// Apply ease to keyframes
for (var k = 1; k <= blurriness.numKeys; k++) {
    blurriness.setInterpolationTypeAtKey(k,
        KeyframeInterpolationType.BEZIER,
        KeyframeInterpolationType.BEZIER
    );
    blurriness.setTemporalEaseAtKey(k,
        [new KeyframeEase(0, 33.33)],
        [new KeyframeEase(0, 33.33)]
    );
}
```

---

## Reading Effect Parameters and Keyframes

```jsx
var effect = layer.property("ADBE Effect Parade").property(1);

for (var p = 1; p <= effect.numProperties; p++) {
    var param = effect.property(p);

    try {
        if (param.numKeys > 0) {
            // Parameter is keyframed
            for (var k = 1; k <= param.numKeys; k++) {
                var time = param.keyTime(k);
                var value = param.keyValue(k);
            }
        } else {
            // Static value
            var value = param.value;
        }
    } catch (e) {
        // Some parameters (group headers, unsupported types) throw on .value
    }
}
```

---

## Enabling and Disabling Effects

```jsx
var effect = layer.property("ADBE Effect Parade").property(1);

// Disable effect (equivalent to clicking the "fx" toggle in the UI)
effect.enabled = false;

// Enable effect
effect.enabled = true;

// Check current state
var isEnabled = effect.enabled;
```

---

## Finding Effects by Name or matchName

There is no built-in search method. MUST iterate and compare.

### Find by Display Name

```jsx
function findEffectByName(layer, effectName) {
    var effects = layer.property("ADBE Effect Parade");
    for (var i = 1; i <= effects.numProperties; i++) {
        if (effects.property(i).name === effectName) {
            return effects.property(i);
        }
    }
    return null;
}

var blur = findEffectByName(layer, "Gaussian Blur");
```

### Find by matchName

```jsx
function findEffectByMatchName(layer, matchName) {
    var effects = layer.property("ADBE Effect Parade");
    for (var i = 1; i <= effects.numProperties; i++) {
        if (effects.property(i).matchName === matchName) {
            return effects.property(i);
        }
    }
    return null;
}

var blur = findEffectByMatchName(layer, "ADBE Gaussian Blur 2");
```

### Find All Effects of a Given Type

```jsx
function findAllEffectsByMatchName(layer, matchName) {
    var results = [];
    var effects = layer.property("ADBE Effect Parade");
    for (var i = 1; i <= effects.numProperties; i++) {
        if (effects.property(i).matchName === matchName) {
            results.push(effects.property(i));
        }
    }
    return results;
}
```

---

## Common Effect matchNames

| Effect | matchName |
|---|---|
| Gaussian Blur | `ADBE Gaussian Blur 2` |
| Fill | `ADBE Fill` |
| Tint | `ADBE Tint` |
| Levels | `ADBE Levels2` |
| Curves | `ADBE CurvesCustom` |
| Hue/Saturation | `ADBE HUE SATURATION` |
| Drop Shadow | `ADBE Drop Shadow` |
| Glow | `ADBE Glo2` |
| CC Toner | `CS Toner` |
| Tritone | `ADBE Tritone` |
| Opacity | `ADBE Opacity` |

### Discovering matchNames at Runtime

When you do not know the matchName for an effect, add it manually in AE and then read it back:

```jsx
var effects = layer.property("ADBE Effect Parade");
for (var i = 1; i <= effects.numProperties; i++) {
    var fx = effects.property(i);
    $.writeln("Effect: " + fx.name + " | matchName: " + fx.matchName);

    // Also dump parameter matchNames
    for (var p = 1; p <= fx.numProperties; p++) {
        $.writeln("  Param " + p + ": " + fx.property(p).name + " | " + fx.property(p).matchName);
    }
}
```

---

## MUST

- **MUST** use `matchName` (not display name) when calling `addProperty()`. Display names are localized and will fail in non-English AE installations.

```jsx
// WRONG - display name, will fail in non-English AE
effects.addProperty("Gaussian Blur");

// CORRECT - matchName, works in all locales
effects.addProperty("ADBE Gaussian Blur 2");
```

- **MUST** access the effect parade via `layer.property("ADBE Effect Parade")` before adding or querying effects.

- **MUST** use 1-based indexing for effects and their parameters. The first effect is `property(1)`, the first parameter within an effect is `property(1)`.

- **MUST** remove effects in reverse index order when removing multiple effects in a loop:

```jsx
for (var i = effects.numProperties; i >= 1; i--) {
    effects.property(i).remove();
}
```

- **MUST** wrap all effect mutation operations in an undo group:

```jsx
app.beginUndoGroup("AE Assistant: apply effects");
try {
    // ... effect operations ...
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```

- **MUST** check that the layer exists and the comp is valid before manipulating effects:

```jsx
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    writeResult({ error: "No active composition" });
    return;
}
```

---

## FORBIDDEN

- **FORBIDDEN:** Passing a display name to `addProperty()`. It requires the internal matchName string. Display names are localized and unreliable.

```jsx
// FORBIDDEN
effects.addProperty("Gaussian Blur");
effects.addProperty("Fill");

// CORRECT
effects.addProperty("ADBE Gaussian Blur 2");
effects.addProperty("ADBE Fill");
```

- **FORBIDDEN:** Using `setValue()` on a keyframed effect parameter. This silently removes all keyframes and sets a static value. Use `setValueAtTime()` instead.

```jsx
// FORBIDDEN when blurriness already has keyframes
blurriness.setValue(10);

// CORRECT
blurriness.setValueAtTime(comp.time, 10);
```

- **FORBIDDEN:** Removing effects in forward index order within a loop. Indices shift downward after each removal, causing skipped effects or out-of-range errors.

- **FORBIDDEN:** Assuming an effect exists on a layer without checking first. Always verify before accessing:

```jsx
// FORBIDDEN
var blur = layer.property("ADBE Effect Parade").property("ADBE Gaussian Blur 2");
blur.property(1).setValue(10); // throws if blur is null

// CORRECT
var blur = layer.property("ADBE Effect Parade").property("ADBE Gaussian Blur 2");
if (blur) {
    blur.property("ADBE Gaussian Blur 2-0001").setValue(10);
}
```

- **FORBIDDEN:** Using ES5+ syntax (`let`, `const`, arrow functions, template literals, `forEach`, `map`, `filter`). All code must be ES3.

---

## Gotchas

- **`addProperty()` requires matchName, not display name.** The string you pass to `addProperty()` is the internal matchName (e.g., `"ADBE Gaussian Blur 2"`), not the name shown in the Effects menu (e.g., `"Gaussian Blur"`). Using the display name will throw an error or silently fail.

- **Effect parameter matchNames are effect-specific and not standardized across effects.** Each effect defines its own parameter matchNames. For Gaussian Blur, the blurriness parameter is `"ADBE Gaussian Blur 2-0001"`. For Fill, the color parameter is `"ADBE Fill-0002"`. There is no universal naming convention. Always discover parameter matchNames by inspecting the effect at runtime or consulting documentation.

- **Some effects have different matchNames across AE versions.** Adobe occasionally updates effect internals between major AE releases. An effect that works as `"ADBE Gaussian Blur"` in older versions uses `"ADBE Gaussian Blur 2"` in modern versions. Always test scripts against the target AE version. When writing portable scripts, wrap `addProperty()` in a try/catch and attempt fallback matchNames:

```jsx
var blur;
try {
    blur = effects.addProperty("ADBE Gaussian Blur 2");
} catch (e) {
    try {
        blur = effects.addProperty("ADBE Gaussian Blur");
    } catch (e2) {
        writeResult({ error: "Could not add Gaussian Blur effect" });
        return;
    }
}
```

- **`property()` by matchName returns `null` (not an error) when the effect is not present on the layer.** Always null-check the result before accessing sub-properties.

```jsx
var blur = effects.property("ADBE Gaussian Blur 2");
// blur is null if no Gaussian Blur is on the layer, NOT an error
if (blur === null) {
    // effect not found
}
```

- **Effect parameter `.value` can throw on some parameter types.** Group headers, dropdown menus with no value, and certain custom parameters do not support `.value`. Wrap in try/catch when iterating unknown parameters.

- **Duplicate effect names.** If a layer has multiple instances of the same effect (e.g., two Gaussian Blurs), `property("ADBE Gaussian Blur 2")` returns only the **first** match. Use index-based access or iterate to find all instances.

- **The `.name` property of an effect is the user-facing display name and can be renamed by the user.** After renaming, the original display name no longer matches. Use `.matchName` for reliable type identification:

```jsx
// User renamed "Gaussian Blur" to "My Blur"
effect.name;       // "My Blur"
effect.matchName;  // "ADBE Gaussian Blur 2" (always stable)
```

- **`effect.enabled` controls the effect toggle, not the layer visibility.** Setting `effect.enabled = false` is equivalent to clicking the effect's "fx" checkbox in the Timeline panel. The layer itself remains visible.

- **Effect order matters.** Effects are processed top-to-bottom (index 1 first). The order in which effects are added determines the visual result. There is no `moveProperty()` method to reorder effects after creation; you must remove and re-add them in the desired order.

---

## Complete Example: Add Gaussian Blur, Set Blurriness, Keyframe It

```jsx
app.beginUndoGroup("AE Assistant: Add and keyframe Gaussian Blur");
try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return;
    }

    // Get the first selected layer, or fall back to the top layer
    var layer = null;
    if (comp.selectedLayers.length > 0) {
        layer = comp.selectedLayers[0];
    } else if (comp.numLayers > 0) {
        layer = comp.layer(1);
    }
    if (!layer) {
        writeResult({ error: "No layers in composition" });
        return;
    }

    // Unlock the layer if locked
    var wasLocked = layer.locked;
    if (wasLocked) {
        layer.locked = false;
    }

    // Add Gaussian Blur effect
    var effects = layer.property("ADBE Effect Parade");
    var blur = effects.addProperty("ADBE Gaussian Blur 2");

    // Get the Blurriness parameter
    var blurriness = blur.property("ADBE Gaussian Blur 2-0001");

    // Keyframe Blurriness: 0 -> 25 -> 0 over 2 seconds
    var startTime = comp.time;
    blurriness.setValueAtTime(startTime, 0);
    blurriness.setValueAtTime(startTime + 1, 25);
    blurriness.setValueAtTime(startTime + 2, 0);

    // Apply easy ease to all keyframes
    for (var k = 1; k <= blurriness.numKeys; k++) {
        blurriness.setInterpolationTypeAtKey(k,
            KeyframeInterpolationType.BEZIER,
            KeyframeInterpolationType.BEZIER
        );
        blurriness.setTemporalEaseAtKey(k,
            [new KeyframeEase(0, 33.33)],
            [new KeyframeEase(0, 33.33)]
        );
    }

    // Re-lock layer if it was locked before
    if (wasLocked) {
        layer.locked = true;
    }

    writeResult({
        success: true,
        message: "Added Gaussian Blur to '" + layer.name + "' with keyframed blurriness (0 -> 25 -> 0 over 2s)",
        effectName: blur.name,
        effectMatchName: blur.matchName,
        keyframeCount: blurriness.numKeys
    });
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```
