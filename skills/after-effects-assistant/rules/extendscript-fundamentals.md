# ExtendScript Fundamentals

> **This rule file is REQUIRED for every interaction.** It defines the language constraints, DOM hierarchy, and patterns that apply to all generated ExtendScript code.

---

## ES3 Syntax Constraints

ExtendScript is based on **ECMAScript 3 (ES3)**. Modern JavaScript features do not exist.

### FORBIDDEN Syntax

FORBIDDEN: `let` and `const` declarations. Use `var` for all variable declarations.

```jsx
// WRONG - will cause a syntax error
let x = 10;
const y = 20;

// CORRECT
var x = 10;
var y = 20;
```

FORBIDDEN: Arrow functions. Use the `function` keyword for all function definitions.

```jsx
// WRONG - will cause a syntax error
var double = (x) => x * 2;
var greet = () => { return "hello"; };

// CORRECT
var double = function(x) { return x * 2; };
function greet() { return "hello"; }
```

FORBIDDEN: Template literals. Use string concatenation with `+`.

```jsx
// WRONG - will cause a syntax error
var msg = `Layer ${name} at position ${pos}`;

// CORRECT
var msg = "Layer " + name + " at position " + pos;
```

FORBIDDEN: Destructuring assignment.

```jsx
// WRONG - will cause a syntax error
var { name, index } = layer;
var [x, y] = position;

// CORRECT
var name = layer.name;
var index = layer.index;
var x = position[0];
var y = position[1];
```

FORBIDDEN: Default parameters.

```jsx
// WRONG - will cause a syntax error
function createLayer(name, width, height) {
    width = width || 1920;  // This pattern is OK as a workaround
}

// WRONG - will cause a syntax error
function createLayer(name, width = 1920, height = 1080) {}

// CORRECT
function createLayer(name, width, height) {
    if (width === undefined) width = 1920;
    if (height === undefined) height = 1080;
}
```

FORBIDDEN: Spread operator.

```jsx
// WRONG - will cause a syntax error
var merged = [...arr1, ...arr2];
doSomething(...args);

// CORRECT
var merged = arr1.concat(arr2);
```

FORBIDDEN: `for...of` loops.

```jsx
// WRONG - will cause a syntax error
for (var item of collection) {}

// CORRECT
for (var i = 0; i < collection.length; i++) {
    var item = collection[i];
}
```

FORBIDDEN: `class` declarations.

```jsx
// WRONG - will cause a syntax error
class MyThing {
    constructor(name) { this.name = name; }
}

// CORRECT
function MyThing(name) {
    this.name = name;
}
```

FORBIDDEN: `Array.prototype.forEach`, `Array.prototype.map`, `Array.prototype.filter`, `Array.prototype.reduce`. These do not exist in ES3. Use `for` loops for all iteration.

```jsx
// WRONG - will throw a runtime error (not a function)
layers.forEach(function(layer) { layer.enabled = false; });
var names = layers.map(function(l) { return l.name; });
var visible = layers.filter(function(l) { return l.enabled; });

// CORRECT
for (var i = 0; i < layers.length; i++) {
    layers[i].enabled = false;
}

var names = [];
for (var i = 0; i < layers.length; i++) {
    names.push(layers[i].name);
}

var visible = [];
for (var i = 0; i < layers.length; i++) {
    if (layers[i].enabled) {
        visible.push(layers[i]);
    }
}
```

FORBIDDEN: `Object.keys()`, `Object.values()`, `Object.entries()`. Use `for...in` with `hasOwnProperty`.

```jsx
// WRONG - will throw a runtime error
var keys = Object.keys(obj);

// CORRECT
var keys = [];
for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
        keys.push(key);
    }
}
```

### Allowed ES3 Features

These standard constructs work in ExtendScript:

- `var` declarations
- `function` declarations and expressions
- `for`, `for...in`, `while`, `do...while` loops
- `if/else`, `switch/case`
- `try/catch/finally`
- `new`, `delete`, `typeof`, `instanceof`
- `Array`, `String`, `Number`, `Boolean`, `RegExp`, `Date`, `Math`
- `Array.prototype.push`, `.pop`, `.shift`, `.unshift`, `.splice`, `.slice`, `.concat`, `.join`, `.sort`, `.reverse`, `.indexOf` (ExtendScript adds indexOf)
- `String.prototype.indexOf`, `.lastIndexOf`, `.charAt`, `.substring`, `.slice`, `.split`, `.replace`, `.match`, `.search`, `.toLowerCase`, `.toUpperCase`
- `parseInt()`, `parseFloat()`, `isNaN()`, `isFinite()`
- Regular expressions via `new RegExp()` or `/pattern/` literals

