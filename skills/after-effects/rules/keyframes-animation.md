# Keyframes & Animation

> **Loaded when:** the task involves keyframes, animation, easing, interpolation, or temporal/spatial curves.

All code in this file is ES3-compatible ExtendScript. See `extendscript-fundamentals.md` for baseline syntax rules.

---

## Property Value Types Quick Reference

| Property | Type | Example Value | Notes |
|---|---|---|---|
| Position (2D) | Array | `[960, 540]` | Pixels from top-left |
| Position (3D) | Array | `[960, 540, 0]` | Z = depth |
| Scale | Array | `[100, 100]` or `[100, 100, 100]` | Percentages, not decimals |
| Rotation (Z) | Number | `45` | Degrees, single float |
| Rotation X/Y | Number | `0` | Only on 3D layers |
| Orientation | Array | `[0, 0, 0]` | 3D only, degrees |
| Opacity | Number | `50` | Range 0-100 |
| Color | Array | `[1, 0, 0, 1]` | RGBA, each 0.0-1.0 |
| Anchor Point | Array | `[0, 0]` or `[0, 0, 0]` | Pixels |

---

## Reading Keyframes

```jsx
var prop = layer.property("ADBE Transform Group").property("ADBE Position");

// Check whether the property is keyframed
var numKeys = prop.numKeys; // 0 means no keyframes (static value)

// Iterate all keyframes (1-based index)
for (var k = 1; k <= prop.numKeys; k++) {
    var time  = prop.keyTime(k);   // seconds as float
    var value = prop.keyValue(k);  // value at that keyframe
}

// Current value (at CTI for keyframed props, static value otherwise)
var currentValue = prop.value;

// Value at an arbitrary time
// Second arg: false = post-expression value, true = pre-expression value
var valAtTime = prop.valueAtTime(2.5, false);
```

### Nearest Keyframe

```jsx
// Returns the 1-based index of the keyframe closest to the given time
var idx = prop.nearestKeyIndex(1.5);
var nearestTime = prop.keyTime(idx);
```

---

## Setting Static (Non-Keyframed) Values

Use `setValue()` to assign a value without creating keyframes.

```jsx
layer.property("ADBE Transform Group").property("ADBE Opacity").setValue(50);
layer.property("ADBE Transform Group").property("ADBE Position").setValue([960, 540, 0]);
layer.property("ADBE Transform Group").property("ADBE Scale").setValue([100, 100, 100]);
layer.property("ADBE Transform Group").property("ADBE Rotate Z").setValue(45);
```

Convenience shortcuts when the property object is already resolved:

```jsx
var xf = layer.property("ADBE Transform Group");
xf.property("ADBE Opacity").setValue(50);
xf.property("ADBE Position").setValue([960, 540]);
xf.property("ADBE Scale").setValue([100, 100]);
```

---

## Setting Values at Times (Creates Keyframes)

```jsx
var prop = layer.property("ADBE Transform Group").property("ADBE Position");

// Each call creates (or updates) a keyframe at that time
prop.setValueAtTime(0, [960, 540]);
prop.setValueAtTime(2.5, [100, 100]);
```

---

## Batch Setting Keyframes

Set multiple keyframes in a single call. The two arrays must be the same length.

```jsx
var times  = [0, 1, 2, 3];
var values = [[0, 0], [100, 0], [100, 100], [0, 100]];
prop.setValuesAtTimes(times, values);
```

---

## Adding and Removing Keyframes

### Adding a Keyframe

```jsx
// addKey returns the 1-based index of the new keyframe
var keyIndex = prop.addKey(1.5);

// Then set its value
prop.setValueAtKey(keyIndex, [100, 200]);
```

### Removing Keyframes

```jsx
// MUST remove from highest index to lowest to avoid index shifting
for (var k = prop.numKeys; k >= 1; k--) {
    prop.removeKey(k);
}
```

### Removing a Single Keyframe by Time

```jsx
var idx = prop.nearestKeyIndex(1.5);
// Verify it is actually at the expected time before removing
if (Math.abs(prop.keyTime(idx) - 1.5) < 0.001) {
    prop.removeKey(idx);
}
```

---

## Interpolation Types

Three built-in types:

| Constant | Behaviour |
|---|---|
| `KeyframeInterpolationType.LINEAR` | Straight-line interpolation |
| `KeyframeInterpolationType.BEZIER` | Smooth curve (default for most props) |
| `KeyframeInterpolationType.HOLD`   | Value jumps instantly at next keyframe |

### Setting Interpolation

