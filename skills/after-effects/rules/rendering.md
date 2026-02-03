# Rendering & Render Queue

> **Loaded when:** the task involves rendering, the render queue, output modules, render settings, output paths, or render templates in After Effects via ExtendScript.

All code in this file is ES3-compatible ExtendScript. See `extendscript-fundamentals.md` for baseline syntax rules.

---

## Adding a Composition to the Render Queue

```jsx
// items.add(comp) returns a RenderQueueItem
var rqItem = app.project.renderQueue.items.add(comp);
```

The composition must be a valid `CompItem`. The new item is appended to the end of the render queue with a status of `RQItemStatus.QUEUED`.

```jsx
// Full pattern: validate comp, then add to queue
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    writeResult({ error: "No active composition" });
    return;
}
var rqItem = app.project.renderQueue.items.add(comp);
```

---

## Output Modules

Each render queue item has at least one output module. Access it with a 1-based index.

### Accessing the Default Output Module

```jsx
// outputModule(1) — first (default) output module, 1-based
var om = rqItem.outputModule(1);
```

### Adding Additional Output Modules

```jsx
// outputModules.add() appends a new output module to the item
var om2 = rqItem.outputModules.add();
```

This is useful for rendering multiple formats or to multiple destinations from a single queue item.

---

## Setting the Output File Path

```jsx
// om.file accepts a File object — path MUST include the file extension
om.file = new File("/path/to/output.mov");
```

```jsx
// Dynamic path using comp name
var outputPath = Folder.desktop.fsName + "/" + comp.name + ".mov";
om.file = new File(outputPath);
```

```jsx
// Windows-style paths work with forward slashes
om.file = new File("C:/Renders/project_output.mp4");
```

---

## Applying Templates

### Output Module Templates

Output module templates control the format, codec, channels, and encoding settings.

```jsx
// Apply a named output module template
om.applyTemplate(templateName);
```

```jsx
// Common built-in template names (vary by AE version and installed codecs)
om.applyTemplate("Lossless");
om.applyTemplate("Lossless with Alpha");
om.applyTemplate("H.264");
om.applyTemplate("TIFF Sequence with Alpha");
```

### Render Settings Templates

Render settings templates control resolution, frame rate, time span, and quality.

```jsx
// Apply a named render settings template
rqItem.applyTemplate(templateName);
```

```jsx
// Common built-in render settings template names
rqItem.applyTemplate("Best Settings");
rqItem.applyTemplate("Draft Settings");
rqItem.applyTemplate("Current Settings");
```

### Listing Available Templates

```jsx
// Output module templates — returns a JavaScript array of strings
var omTemplates = om.templates;
for (var i = 0; i < omTemplates.length; i++) {
    $.writeln("OM template: " + omTemplates[i]);
}

// Render settings templates — returns a JavaScript array of strings
var rsTemplates = rqItem.templates;
for (var i = 0; i < rsTemplates.length; i++) {
    $.writeln("RS template: " + rsTemplates[i]);
}
```

---

## Render Settings Properties

### Time Span

```jsx
// timeSpanStart — the start time of the render in seconds
rqItem.timeSpanStart = 0;

// timeSpanDuration — the total duration to render in seconds
rqItem.timeSpanDuration = 10;
```

```jsx
// Render only the first 5 seconds
rqItem.timeSpanStart = 0;
rqItem.timeSpanDuration = 5;

// Render from 2 seconds to 7 seconds
rqItem.timeSpanStart = 2;
rqItem.timeSpanDuration = 5;
```

### Skip Frames

```jsx
// skipFrames — number of frames to skip between rendered frames
// 0 = render every frame (default)
// 1 = render every other frame
// 2 = render every third frame
rqItem.skipFrames = 0;
```

---

## Starting a Render

```jsx
// render() starts rendering all QUEUED items in the render queue
// This call BLOCKS the script until all rendering is complete
app.project.renderQueue.render();
```

After `render()` returns, all items that were `QUEUED` will have updated statuses (typically `DONE`, `ERR_STOPPED`, or `USER_STOPPED`).

---

## Render Queue Item Status

The `rqItem.status` property is read-only and returns one of the `RQItemStatus` enum values.

| Status | Meaning |
|---|---|
| `RQItemStatus.QUEUED` | Ready to render |
| `RQItemStatus.RENDERING` | Currently rendering (only during a render call) |
| `RQItemStatus.DONE` | Render completed successfully |
| `RQItemStatus.UNQUEUED` | Removed from queue (will not render) |
| `RQItemStatus.NEEDS_OUTPUT` | Missing output module or output path |
| `RQItemStatus.WILL_CONTINUE` | Partially rendered, will continue on next render |
| `RQItemStatus.ERR_STOPPED` | Render stopped due to an error |
| `RQItemStatus.USER_STOPPED` | Render stopped by the user |

### Checking Status