---

## JSON Serialization

There is no native `JSON` object in ES3. Calling `JSON.parse()` or `JSON.stringify()` without including the polyfill will throw a runtime error.

MUST include `json2.jsx` before any JSON operation:

```jsx
#include "lib/json2.jsx"

// Now JSON.parse and JSON.stringify are available
var obj = JSON.parse(content);
var str = JSON.stringify(obj);
```

The `#include` directive path is relative to the script file location, not the working directory.

---

## After Effects DOM Hierarchy

The AE scripting object model follows this tree structure:

```
Application (app)
  |-- Project (app.project)
  |     |-- ItemCollection (app.project.items)
  |     |     |-- FolderItem
  |     |     |-- FootageItem
  |     |     |-- CompItem
  |     |     |     |-- LayerCollection (comp.layers)
  |     |     |           |-- AVLayer
  |     |     |           |     |-- TextLayer (extends AVLayer)
  |     |     |           |     |-- ShapeLayer (extends AVLayer)
  |     |     |           |-- CameraLayer
  |     |     |           |-- LightLayer
  |     |     |
  |     |     |     Each Layer has:
  |     |     |           |-- PropertyGroup ("ADBE Transform Group", etc.)
  |     |     |                 |-- Property ("ADBE Position", "ADBE Opacity", etc.)
  |     |
  |     |-- RenderQueue (app.project.renderQueue)
  |           |-- RQItemCollection (renderQueue.items)
  |                 |-- RenderQueueItem
  |                       |-- OutputModule (rqItem.outputModule(1))
```

Key access patterns:

```jsx
var project = app.project;
var comp = app.project.activeItem;          // Currently open comp (may be null)
var item = app.project.item(1);             // First item in project (1-based)
var layer = comp.layer(1);                  // Top layer in comp (1-based)
var prop = layer.property("ADBE Position"); // Access property by matchName
```

---

## Indexing Rules

### 1-Based Indexing (AE Collections)

MUST use 1-based indexing for all After Effects collections. The first item is at index 1, not 0.

```jsx
// Layers in a composition
var topLayer = comp.layer(1);              // First (top) layer
var lastLayer = comp.layer(comp.numLayers); // Last (bottom) layer

// Project items
var firstItem = app.project.item(1);
var lastItem = app.project.item(app.project.numItems);

// Folder items
var firstChild = folder.item(1);

// Effect properties
var firstEffect = effects.property(1);

// Properties within a group
var firstProp = group.property(1);
var count = group.numProperties;            // numProperties counts from 1

// Keyframes
var firstKeyTime = prop.keyTime(1);
var firstKeyValue = prop.keyValue(1);
```

### 0-Based Indexing (JavaScript Arrays)

Standard JavaScript arrays returned by AE are 0-based:

```jsx
// selectedLayers returns a JavaScript array
var sel = comp.selectedLayers;  // Standard JS array, 0-based
var firstSelected = sel[0];
var lastSelected = sel[sel.length - 1];

// selectedProperties returns a JavaScript array
var selProps = comp.selectedProperties;  // 0-based
var firstProp = selProps[0];
```

### Common Indexing Mistake

```jsx
// WRONG - index 0 does not exist in AE collections
var layer = comp.layer(0);        // throws error
var item = app.project.item(0);   // throws error

// WRONG - treating selectedLayers as 1-based
var first = comp.selectedLayers[1]; // skips the actual first element

// CORRECT
var layer = comp.layer(1);
var first = comp.selectedLayers[0];
```

### Iteration Patterns

```jsx
// Iterating AE collections (1-based)
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
}

for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
}

for (var i = 1; i <= group.numProperties; i++) {
    var prop = group.property(i);
}

// Iterating JavaScript arrays (0-based)
var sel = comp.selectedLayers;
for (var i = 0; i < sel.length; i++) {
    var layer = sel[i];
}
```

---

## Property Access via matchNames