```jsx
prop.setInterpolationTypeAtKey(keyIndex,
    KeyframeInterpolationType.BEZIER,  // in-type
    KeyframeInterpolationType.BEZIER   // out-type
);
```

### Reading Interpolation

```jsx
var inType  = prop.keyInInterpolationType(keyIndex);
var outType = prop.keyOutInterpolationType(keyIndex);
```

---

## Temporal Ease

Temporal ease controls the speed curve between keyframes.

### KeyframeEase Constructor

```jsx
// new KeyframeEase(speed, influence)
//   speed     : velocity at the keyframe (0 = at rest)
//   influence : 0-100, how much the curve is affected (higher = more extreme)
var ease = new KeyframeEase(0, 33.33);
```

### Applying Temporal Ease

The number of `KeyframeEase` objects in each array MUST match the property dimensions:
- 1D property (Rotation, Opacity): arrays of 1
- 2D property (Position 2D, Scale 2D): arrays of 2
- 3D property (Position 3D, Scale 3D): arrays of 3

```jsx
// Example: 2D position — two KeyframeEase objects per array
var easeIn  = new KeyframeEase(0, 33.33);
var easeOut = new KeyframeEase(0, 33.33);

prop.setTemporalEaseAtKey(keyIndex,
    [easeIn, easeIn],    // inEase  (one per dimension)
    [easeOut, easeOut]    // outEase (one per dimension)
);
```

```jsx
// Example: 1D property (Opacity) — one KeyframeEase per array
var opacityProp = layer.property("ADBE Transform Group").property("ADBE Opacity");
var easeIn1D  = new KeyframeEase(0, 33.33);
var easeOut1D = new KeyframeEase(0, 33.33);
opacityProp.setTemporalEaseAtKey(keyIndex, [easeIn1D], [easeOut1D]);
```

```jsx
// Example: 3D position — three KeyframeEase objects per array
var ease3D = new KeyframeEase(0, 33.33);
prop.setTemporalEaseAtKey(keyIndex,
    [ease3D, ease3D, ease3D],
    [ease3D, ease3D, ease3D]
);
```

### Reading Temporal Ease

```jsx
var easeInArr  = prop.keyInTemporalEase(keyIndex);   // array of KeyframeEase
var easeOutArr = prop.keyOutTemporalEase(keyIndex);   // array of KeyframeEase

for (var i = 0; i < easeInArr.length; i++) {
    var speed     = easeInArr[i].speed;
    var influence = easeInArr[i].influence;
}
```

---

## Common Easing Presets

### Easy Ease (Smooth In and Out)

```jsx
var easeIn  = new KeyframeEase(0, 33.33);
var easeOut = new KeyframeEase(0, 33.33);
// Apply to a 2D property:
prop.setTemporalEaseAtKey(keyIndex, [easeIn, easeIn], [easeOut, easeOut]);
```

### Ease In Only (Slow Arrival / Decelerate)

```jsx
var easeIn  = new KeyframeEase(0, 75);
var easeOut = new KeyframeEase(0, 33.33);
prop.setTemporalEaseAtKey(keyIndex, [easeIn, easeIn], [easeOut, easeOut]);
```

### Ease Out Only (Slow Departure / Accelerate)

```jsx
var easeIn  = new KeyframeEase(0, 33.33);
var easeOut = new KeyframeEase(0, 75);
prop.setTemporalEaseAtKey(keyIndex, [easeIn, easeIn], [easeOut, easeOut]);
```

### Strong / Aggressive Ease

```jsx
var easeIn  = new KeyframeEase(0, 85);
var easeOut = new KeyframeEase(0, 85);
prop.setTemporalEaseAtKey(keyIndex, [easeIn, easeIn], [easeOut, easeOut]);
```

### Helper Function: Apply Easy Ease to All Keyframes

```jsx
function easyEaseAll(prop) {
    for (var k = 1; k <= prop.numKeys; k++) {
        var dims = prop.value instanceof Array ? prop.value.length : 1;
        var eIn  = [];
        var eOut = [];
        for (var d = 0; d < dims; d++) {
            eIn.push(new KeyframeEase(0, 33.33));
            eOut.push(new KeyframeEase(0, 33.33));
        }
        prop.setInterpolationTypeAtKey(k,
            KeyframeInterpolationType.BEZIER,
            KeyframeInterpolationType.BEZIER
        );
        prop.setTemporalEaseAtKey(k, eIn, eOut);
    }
}
```

---

## Spatial Tangents (Position-Like Properties Only)

Spatial tangents control the motion path shape in the Comp viewer. They apply only to spatial properties such as Position.

