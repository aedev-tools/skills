# Expressions

> **Loaded when:** the task involves expressions, expression controls, linking properties, wiggle, loopOut, loopIn, or dynamically driven values.

All code in this file is ES3-compatible ExtendScript. See `extendscript-fundamentals.md` for baseline syntax rules.

---

## Expression Language vs ExtendScript

Expressions and ExtendScript are **two separate runtimes**.

| | Expressions | ExtendScript |
|---|---|---|
| **Where they run** | Inside AE's expression engine, evaluated per-frame on a property | Inside AE's scripting engine, executed once as a script |
| **Language** | JavaScript-like (AE's own dialect, modern-ish) | ECMAScript 3 (ES3) |
| **Purpose** | Dynamically compute a property value each frame | Automate project-level tasks (create layers, set keyframes, etc.) |
| **Access to** | `thisComp`, `thisLayer`, `thisProperty`, `time`, `value` | `app`, `app.project`, `CompItem`, `Layer`, `Property` |

When you set an expression via ExtendScript, the expression text is **just a string**. ExtendScript does not parse or evaluate it. AE's expression engine evaluates it later at render time.

```jsx
// This ExtendScript line assigns a string to the expression property.
// The string "wiggle(3, 50)" is NOT executed in ExtendScript.
// AE's expression engine will evaluate it per-frame.
prop.expression = "wiggle(3, 50)";
```

---

## Setting an Expression

```jsx
var prop = layer.property("ADBE Transform Group").property("ADBE Position");

// Assign a simple expression
prop.expression = "time * 100";

// Assign a multi-line expression (use \n for newlines)
prop.expression = "var freq = 3;\nvar amp = 50;\nwiggle(freq, amp);";
```

---

## Enabling and Disabling an Expression

```jsx
// Enable the expression (AE evaluates it each frame)
prop.expressionEnabled = true;

// Disable the expression (AE ignores it, uses keyframed/static value)
prop.expressionEnabled = false;
```

Setting `prop.expression` to a non-empty string automatically enables the expression. Setting it to `""` clears and disables it.

---

## Reading an Expression

```jsx
// Returns the expression string, or "" if no expression is set
var exprText = prop.expression;

// Check whether an expression is present
if (prop.expression !== "") {
    // This property has an expression
}

// Check whether the expression is currently active
var isActive = prop.expressionEnabled;
```

---

## Checking for Expression Errors

```jsx
// Returns the error message string, or "" if no error
var err = prop.expressionError;

if (err !== "") {
    // Expression has an error — err contains the message
    $.writeln("Expression error on " + prop.name + ": " + err);
}
```

---

## Common Expression Patterns

These are **expression-language strings** that you assign to `prop.expression` from ExtendScript. They are not ExtendScript code.

### wiggle(freq, amp)

Generates random oscillation around the property's current value.

```jsx
// 3 wiggles per second, 50 pixels of amplitude
prop.expression = "wiggle(3, 50)";

// Wiggle only on X axis (for 2D/3D properties)
prop.expression = "var w = wiggle(3, 50);\n[w[0], value[1]];";
```

### loopOut(type) and loopIn(type)

Repeats keyframed animation beyond the last or before the first keyframe.

```jsx
// Cycle: repeats the keyframed pattern endlessly after the last keyframe
prop.expression = 'loopOut("cycle")';

// Ping-pong: plays forward, then backward, then forward, etc.
prop.expression = 'loopOut("pingpong")';

// Continue: extrapolates the last velocity forever
prop.expression = 'loopOut("continue")';

// Offset: repeats the pattern, but each cycle builds on the end value
prop.expression = 'loopOut("offset")';

// Loop before the first keyframe
prop.expression = 'loopIn("cycle")';

// Combine both directions
prop.expression = 'loopIn("cycle") + loopOut("cycle") - value';
```

### valueAtTime(t)

Reads the property's own value at an arbitrary time.

```jsx
// Time delay: read this property's value 0.5 seconds in the past
prop.expression = "valueAtTime(time - 0.5)";
```

### linear(t, tMin, tMax, valMin, valMax)

Linearly maps a value from one range to another.

```jsx
// Map time 0-2s to opacity 0-100
prop.expression = "linear(time, 0, 2, 0, 100)";

// Map a slider control (0-100) to scale (50-150)
prop.expression = 'var s = effect("Slider Control")("Slider");\nlinear(s, 0, 100, 50, 150);';
```

### ease(t, tMin, tMax, valMin, valMax)

Same as `linear()` but with smooth (eased) acceleration and deceleration at both ends.

```jsx
// Smooth ramp from 0 to 100 opacity over the first 2 seconds
prop.expression = "ease(time, 0, 2, 0, 100)";
```

Related functions: `easeIn()` (smooth start, linear end), `easeOut()` (linear start, smooth end).

### clamp(val, min, max)

Constrains a value to a range.

```jsx
// Keep opacity between 20 and 80 even if driven by another expression
prop.expression = "clamp(value, 20, 80)";

// Clamp wiggle so it never goes negative
prop.expression = "clamp(wiggle(2, 100), 0, 100)";
```

---

## Linking Properties Across Layers

Expression strings can reference other layers and properties using `thisComp.layer()`.

### Link to Another Layer's Transform

```jsx
// Follow another layer's position
prop.expression = 'thisComp.layer("Controller").transform.position';

// Follow another layer's rotation
prop.expression = 'thisComp.layer("Controller").transform.rotation';

// Follow another layer's opacity
prop.expression = 'thisComp.layer("Controller").transform.opacity';
```

### Link to an Effect Parameter

```jsx
// Read a slider value from another layer's effect
prop.expression = 'thisComp.layer("Controller").effect("Slider Control")("Slider")';

// Read from an effect on the same layer
prop.expression = 'effect("Slider Control")("Slider")';
```

### Link with an Offset

```jsx
// Follow another layer's position but offset by [100, 0]
prop.expression = 'thisComp.layer("Controller").transform.position + [100, 0]';

// Follow with a time delay
prop.expression = 'thisComp.layer("Controller").transform.position.valueAtTime(time - 0.1)';
```

---

## Expression Controls

Expression controls are effects that expose simple UI controls (sliders, checkboxes, colors, etc.) which expressions can reference. They hold no visual effect on their own; they exist purely as data sources for expressions.

### Adding Expression Controls via ExtendScript

```jsx
var effects = layer.property("ADBE Effect Parade");

// Slider Control — single float value
var slider = effects.addProperty("ADBE Slider Control");
slider.name = "Speed";
slider.property("ADBE Slider Control-0001").setValue(50);

// Checkbox Control — 0 or 1
var checkbox = effects.addProperty("ADBE Checkbox Control");
checkbox.name = "Enabled";
checkbox.property("ADBE Checkbox Control-0001").setValue(1);

// Color Control — [r, g, b, a] in 0-1 range
var colorCtrl = effects.addProperty("ADBE Color Control");
colorCtrl.name = "Tint Color";
colorCtrl.property("ADBE Color Control-0001").setValue([1, 0, 0, 1]);

// Point Control — [x, y] in pixels
var pointCtrl = effects.addProperty("ADBE Point Control");
pointCtrl.name = "Target Point";
pointCtrl.property("ADBE Point Control-0001").setValue([960, 540]);

// Layer Control — index of the target layer (integer)
var layerCtrl = effects.addProperty("ADBE Layer Control");
layerCtrl.name = "Reference Layer";
layerCtrl.property("ADBE Layer Control-0001").setValue(2); // layer index

// Dropdown Menu Control
var dropdown = effects.addProperty("ADBE Dropdown Control");
dropdown.name = "Mode";
// Dropdown items must be set via the property's setPropertyParameters method (AE 2020+)
// The value is the 1-based index of the selected item
dropdown.property("ADBE Dropdown Control-0001").setValue(1);
```

### Referencing Expression Controls in Expressions

```jsx
// Reference a slider on the same layer
prop.expression = 'effect("Speed")("Slider")';

// Reference a checkbox on the same layer
prop.expression = 'effect("Enabled")("Checkbox")';

// Reference a color control on the same layer
prop.expression = 'effect("Tint Color")("Color")';

// Reference a point control on the same layer
prop.expression = 'effect("Target Point")("Point")';

// Reference a layer control on the same layer
prop.expression = 'effect("Reference Layer")("Layer")';

// Reference a dropdown on the same layer
prop.expression = 'effect("Mode")("Menu")';

// Reference a control on a different layer
prop.expression = 'thisComp.layer("Controller").effect("Speed")("Slider")';
```

### Expression Control matchNames Reference

| Control Type | Effect matchName | Parameter matchName | Expression Reference |
|---|---|---|---|
| Slider Control | `ADBE Slider Control` | `ADBE Slider Control-0001` | `("Slider")` |
| Checkbox Control | `ADBE Checkbox Control` | `ADBE Checkbox Control-0001` | `("Checkbox")` |
| Color Control | `ADBE Color Control` | `ADBE Color Control-0001` | `("Color")` |
| Point Control | `ADBE Point Control` | `ADBE Point Control-0001` | `("Point")` |
| Layer Control | `ADBE Layer Control` | `ADBE Layer Control-0001` | `("Layer")` |
| Dropdown Menu Control | `ADBE Dropdown Control` | `ADBE Dropdown Control-0001` | `("Menu")` |

---

## Escaping Quotes in Expression Strings

When setting an expression from ExtendScript, the expression is a string literal. Quotes inside the expression must be escaped or alternated.

### Strategy 1: Alternate Quote Types

```jsx
// Expression uses double quotes, ExtendScript string uses single quotes
prop.expression = 'thisComp.layer("Controller").transform.position';

// Expression uses single quotes, ExtendScript string uses double quotes
prop.expression = "loopOut('cycle')";
```

### Strategy 2: Escape with Backslashes

```jsx
// Escape double quotes inside a double-quoted ExtendScript string
prop.expression = "thisComp.layer(\"Controller\").transform.position";

// Escape single quotes inside a single-quoted ExtendScript string
prop.expression = 'loopOut(\'cycle\')';
```

### Strategy 3: Build Strings with Concatenation

Use concatenation for complex expressions that mix variable data and quoted references.

```jsx
// Insert a layer name dynamically
var targetName = "Logo";
prop.expression = 'thisComp.layer("' + targetName + '").transform.position';

// Build a multi-line expression with a variable
var freq = 3;
var amp = 50;
prop.expression = "wiggle(" + freq + ", " + amp + ")";
```

---

## MUST

- **MUST** treat expression text as a plain string when working in ExtendScript. Do not attempt to call expression functions (`wiggle`, `loopOut`, etc.) directly in ExtendScript -- they do not exist there.
- **MUST** check `prop.expressionError` after setting an expression if you need to verify it compiled successfully. Expression errors are silent in ExtendScript.
- **MUST** use `prop.expressionEnabled = true` if you need to guarantee the expression is active. Setting `prop.expression` to a non-empty string enables it automatically, but re-enabling after a disable requires the explicit flag.
- **MUST** escape or alternate quotes when embedding quoted strings (layer names, effect names, loop types) inside an expression assigned from ExtendScript.
- **MUST** wrap expression-setting operations in `app.beginUndoGroup()` / `app.endUndoGroup()` so the user can undo them.
- **MUST** verify the property supports expressions before setting one. Not all properties are expressionable. Check with `prop.canSetExpression` (returns `true` if the property supports expressions).

---

## FORBIDDEN

- **FORBIDDEN:** Calling expression-engine functions (`wiggle()`, `loopOut()`, `thisComp`, `time`, `value`, etc.) directly in ExtendScript. These exist only inside AE's expression engine. In ExtendScript, they are undefined and will throw a `ReferenceError`.

```jsx
// WRONG — these are expression-engine globals, not ExtendScript globals
var w = wiggle(3, 50);       // ReferenceError
var t = time;                // ReferenceError
var v = thisComp.layer(1);   // ReferenceError

// CORRECT — pass them as a string to prop.expression
prop.expression = "wiggle(3, 50)";
```

- **FORBIDDEN:** Using `prop.setValue()` to try to set an expression. `setValue()` sets the property's static/keyframed value, not its expression. Use `prop.expression = "..."` to set an expression.

- **FORBIDDEN:** Assuming `prop.value` returns the pre-expression value. It returns the **post-expression** value (the final computed result). Use `prop.valueAtTime(t, true)` to get the pre-expression value.

- **FORBIDDEN:** Using template literals or ES6+ string syntax when building expression strings in ExtendScript. ExtendScript is ES3 -- use string concatenation with `+`.

```jsx
// WRONG — template literals do not exist in ES3
prop.expression = `wiggle(${freq}, ${amp})`;

// CORRECT
prop.expression = "wiggle(" + freq + ", " + amp + ")";
```

---

## Gotchas

- **Escape quotes properly when setting expressions from ExtendScript.** Expression strings often contain quoted layer names, effect names, or loop type arguments. Mismatched or unescaped quotes will produce a malformed string, and AE will report an expression error at render time. Always alternate quote types or escape inner quotes.

```jsx
// WRONG — unescaped double quotes inside double-quoted string
prop.expression = "thisComp.layer("Name").transform.position"; // syntax error

// CORRECT
prop.expression = 'thisComp.layer("Name").transform.position';
```

- **`prop.value` returns the post-expression value; `prop.valueAtTime(t, true)` returns pre-expression.** If an expression is active, `prop.value` gives you the result after the expression runs. To read the underlying keyframed or static value (before the expression modifies it), pass `true` as the second argument to `valueAtTime()`.

```jsx
// Post-expression value (what you see in the comp viewer)
var rendered = prop.value;

// Pre-expression value at time t (the raw keyframed/static value)
var raw = prop.valueAtTime(comp.time, true);
```

- **Expression errors do not throw in ExtendScript.** Setting a syntactically invalid expression via `prop.expression = "..."` does not throw an error in your ExtendScript code. The expression is stored as-is, and AE only reports the error when it tries to evaluate the expression at render time. You must explicitly check `prop.expressionError` to detect problems.

```jsx
prop.expression = "this is not valid javascript";
// No error thrown here — ExtendScript continues normally

// You must check manually:
if (prop.expressionError !== "") {
    // "this is not valid javascript" produced an error
    $.writeln("Expression error: " + prop.expressionError);
}
```

- **`prop.expressionError` may not update immediately.** AE evaluates expressions lazily. After setting an expression, you may need to force an evaluation (e.g., by reading `prop.value` or calling `prop.valueAtTime()`) before `prop.expressionError` reflects the current state.

- **Multi-line expressions require `\n` or string concatenation.** ExtendScript string literals cannot span multiple lines. Use `\n` for newlines inside the expression string, or concatenate multiple lines.

```jsx
// Using \n
prop.expression = "var s = effect(\"Speed\")(\"Slider\");\nwiggle(s, 50)";

// Using concatenation
prop.expression = 'var s = effect("Speed")("Slider");\n'
    + 'wiggle(s, 50)';
```

- **Expression controls must exist before an expression can reference them.** If you set an expression that references `effect("Speed")("Slider")` but the Slider Control effect named "Speed" has not been added to the layer yet, the expression will error. Always add the expression control first, then set the expression.

- **Layer Control returns a layer object in expressions, not an index.** In the expression engine, `effect("Reference Layer")("Layer")` returns a layer object you can chain methods on (e.g., `.transform.position`). But when setting the Layer Control's value via ExtendScript, you set it to the layer's **index** (an integer).

```jsx
// ExtendScript: set the layer control to point at layer index 3
layerCtrl.property("ADBE Layer Control-0001").setValue(3);

// Expression: use the layer control to get a position
prop.expression = 'effect("Reference Layer")("Layer").transform.position';
```

- **Dropdown Menu Control value is 1-based.** The first item in a dropdown is index 1, not 0. Setting it to 0 will produce an error.

---

## Complete Example: Add a Wiggle Expression to Position via ExtendScript

```jsx
app.beginUndoGroup("AE Assistant: Add wiggle expression to position");
try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return;
    }

    var layer = comp.selectedLayers[0];
    if (!layer) {
        writeResult({ error: "No layer selected" });
        return;
    }

    // Unlock if needed
    var wasLocked = layer.locked;
    if (wasLocked) {
        layer.locked = false;
    }

    // Add a Slider Control for frequency
    var effects = layer.property("ADBE Effect Parade");
    var freqSlider = effects.addProperty("ADBE Slider Control");
    freqSlider.name = "Wiggle Frequency";
    freqSlider.property("ADBE Slider Control-0001").setValue(3);

    // Add a Slider Control for amplitude
    var ampSlider = effects.addProperty("ADBE Slider Control");
    ampSlider.name = "Wiggle Amplitude";
    ampSlider.property("ADBE Slider Control-0001").setValue(50);

    // Get the position property
    var pos = layer.property("ADBE Transform Group").property("ADBE Position");

    // Verify the property supports expressions
    if (!pos.canSetExpression) {
        writeResult({ error: "Position property does not support expressions" });
        return;
    }

    // Build the expression string
    // The expression reads from the two slider controls on the same layer
    var expr = 'var freq = effect("Wiggle Frequency")("Slider");\n'
        + 'var amp = effect("Wiggle Amplitude")("Slider");\n'
        + 'wiggle(freq, amp);';

    // Set the expression (this also enables it automatically)
    pos.expression = expr;

    // Verify no expression error
    // Force evaluation by reading the value
    var testVal = pos.valueAtTime(0, false);
    var exprErr = pos.expressionError;

    if (exprErr !== "") {
        writeResult({
            error: "Expression error: " + exprErr,
            expression: expr
        });
        return;
    }

    // Re-lock if it was locked before
    if (wasLocked) {
        layer.locked = true;
    }

    writeResult({
        success: true,
        message: "Added wiggle expression to " + layer.name + " position",
        expression: expr,
        controls: ["Wiggle Frequency", "Wiggle Amplitude"]
    });
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```