MUST use matchNames (internal identifiers) instead of display names when accessing properties. Display names are localized and will break in non-English installations of After Effects.

```jsx
// WRONG - display names are localized, will fail in non-English AE
var pos = layer.property("Transform").property("Position");

// CORRECT - matchNames are stable across all languages
var pos = layer.property("ADBE Transform Group").property("ADBE Position");
```

### Common matchNames Reference

#### Transform Properties

| matchName | Display Name | Notes |
|---|---|---|
| `ADBE Transform Group` | Transform | Property group containing all transform props |
| `ADBE Anchor Point` | Anchor Point | Value: `[x, y]` or `[x, y, z]` for 3D layers |
| `ADBE Position` | Position | Value: `[x, y]` or `[x, y, z]` for 3D layers |
| `ADBE Position_0` | X Position | Only when dimensions are separated |
| `ADBE Position_1` | Y Position | Only when dimensions are separated |
| `ADBE Position_2` | Z Position | Only when dimensions are separated (3D) |
| `ADBE Scale` | Scale | Value: `[x, y]` or `[x, y, z]` as percentages (100 = 100%) |
| `ADBE Rotate Z` | Rotation | Value: degrees. Also called Z Rotation for 3D layers |
| `ADBE Rotate X` | X Rotation | Only on 3D layers |
| `ADBE Rotate Y` | Y Rotation | Only on 3D layers |
| `ADBE Orientation` | Orientation | Only on 3D layers. Value: `[x, y, z]` degrees |
| `ADBE Opacity` | Opacity | Value: 0-100 |

#### Layer Property Groups

| matchName | Display Name | Notes |
|---|---|---|
| `ADBE Effect Parade` | Effects | Container for all effects on a layer |
| `ADBE Mask Parade` | Masks | Container for all masks on a layer |
| `ADBE Text Properties` | Text | Text layer properties group |
| `ADBE Text Document` | Source Text | The text content property (child of Text Properties) |
| `ADBE Root Vectors Group` | Contents | Shape layer contents group |
| `ADBE Audio Group` | Audio | Audio properties group |
| `ADBE Marker` | Marker | Layer marker property |
| `ADBE Material Options Group` | Material Options | 3D material properties |
| `ADBE Layer Styles` | Layer Styles | Photoshop-style layer effects |

#### Accessing Transform Properties (Full Pattern)

```jsx
var xform = layer.property("ADBE Transform Group");
var position = xform.property("ADBE Position");
var scale = xform.property("ADBE Scale");
var rotation = xform.property("ADBE Rotate Z");
var opacity = xform.property("ADBE Opacity");
var anchorPoint = xform.property("ADBE Anchor Point");

// 3D layer additional properties
if (layer instanceof AVLayer && layer.threeDLayer) {
    var xRot = xform.property("ADBE Rotate X");
    var yRot = xform.property("ADBE Rotate Y");
    var orientation = xform.property("ADBE Orientation");
}

// Separated position dimensions
var posProp = xform.property("ADBE Position");
if (posProp.dimensionsSeparated) {
    var xPos = xform.property("ADBE Position_0");
    var yPos = xform.property("ADBE Position_1");
    var zPos = xform.property("ADBE Position_2"); // 3D only
}
```

#### Accessing Effects

```jsx
var effects = layer.property("ADBE Effect Parade");
if (effects && effects.numProperties > 0) {
    for (var i = 1; i <= effects.numProperties; i++) {
        var effect = effects.property(i);
        var effectName = effect.name;
        var effectMatchName = effect.matchName;
    }
}

// Add an effect by matchName
var blur = effects.addProperty("ADBE Gaussian Blur 2");
blur.property("ADBE Gaussian Blur 2-0001").setValue(10); // Blurriness parameter
```

#### Accessing Text Properties

```jsx
var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
var textDoc = textProp.value;

// Read text properties
var content = textDoc.text;
var fontSize = textDoc.fontSize;
var fontName = textDoc.font;
var fillColor = textDoc.fillColor;    // [r, g, b] in 0-1 range

// Modify text
textDoc.text = "New text content";
textDoc.fontSize = 48;
textDoc.font = "ArialMT";
textDoc.fillColor = [1, 0, 0];       // Red
textProp.setValue(textDoc);
```

#### Accessing Shape Layer Contents