```jsx
if (rqItem.status === RQItemStatus.QUEUED) {
    // Ready to render
}

if (rqItem.status === RQItemStatus.DONE) {
    // Finished successfully
}

if (rqItem.status === RQItemStatus.ERR_STOPPED) {
    // Render failed
}
```

---

## Inspecting the Render Queue

### Item Count

```jsx
var numItems = app.project.renderQueue.numItems;
```

### Iterating All Items (1-Based)

```jsx
var rq = app.project.renderQueue;
for (var i = 1; i <= rq.numItems; i++) {
    var item = rq.item(i);
    var compName = item.comp.name;
    var status = item.status;
}
```

### Counting Queued Items

```jsx
var queuedCount = 0;
var rq = app.project.renderQueue;
for (var i = 1; i <= rq.numItems; i++) {
    if (rq.item(i).status === RQItemStatus.QUEUED) {
        queuedCount++;
    }
}
```

---

## Removing / Unqueuing Items

Render queue items cannot be removed directly from the queue via scripting. To prevent an item from rendering, change its status to `UNQUEUED`.

```jsx
// Mark an item as unqueued so it will not render
rqItem.render = false;  // sets status to RQItemStatus.UNQUEUED
```

```jsx
// To re-queue a previously completed or unqueued item
// Only items with status UNQUEUED or DONE can be changed
rqItem.render = true;   // sets status to RQItemStatus.QUEUED
```

### Unqueue All Items

```jsx
var rq = app.project.renderQueue;
for (var i = 1; i <= rq.numItems; i++) {
    var item = rq.item(i);
    if (item.status !== RQItemStatus.RENDERING) {
        item.render = false;
    }
}
```

---

## MUST

- **MUST** verify the active item is a `CompItem` before adding it to the render queue:

```jsx
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    writeResult({ error: "No active composition" });
    return;
}
```

- **MUST** include the file extension in the output path. AE uses the extension to determine the output format. Omitting it causes unpredictable behavior or errors:

```jsx
// WRONG — no extension
om.file = new File("/renders/output");

// CORRECT — includes extension
om.file = new File("/renders/output.mov");
```

- **MUST** set the output file path before rendering. A render queue item with no output path has status `RQItemStatus.NEEDS_OUTPUT` and will not render.

- **MUST** ensure at least one item in the render queue has status `RQItemStatus.QUEUED` before calling `render()`. Calling `render()` with no queued items does nothing but can cause confusion.

- **MUST** use 1-based indexing when accessing render queue items (`rq.item(1)`) and output modules (`rqItem.outputModule(1)`).

- **MUST** use ES3 syntax in all render queue scripts. No `let`, `const`, arrow functions, or template literals.

---

## FORBIDDEN

- **FORBIDDEN:** Calling `app.project.renderQueue.render()` without understanding that it blocks the entire script. No code after the `render()` call will execute until all queued items finish rendering. Do not place time-sensitive logic after `render()` expecting it to run concurrently.

```jsx
// WRONG — expecting this to run during rendering
app.project.renderQueue.render();
updateProgressUI(); // This runs AFTER render completes, not during

// CORRECT — set everything up before calling render
setupOutputPaths();
configureTemplates();
app.project.renderQueue.render();
// Now handle post-render logic
reportResults();
```

- **FORBIDDEN:** Using `alert()` in automated render scripts. It blocks the AE UI and halts the render process until dismissed. Use `writeResult()` instead.

- **FORBIDDEN:** Accessing `rqItem.outputModule(0)`. Output modules are 1-based. Index 0 does not exist and will throw an error.

- **FORBIDDEN:** Assuming template names are consistent across machines. Template availability depends on AE version, installed codecs, and user-defined presets. Always validate template names against the `templates` array or wrap `applyTemplate()` in a try/catch:

```jsx
// SAFE — wrap in try/catch in case the template does not exist
try {
    om.applyTemplate("H.264");
} catch (e) {
    // Template not available, fall back
    om.applyTemplate("Lossless");
}
```

- **FORBIDDEN:** Attempting to remove render queue items from the collection. There is no `remove()` method on render queue items. Use `rqItem.render = false` to unqueue them instead.

---

## Gotchas

- **`render()` blocks the script.** `app.project.renderQueue.render()` is synchronous and blocking. The script halts at that line until every `QUEUED` item in the render queue finishes rendering (or errors out, or the user cancels). Plan all setup -- output paths, templates, render settings -- before calling `render()`.

- **The render queue must have at least one QUEUED item.** If no items are queued, `render()` returns immediately without doing anything. Always verify at least one item has `RQItemStatus.QUEUED` before calling `render()` to avoid silent no-ops.

- **Output path must include the file extension.** AE infers the output format from the extension (`.mov`, `.avi`, `.mp4`, `.tif`, `.png`, etc.). Omitting the extension can cause the render to fail or produce an unusable file with no format association.

- **Template names are machine-specific.** The arrays returned by `om.templates` and `rqItem.templates` vary across installations. A template that exists on one machine may not exist on another. Never hard-code template names without a fallback.

