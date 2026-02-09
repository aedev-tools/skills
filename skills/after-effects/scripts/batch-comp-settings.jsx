// batch-comp-settings.jsx — Change settings across multiple comps at once
// Args: {
//   "compNames": ["Comp 1", "Comp 2"],  — specific comps (optional, uses selected/all if omitted)
//   "scope": "selected",                 — "selected" (project panel), "all", or "nested" (active + nested)
//   "fps": 25,                           — new frame rate (optional)
//   "width": 1920,                       — new width (optional)
//   "height": 1080,                      — new height (optional)
//   "duration": 10,                      — new duration in seconds (optional)
//   "bgColor": [0, 0, 0]                — new background color RGB 0-1 (optional)
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Batch Comp Settings");
    try {
        var args = readArgs();

        // Collect target comps
        var comps = [];

        if (args.compNames && args.compNames.length > 0) {
            // Specific comps by name
            for (var n = 0; n < args.compNames.length; n++) {
                for (var i = 1; i <= app.project.numItems; i++) {
                    var item = app.project.item(i);
                    if (item instanceof CompItem && item.name === args.compNames[n]) {
                        comps.push(item);
                        break;
                    }
                }
            }
        } else {
            var scope = args.scope || "selected";

            if (scope === "selected") {
                var sel = app.project.selection;
                for (var s = 0; s < sel.length; s++) {
                    if (sel[s] instanceof CompItem) {
                        comps.push(sel[s]);
                    }
                }
                if (comps.length === 0) {
                    // Fall back to active comp
                    var active = app.project.activeItem;
                    if (active && active instanceof CompItem) {
                        comps.push(active);
                    }
                }
            } else if (scope === "all") {
                for (var a = 1; a <= app.project.numItems; a++) {
                    var aItem = app.project.item(a);
                    if (aItem instanceof CompItem) {
                        comps.push(aItem);
                    }
                }
            } else if (scope === "nested") {
                // Active comp + all nested precomps recursively
                var active = app.project.activeItem;
                if (!active || !(active instanceof CompItem)) {
                    writeResult({ error: "No active composition for nested scope" });
                    return;
                }
                var visited = {};
                function collectNested(comp) {
                    if (visited[comp.id]) return;
                    visited[comp.id] = true;
                    comps.push(comp);
                    for (var l = 1; l <= comp.numLayers; l++) {
                        var layer = comp.layer(l);
                        if (layer instanceof AVLayer && layer.source && layer.source instanceof CompItem) {
                            collectNested(layer.source);
                        }
                    }
                }
                collectNested(active);
            }
        }

        if (comps.length === 0) {
            writeResult({ error: "No compositions found to modify" });
            return;
        }

        // Check that at least one setting is provided
        var hasChanges = (args.fps !== undefined || args.width !== undefined ||
                         args.height !== undefined || args.duration !== undefined ||
                         args.bgColor !== undefined);
        if (!hasChanges) {
            writeResult({ error: "No settings to change. Provide at least one: fps, width, height, duration, bgColor" });
            return;
        }

        var modified = [];

        for (var c = 0; c < comps.length; c++) {
            var comp = comps[c];
            var changes = [];

            if (args.fps !== undefined && comp.frameRate !== args.fps) {
                comp.frameRate = args.fps;
                changes.push("fps→" + args.fps);
            }

            if (args.width !== undefined && args.height !== undefined) {
                if (comp.width !== args.width || comp.height !== args.height) {
                    comp.width = args.width;
                    comp.height = args.height;
                    changes.push("size→" + args.width + "x" + args.height);
                }
            } else if (args.width !== undefined && comp.width !== args.width) {
                comp.width = args.width;
                changes.push("width→" + args.width);
            } else if (args.height !== undefined && comp.height !== args.height) {
                comp.height = args.height;
                changes.push("height→" + args.height);
            }

            if (args.duration !== undefined && comp.duration !== args.duration) {
                comp.duration = args.duration;
                changes.push("duration→" + args.duration + "s");
            }

            if (args.bgColor !== undefined) {
                comp.bgColor = args.bgColor;
                changes.push("bgColor→[" + args.bgColor.join(",") + "]");
            }

            if (changes.length > 0) {
                modified.push({
                    name: comp.name,
                    changes: changes
                });
            }
        }

        writeResult({
            success: true,
            message: "Modified " + modified.length + " of " + comps.length + " compositions",
            totalComps: comps.length,
            modifiedCount: modified.length,
            modified: modified
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