```jsx
var contents = layer.property("ADBE Root Vectors Group");
if (contents) {
    for (var i = 1; i <= contents.numProperties; i++) {
        var shapeGroup = contents.property(i);
        // Shape groups contain paths, fills, strokes, transforms
    }
}
```

---

## Type Checking

Use `instanceof` to determine item and layer types. This is the reliable way to branch logic based on what kind of object you have.

### Project Item Types

```jsx
var item = app.project.item(i);

if (item instanceof CompItem) {
    // Composition - has layers, duration, fps, etc.
} else if (item instanceof FolderItem) {
    // Folder - contains other items
} else if (item instanceof FootageItem) {
    // Footage - video, image, audio, solid, placeholder
}
```

### Layer Types

```jsx
var layer = comp.layer(i);

if (layer instanceof TextLayer) {
    // Text layer (extends AVLayer)
} else if (layer instanceof ShapeLayer) {
    // Shape layer (extends AVLayer)
} else if (layer instanceof CameraLayer) {
    // Camera layer - no source, no transform opacity
} else if (layer instanceof LightLayer) {
    // Light layer - no source, has light options
} else if (layer instanceof AVLayer) {
    // Audio/video layer - footage, solid, precomp, null, adjustment
    if (layer.nullLayer) {
        // Null object
    } else if (layer.adjustmentLayer) {
        // Adjustment layer
    } else if (layer.source instanceof CompItem) {
        // Pre-comp layer
    }
}
```

### Layer matchName Values

For more granular type detection, use `layer.matchName`:

| matchName | Layer Type |
|---|---|
| `ADBE AV Layer` | AVLayer (footage, solid, precomp, null, adjustment) |
| `ADBE Text Layer` | TextLayer |
| `ADBE Vector Layer` | ShapeLayer |
| `ADBE Camera Layer` | CameraLayer |
| `ADBE Light Layer` | LightLayer |

```jsx
switch (layer.matchName) {
    case "ADBE AV Layer":
        // General AV layer
        break;
    case "ADBE Text Layer":
        // Text layer
        break;
    case "ADBE Vector Layer":
        // Shape layer
        break;
    case "ADBE Camera Layer":
        // Camera
        break;
    case "ADBE Light Layer":
        // Light
        break;
}
```

### Active Item Check

MUST always verify the active item is a composition before using it:

```jsx
var comp = app.project.activeItem;

// WRONG - activeItem can be null, a FootageItem, or a FolderItem
comp.numLayers; // may throw

// CORRECT
if (!comp || !(comp instanceof CompItem)) {
    writeResult({ error: "No active composition" });
    return;
}
// Safe to use comp now
```

---

## File I/O Pattern

ExtendScript uses the `File` and `Folder` objects for filesystem operations.

### Reading a File

```jsx
var f = new File("/path/to/file.txt");
if (f.exists) {
    f.encoding = "UTF-8";
    f.open("r");
    var content = f.read();
    f.close();
} else {
    // File does not exist
}
```

### Writing a File

```jsx
var f = new File("/path/to/output.txt");
f.encoding = "UTF-8";
f.open("w");
f.write("content to write");
f.close();
```

### File Dialog (Interactive Only)

```jsx
// Open file dialog - ONLY for interactive scripts, never automated
var f = File.openDialog("Select a file", "*.jsx;*.json");
if (f) {
    // user selected a file
}

// Save file dialog
var f = File.saveDialog("Save as", "*.json");
```

### Folder Operations

```jsx
var dir = new Folder("/path/to/directory");
if (!dir.exists) {
    dir.create();
}

// List files in a folder
var files = dir.getFiles("*.jsx");
for (var i = 0; i < files.length; i++) {
    var fileName = files[i].name;
}
```

### Path Notes

- Use forward slashes `/` even on Windows (ExtendScript normalizes)
- `file.fsName` gives the platform-native path
- `file.fullName` gives the URI-style path
- `Folder.desktop` returns the desktop folder
- `Folder.temp` returns the system temp folder
- `$.fileName` returns the path of the currently executing script

---

## Undo Group Pattern

MUST wrap all mutation operations in an undo group. This allows the user to undo the entire operation with a single Cmd+Z.

```jsx
app.beginUndoGroup("AE Assistant: Descriptive Action Name");
try {
    // All mutation operations go here
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return;
    }

    // ... perform operations ...

    writeResult({ success: true, message: "Completed action description" });
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```