- **Render queue items are 1-based.** `app.project.renderQueue.item(1)` is the first item. `app.project.renderQueue.item(0)` throws an error. Same applies to `rqItem.outputModule(1)`.

- **`rqItem.comp` is read-only.** You cannot reassign which composition a render queue item points to after creation. To change the comp, add a new render queue item and unqueue the old one.

- **Status is read-only.** You cannot set `rqItem.status` directly. Use `rqItem.render = true` to queue and `rqItem.render = false` to unqueue. The status property reflects the current state.

- **`timeSpanStart` and `timeSpanDuration` are in seconds.** These are floating-point values in seconds, not frames. Convert frames to seconds using `frameNumber / comp.frameRate`.

- **Adding output modules after applying templates.** If you add an output module with `rqItem.outputModules.add()`, it inherits default settings, not the settings of any previously configured output module. Apply templates and set paths on each output module individually.

- **Items with status `NEEDS_OUTPUT` will not render.** If you add a comp to the render queue but never assign an output path, the status remains `NEEDS_OUTPUT`. This item is silently skipped by `render()`.

---

## Complete Example: Add Active Comp to Render Queue with Template

```jsx
app.beginUndoGroup("AE Assistant: Add to render queue");
try {
    // Validate active comp
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return;
    }

    // Add to render queue
    var rqItem = app.project.renderQueue.items.add(comp);

    // Apply render settings template (with fallback)
    try {
        rqItem.applyTemplate("Best Settings");
    } catch (e) {
        // "Best Settings" not available, use first available template
        if (rqItem.templates.length > 0) {
            rqItem.applyTemplate(rqItem.templates[0]);
        }
    }

    // Get the default output module
    var om = rqItem.outputModule(1);

    // Apply output module template (with fallback)
    try {
        om.applyTemplate("Lossless");
    } catch (e) {
        // "Lossless" not available, use first available template
        if (om.templates.length > 0) {
            om.applyTemplate(om.templates[0]);
        }
    }

    // Set output path — desktop folder with comp name
    var outputFolder = Folder.desktop.fsName;
    var outputPath = outputFolder + "/" + comp.name + ".mov";
    om.file = new File(outputPath);

    // Verify the item is queued
    if (rqItem.status === RQItemStatus.QUEUED) {
        writeResult({
            success: true,
            message: "Added to render queue: " + comp.name,
            outputPath: outputPath
        });
    } else {
        writeResult({
            error: "Item status is " + rqItem.status + ", expected QUEUED"
        });
    }

} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```

---

## Complete Example: Batch Render Multiple Comps

```jsx
app.beginUndoGroup("AE Assistant: Batch render setup");
try {
    var outputFolder = Folder.desktop.fsName + "/Renders";
    var dir = new Folder(outputFolder);
    if (!dir.exists) {
        dir.create();
    }

    var compsAdded = [];

    // Find all compositions in the project and add them to the queue
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem) {
            var rqItem = app.project.renderQueue.items.add(item);
            var om = rqItem.outputModule(1);

            // Set output path with comp name and extension
            var outputPath = outputFolder + "/" + item.name + ".mov";
            om.file = new File(outputPath);

            compsAdded.push(item.name);
        }
    }

    if (compsAdded.length === 0) {
        writeResult({ error: "No compositions found in project" });
        return;
    }

    // Start rendering — this blocks until all items are done
    app.project.renderQueue.render();

    // Check results after render completes
    var results = [];
    var rq = app.project.renderQueue;
    for (var i = rq.numItems - compsAdded.length + 1; i <= rq.numItems; i++) {
        var rqItem = rq.item(i);
        results.push({
            comp: rqItem.comp.name,
            status: rqItem.status === RQItemStatus.DONE ? "DONE" : "FAILED"
        });
    }

    writeResult({
        success: true,
        message: "Batch render complete",
        results: results
    });

} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```

---

## Complete Example: Add Comp with Multiple Output Modules

```jsx
app.beginUndoGroup("AE Assistant: Multi-output render");
try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return;
    }

    var rqItem = app.project.renderQueue.items.add(comp);
    var outputFolder = Folder.desktop.fsName;

    // First output module — video file
    var om1 = rqItem.outputModule(1);
    try {
        om1.applyTemplate("Lossless");
    } catch (e) { /* fallback to defaults */ }
    om1.file = new File(outputFolder + "/" + comp.name + ".mov");

    // Second output module — image sequence
    var om2 = rqItem.outputModules.add();
    try {
        om2.applyTemplate("TIFF Sequence with Alpha");
    } catch (e) { /* fallback to defaults */ }
    om2.file = new File(outputFolder + "/" + comp.name + "_[#####].tif");

    writeResult({
        success: true,
        message: "Added " + comp.name + " with 2 output modules",
        outputs: [
            outputFolder + "/" + comp.name + ".mov",
            outputFolder + "/" + comp.name + "_[#####].tif"
        ]
    });

} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```