### Setting Spatial Tangents

```jsx
// inTangent and outTangent are offset vectors relative to the keyframe value
prop.setSpatialTangentsAtKey(keyIndex,
    [0, 0, 0],      // inTangent  — direction arriving at keyframe
    [100, 0, 0]     // outTangent — direction leaving keyframe
);
```

### Linear Spatial Motion (Straight Path)

```jsx
// Zero tangents = straight lines between keyframes
prop.setSpatialTangentsAtKey(keyIndex, [0, 0, 0], [0, 0, 0]);
```

### Auto Bezier and Continuous Spatial

```jsx
// Auto Bezier: AE calculates smooth tangents automatically
prop.setSpatialAutoBezierAtKey(keyIndex, true);

// Continuous: in and out tangents are locked together (smooth through point)
prop.setSpatialContinuousAtKey(keyIndex, true);
```

---

## Roving Keyframes

Roving keyframes let AE automatically adjust timing so that the speed along the motion path is smooth.

```jsx
prop.setRovingAtKey(keyIndex, true);
```

### Reading Roving State

```jsx
var isRoving = prop.keyRoving(keyIndex);
```

---

## Separated Dimensions

When Position dimensions are separated, you cannot access the unified Position property. Instead, access each axis independently.

### Check and Access

```jsx
var posProp = layer.property("ADBE Transform Group").property("ADBE Position");

if (posProp.dimensionsSeparated) {
    var xPos = layer.property("ADBE Transform Group").property("ADBE Position_0");
    var yPos = layer.property("ADBE Transform Group").property("ADBE Position_1");
    // For 3D layers:
    // var zPos = layer.property("ADBE Transform Group").property("ADBE Position_2");

    xPos.setValueAtTime(0, 0);
    xPos.setValueAtTime(1, 960);
    yPos.setValueAtTime(0, 0);
    yPos.setValueAtTime(1, 540);
} else {
    posProp.setValueAtTime(0, [0, 0]);
    posProp.setValueAtTime(1, [960, 540]);
}
```

### Enabling/Disabling Separation

```jsx
posProp.dimensionsSeparated = true;   // separate
posProp.dimensionsSeparated = false;  // reunify
```

---

## Complete Example: Animate a Layer Sliding In with Ease

```jsx
app.beginUndoGroup("AE Assistant: Slide in from left");
try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) throw new Error("No active comp");

    var layer = comp.selectedLayers[0];
    if (!layer) throw new Error("No layer selected");

    var pos = layer.property("ADBE Transform Group").property("ADBE Position");
    var opa = layer.property("ADBE Transform Group").property("ADBE Opacity");

    // Position: offscreen left -> center
    var startTime = comp.time;
    var endTime   = startTime + 1.0;
    pos.setValueAtTime(startTime, [-200, comp.height / 2]);
    pos.setValueAtTime(endTime, [comp.width / 2, comp.height / 2]);

    // Opacity: 0 -> 100
    opa.setValueAtTime(startTime, 0);
    opa.setValueAtTime(endTime, 100);

    // Apply ease out on first keyframe, ease in on second
    // Position (2D = 2 ease objects)
    var posKey1 = pos.nearestKeyIndex(startTime);
    var posKey2 = pos.nearestKeyIndex(endTime);
    pos.setTemporalEaseAtKey(posKey1,
        [new KeyframeEase(0, 33.33), new KeyframeEase(0, 33.33)],
        [new KeyframeEase(0, 75), new KeyframeEase(0, 75)]
    );
    pos.setTemporalEaseAtKey(posKey2,
        [new KeyframeEase(0, 75), new KeyframeEase(0, 75)],
        [new KeyframeEase(0, 33.33), new KeyframeEase(0, 33.33)]
    );

    // Opacity (1D = 1 ease object)
    var opaKey1 = opa.nearestKeyIndex(startTime);
    var opaKey2 = opa.nearestKeyIndex(endTime);
    opa.setTemporalEaseAtKey(opaKey1,
        [new KeyframeEase(0, 33.33)],
        [new KeyframeEase(0, 75)]
    );
    opa.setTemporalEaseAtKey(opaKey2,
        [new KeyframeEase(0, 75)],
        [new KeyframeEase(0, 33.33)]
    );

    // Make position path linear (straight line, no curve)
    pos.setSpatialTangentsAtKey(posKey1, [0, 0, 0], [0, 0, 0]);
    pos.setSpatialTangentsAtKey(posKey2, [0, 0, 0], [0, 0, 0]);

} catch (e) {
    alert("Error: " + e.toString());
} finally {
    app.endUndoGroup();
}
```