Rules for undo groups:

- MUST call `app.endUndoGroup()` in the `finally` block so it runs even on error
- MUST use a descriptive name that tells the user what happened (appears in Edit > Undo)
- MUST NOT nest undo groups (AE ignores inner `beginUndoGroup` calls)
- Read-only queries do not need undo groups

---

## IIFE Pattern

MUST wrap all script code in an Immediately Invoked Function Expression (IIFE) to prevent global scope pollution. Without this, variables from one script execution could leak into subsequent runs.

```jsx
(function() {
    // All script code goes here
    // Variables declared with var are scoped to this function
    var comp = app.project.activeItem;
    // ...
})();
```

### Full Script Template

Combining the IIFE, undo group, and error handling patterns:

```jsx
#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Action Name");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        // ... action code using args and comp ...

        writeResult({ success: true, message: "What was done" });
    } catch (e) {
        writeResult({ error: e.toString(), line: e.line });
    } finally {
        app.endUndoGroup();
    }
})();
```

---

## Common Gotchas

### TextDocument Properties Require an Associated Layer

Some `TextDocument` properties can only be set after the text layer exists. Setting them on a standalone `TextDocument` (before passing to `addText()`) throws: "Unable to set value as it is not associated with a layer."

```jsx
// WRONG - justification cannot be set before layer creation
var textDoc = new TextDocument("Hello");
textDoc.justification = ParagraphJustification.CENTER_JUSTIFY; // THROWS

// CORRECT - create layer first, then modify via property
var textLayer = comp.layers.addText("Hello");
var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
var textDoc = textProp.value;
textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
textDoc.fontSize = 48;
textProp.setValue(textDoc);
```

Safe before `addText()`: `text`, `fontSize`, `font`, `fillColor`, `strokeColor`, `applyFill`, `applyStroke`.
Must set after layer creation: `justification`, `boxText`, `boxTextSize`, `baselineShift`, `tracking`.

### Locked Layers Block All Modifications

Any write operation on a locked layer throws an error — including `moveToEnd()`, `moveToBeginning()`, property changes, and effect additions. Always unlock first:

```jsx
var wasLocked = layer.locked;
if (wasLocked) layer.locked = false;
// ... perform operations ...
if (wasLocked) layer.locked = true;
```

### layer.source Throws for Some Layer Types

Cameras, lights, and some null layers do not have a `.source` property. Accessing it throws an error.

```jsx
// WRONG - will throw for cameras and lights
var sourceName = layer.source.name;

// CORRECT
var sourceName = null;
try {
    if (layer.source) {
        sourceName = layer.source.name;
    }
} catch (e) {
    // Layer has no source (camera, light, or orphaned null)
}
```

### property.value Throws on Some Property Types

Certain properties (such as dropdown menus with no value set, or marker properties) throw when you access `.value`.

```jsx
// WRONG - may throw
var val = prop.value;

// CORRECT - wrap in try/catch when property type is uncertain
var val = null;
try {
    val = prop.value;
} catch (e) {
    // Property does not support .value or has no value
}
```

### alert() Blocks the AE User Interface

FORBIDDEN: Do not use `alert()` in automated scripts. It pops up a modal dialog and blocks AE until the user clicks OK, which defeats the purpose of automation.

```jsx
// FORBIDDEN in automated scripts
alert("Operation complete!");

// CORRECT - write results to file for the runner to read
writeResult({ success: true, message: "Operation complete" });
```

### $.writeln() for Debug Logging

`$.writeln()` writes to the ExtendScript Toolkit console. Useful during development but not for production output.

```jsx
// Debug logging (only for development)
$.writeln("Debug: layer count = " + comp.numLayers);

// Production output - use writeResult
writeResult({ layerCount: comp.numLayers });
```

### String Comparison Is Case-Sensitive

```jsx
// This will NOT match "My Layer" if the actual name is "my layer"
if (layer.name === "my layer") { }

// For case-insensitive comparison, normalize both sides
if (layer.name.toLowerCase() === "my layer") { }
```

### #include Paths Are Relative to the Script File

The `#include` directive resolves paths relative to the location of the `.jsx` file being executed, not the current working directory or the AE application.

