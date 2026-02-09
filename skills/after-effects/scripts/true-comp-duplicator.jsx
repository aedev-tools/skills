// true-comp-duplicator.jsx — Deep-clone a comp with independent sub-comps
// Args: { "compName": "Main Comp", "suffix": " COPY" }
//   compName: optional, uses active comp if omitted
//   suffix: optional, defaults to " COPY"
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: True Comp Duplicator");
    try {
        var args = readArgs();
        var suffix = args.suffix || " COPY";
        var comp = null;

        if (args.compName) {
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.name === args.compName) {
                    comp = item;
                    break;
                }
            }
            if (!comp) {
                writeResult({ error: "Composition not found: " + args.compName });
                return;
            }
        } else {
            comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                writeResult({ error: "No active composition" });
                return;
            }
        }

        // Track duplicated comps by ID to handle shared precomps and avoid infinite recursion
        var duplicatedMap = {}; // sourceComp.id -> newComp
        var duplicatedCount = 0;

        function deepDuplicate(sourceComp) {
            // Already duplicated this comp (shared precomp or circular reference)
            if (duplicatedMap[sourceComp.id]) {
                return duplicatedMap[sourceComp.id];
            }

            // Duplicate the comp itself
            var newComp = sourceComp.duplicate();
            newComp.name = sourceComp.name + suffix;
            duplicatedCount++;

            // Register before recursing to prevent infinite loops
            duplicatedMap[sourceComp.id] = newComp;

            // Walk layers and replace nested precomp sources with independent copies
            for (var j = 1; j <= newComp.numLayers; j++) {
                var layer = newComp.layer(j);
                if (!(layer instanceof AVLayer)) continue;

                var src = layer.source;
                if (src && src instanceof CompItem) {
                    // Deep duplicate this nested precomp
                    var newSubComp = deepDuplicate(src);
                    // Replace source — fixExpressions=true updates expression references
                    var isLocked = layer.locked;
                    layer.locked = false;
                    layer.replaceSource(newSubComp, true);
                    layer.locked = isLocked;
                }
            }

            return newComp;
        }

        var newComp = deepDuplicate(comp);

        // Optionally place all duplicated comps in a folder
        var folder = app.project.items.addFolder(comp.name + suffix + " [duplicated]");
        for (var id in duplicatedMap) {
            duplicatedMap[id].parentFolder = folder;
        }

        writeResult({
            success: true,
            message: "Deep-duplicated " + duplicatedCount + " compositions",
            newCompName: newComp.name,
            folderName: folder.name,
            duplicatedComps: duplicatedCount
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