---

## Complete Example: Copy Keyframes Between Properties

```jsx
function copyKeyframes(srcProp, dstProp) {
    // Remove existing keyframes on destination (highest to lowest)
    for (var k = dstProp.numKeys; k >= 1; k--) {
        dstProp.removeKey(k);
    }

    // Copy from source
    if (srcProp.numKeys === 0) {
        // Static value — just copy the value
        dstProp.setValue(srcProp.value);
    } else {
        for (var i = 1; i <= srcProp.numKeys; i++) {
            var time  = srcProp.keyTime(i);
            var value = srcProp.keyValue(i);
            dstProp.setValueAtTime(time, value);

            var newIdx = dstProp.nearestKeyIndex(time);

            // Copy interpolation type
            dstProp.setInterpolationTypeAtKey(newIdx,
                srcProp.keyInInterpolationType(i),
                srcProp.keyOutInterpolationType(i)
            );

            // Copy temporal ease
            try {
                dstProp.setTemporalEaseAtKey(newIdx,
                    srcProp.keyInTemporalEase(i),
                    srcProp.keyOutTemporalEase(i)
                );
            } catch (e) { /* may fail for non-temporal properties */ }
        }
    }
}
```

---

## MUST

- **MUST** remove keyframes from highest index to lowest to avoid index shifting during removal.
- **MUST** match the number of `KeyframeEase` objects to the property dimensions (1 for 1D, 2 for 2D, 3 for 3D).
- **MUST** check `prop.numKeys` before accessing keyframe data via `keyTime()` or `keyValue()`.
- **MUST** use `setValueAtTime()` to add or modify keyframes on an already-keyframed property.
- **MUST** set interpolation type to `BEZIER` before applying temporal ease (ease has no effect on `LINEAR` or `HOLD` keyframes).
- **MUST** use 1-based indexing for all keyframe access (`keyTime(1)` is the first keyframe).
- **MUST** wrap keyframe operations in `app.beginUndoGroup()` / `app.endUndoGroup()`.

---

## FORBIDDEN

- **FORBIDDEN:** Using `setValue()` on a keyframed property -- this silently removes all keyframes and sets a static value. Use `setValueAtTime()` instead.
- **FORBIDDEN:** Setting roving on the first or last keyframe -- only interior keyframes can rove. AE will throw an error.
- **FORBIDDEN:** Removing keyframes in ascending index order within a loop -- indices shift downward after each removal, causing skipped or out-of-range keyframes.
- **FORBIDDEN:** Passing a single `KeyframeEase` object instead of an array to `setTemporalEaseAtKey()` -- it always requires arrays, even for 1D properties.
- **FORBIDDEN:** Using `setSpatialTangentsAtKey()` on non-spatial properties (e.g., Opacity, Rotation) -- it will throw an error.

---

## Gotchas

- `setTemporalEaseAtKey()` requires arrays of `KeyframeEase` matching the property dimensions (2 for 2D Position, 3 for 3D Position, 1 for Opacity or Rotation). Mismatched array length causes a runtime error.
- `prop.value` on a keyframed property returns the value at the **current time indicator**, not any specific keyframe. Use `prop.keyValue(k)` for a specific keyframe or `prop.valueAtTime(t, false)` for an arbitrary time.
- Keyframe indices are **1-based**. `keyTime(0)` will throw an error.
- `nearestKeyIndex(time)` returns the closest keyframe to the given time, not necessarily one at that exact time. Always verify with `keyTime()` if exact matching matters.
- `setValuesAtTimes()` does not return keyframe indices. If you need to set interpolation or ease on those keyframes, use `nearestKeyIndex()` after setting them.
- When dimensions are separated (`dimensionsSeparated === true`), the unified Position property becomes read-only. You must access `ADBE Position_0`, `ADBE Position_1`, (and `ADBE Position_2` for 3D) individually.
- `addKey()` returns the index of the new keyframe, but that index may change if you later add keyframes before it in time. Always use the index immediately or re-query with `nearestKeyIndex()`.
- Spatial tangent values are **offsets relative to the keyframe position**, not absolute coordinates. `[100, 0, 0]` means 100 pixels to the right of the keyframe value.
- `prop.isSpatial` can be checked to determine whether a property supports spatial tangents before calling `setSpatialTangentsAtKey()`.
- The `speed` parameter of `KeyframeEase` is the velocity at the keyframe. For most ease-in/ease-out presets, speed is `0` (at rest). Non-zero speed values create motion at the keyframe boundary.