```jsx
// If the script is at: /path/to/skills/scripts/action.jsx
// Then this resolves to: /path/to/skills/scripts/lib/json2.jsx
#include "lib/json2.jsx"

// Absolute paths also work
#include "/absolute/path/to/json2.jsx"
```

### app.project.activeItem Can Be Null or Non-Comp

`app.project.activeItem` returns whatever is currently active in the AE UI. This can be:
- `null` (nothing is active)
- A `CompItem` (a composition is open)
- A `FootageItem` (footage viewer is open)
- A `FolderItem` (a folder is selected in the project panel)

MUST check with `instanceof` before using as a composition:

```jsx
var item = app.project.activeItem;

// WRONG - item might be null or a non-comp
item.numLayers;

// CORRECT
if (item && item instanceof CompItem) {
    var comp = item;
    // Safe to use comp.numLayers, comp.layer(), etc.
}
```

### Collections Are 1-Based but .length Is Standard

AE collection objects use 1-based indexing, and their count properties (`.numLayers`, `.numProperties`, `.numItems`) start counting from 1.

```jsx
// A comp with 5 layers:
comp.numLayers;       // 5
comp.layer(1);        // First layer (top)
comp.layer(5);        // Last layer (bottom)
comp.layer(0);        // ERROR - no index 0
comp.layer(6);        // ERROR - out of range

// Correct iteration
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
}
```

### selectedLayers Returns a Standard JS Array (0-Based)

Unlike AE collections, `selectedLayers` and `selectedProperties` return regular JavaScript arrays with 0-based indexing.

```jsx
var sel = comp.selectedLayers;

// This is a standard JS array
sel.length;     // Number of selected layers
sel[0];         // First selected layer (0-based)
sel[1];         // Second selected layer

// Correct iteration (0-based)
for (var i = 0; i < sel.length; i++) {
    var layer = sel[i];
}

// WRONG - treating selectedLayers as 1-based
sel[1]; // This is the SECOND selected layer, not the first
```

### Modifying Collections During Iteration

Removing layers or items while iterating forward causes index shifting. MUST iterate in reverse when deleting.

```jsx
// WRONG - indices shift after each removal
for (var i = 1; i <= comp.numLayers; i++) {
    if (shouldDelete(comp.layer(i))) {
        comp.layer(i).remove(); // Next layer shifts down, gets skipped
    }
}

// CORRECT - iterate in reverse
for (var i = comp.numLayers; i >= 1; i--) {
    if (shouldDelete(comp.layer(i))) {
        comp.layer(i).remove(); // Safe, earlier indices unaffected
    }
}
```

### Property Existence Checks

Not all layers have all property groups. Always check before accessing sub-properties.

```jsx
// WRONG - shape layers have Contents, but text layers do not
var contents = layer.property("ADBE Root Vectors Group"); // null for non-shape layers
contents.numProperties; // throws if contents is null

// CORRECT
var contents = layer.property("ADBE Root Vectors Group");
if (contents && contents.numProperties > 0) {
    // Safe to iterate
}
```

### Numeric Precision

AE uses floating-point internally. Avoid exact equality comparisons on time values and property values.

```jsx
// WRONG - floating point comparison
if (comp.time === 2.5) { }

// CORRECT - compare with tolerance
var epsilon = 0.001;
if (Math.abs(comp.time - 2.5) < epsilon) { }
```

### Property Value Types Quick Reference

| Property | Value Type | Example |
|---|---|---|
| Position (2D) | Array `[x, y]` | `[960, 540]` |
| Position (3D) | Array `[x, y, z]` | `[960, 540, 0]` |
| Scale (2D) | Array `[x, y]` | `[100, 100]` (percentages) |
| Scale (3D) | Array `[x, y, z]` | `[100, 100, 100]` (percentages) |
| Rotation | Number | `45` (degrees) |
| Opacity | Number | `100` (0-100) |
| Color | Array `[r, g, b]` | `[1, 0, 0]` (0-1 range, this is red) |
| Anchor Point (2D) | Array `[x, y]` | `[0, 0]` |
| Anchor Point (3D) | Array `[x, y, z]` | `[0, 0, 0]` |
| Source Text | `TextDocument` object | Must use `.value` then modify, then `.setValue()` |
| Checkbox | Number | `0` or `1` |
| Slider | Number | Any float |
| Angle | Number | Degrees |
| Point (2D) | Array `[x, y]` | Normalized 0-1 for effect points |
