// batch-rename.jsx — Rename layers, comps, or project items in bulk
// Args: {
//   "target": "layers",     — "layers" (selected or all in active comp), "comps", "items"
//   "mode": "find-replace", — "find-replace", "prefix", "suffix", "sequence", "trim"
//   "find": "old text",     — for find-replace mode
//   "replace": "new text",  — for find-replace mode
//   "prefix": "BG_",        — for prefix mode
//   "suffix": "_v2",        — for suffix mode
//   "base": "Layer",        — for sequence mode (e.g., "Layer 1", "Layer 2")
//   "start": 1,             — for sequence mode, starting number
//   "trimStart": 0,         — for trim mode, characters to remove from start
//   "trimEnd": 0            — for trim mode, characters to remove from end
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Batch Rename");
    try {
        var args = readArgs();
        var target = args.target || "layers";
        var mode = args.mode || "find-replace";

        var renamedCount = 0;
        var renamed = [];

        function applyRename(oldName) {
            var newName = oldName;

            if (mode === "find-replace") {
                if (!args.find) return oldName;
                // Replace all occurrences
                newName = oldName.split(args.find).join(args.replace || "");
            } else if (mode === "prefix") {
                newName = (args.prefix || "") + oldName;
            } else if (mode === "suffix") {
                newName = oldName + (args.suffix || "");
            } else if (mode === "trim") {
                var trimS = args.trimStart || 0;
                var trimE = args.trimEnd || 0;
                var endIdx = oldName.length - trimE;
                if (endIdx < trimS) endIdx = trimS;
                newName = oldName.substring(trimS, endIdx);
            }
            // sequence mode is handled separately

            return newName;
        }

        function renameItem(obj, compName) {
            var oldName = obj.name;
            var newName;

            if (mode === "sequence") {
                var base = args.base || "Item";
                var num = (args.start || 1) + renamedCount;
                // Zero-pad if start suggests padding (e.g., start: 01)
                var numStr = String(num);
                newName = base + " " + numStr;
            } else {
                newName = applyRename(oldName);
            }

            if (newName !== oldName) {
                obj.name = newName;
                renamedCount++;
                if (renamed.length < 50) {
                    var entry = { old: oldName, new: newName };
                    if (compName) entry.comp = compName;
                    renamed.push(entry);
                }
            }
        }

        if (target === "layers") {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                writeResult({ error: "No active composition" });
                return;
            }

            // Use selected layers if any, otherwise all layers
            var layers = comp.selectedLayers;
            if (layers.length === 0) {
                // All layers
                for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i);
                    var isLocked = layer.locked;
                    layer.locked = false;
                    renameItem(layer, comp.name);
                    layer.locked = isLocked;
                }
            } else {
                for (var s = 0; s < layers.length; s++) {
                    var sLayer = layers[s];
                    var wasLocked = sLayer.locked;
                    sLayer.locked = false;
                    renameItem(sLayer, comp.name);
                    sLayer.locked = wasLocked;
                }
            }
        } else if (target === "comps") {
            // Rename all comps or selected comps
            var sel = app.project.selection;
            if (sel.length > 0) {
                for (var c = 0; c < sel.length; c++) {
                    if (sel[c] instanceof CompItem) {
                        renameItem(sel[c]);
                    }
                }
            } else {
                for (var ci = 1; ci <= app.project.numItems; ci++) {
                    var cItem = app.project.item(ci);
                    if (cItem instanceof CompItem) {
                        renameItem(cItem);
                    }
                }
            }
        } else if (target === "items") {
            // Rename selected project items
            var items = app.project.selection;
            for (var pi = 0; pi < items.length; pi++) {
                renameItem(items[pi]);
            }
        }

        writeResult({
            success: true,
            message: "Renamed " + renamedCount + " items",
            count: renamedCount,
            renamed: renamed
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
