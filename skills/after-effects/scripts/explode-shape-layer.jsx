// explode-shape-layer.jsx — Split shape layer groups into individual layers
// Args: {
//   "layerName": "Shape Layer 1",  — specific layer (optional, uses selected layer)
//   "deleteOriginal": false         — delete original after splitting (default false)
// }
// Each top-level shape group becomes its own layer
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Explode Shape Layer");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        // Find the shape layer
        var shapeLayer = null;

        if (args.layerName) {
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === args.layerName) {
                    shapeLayer = comp.layer(i);
                    break;
                }
            }
        } else {
            var sel = comp.selectedLayers;
            if (sel.length > 0) shapeLayer = sel[0];
        }

        if (!shapeLayer) {
            writeResult({ error: "Shape layer not found. Provide layerName or select a shape layer." });
            return;
        }

        if (!(shapeLayer instanceof ShapeLayer)) {
            writeResult({ error: "Selected layer is not a shape layer: " + shapeLayer.name });
            return;
        }

        var contents = shapeLayer.property("ADBE Root Vectors Group");
        var numGroups = contents.numProperties;

        if (numGroups < 2) {
            writeResult({ error: "Shape layer has only " + numGroups + " group(s). Need at least 2 to explode." });
            return;
        }

        var originalName = shapeLayer.name;
        var originalIndex = shapeLayer.index;
        var createdLayers = [];
        var deleteOriginal = args.deleteOriginal === true;

        // For each top-level group, duplicate the layer and remove all other groups
        // Work backwards through groups so index removal doesn't shift
        for (var g = 1; g <= numGroups; g++) {
            var groupName = contents.property(g).name;

            // Duplicate the original shape layer
            var isLocked = shapeLayer.locked;
            shapeLayer.locked = false;
            var newLayer = shapeLayer.duplicate();
            shapeLayer.locked = isLocked;

            // Name the new layer after the group
            newLayer.name = groupName;
            newLayer.locked = false;

            // Remove all groups except the one we want to keep
            var newContents = newLayer.property("ADBE Root Vectors Group");

            // Remove groups in reverse order to maintain indices
            for (var r = newContents.numProperties; r >= 1; r--) {
                if (r !== g) {
                    newContents.property(r).remove();
                }
            }

            createdLayers.push(groupName);
        }

        // Disable or delete original
        if (deleteOriginal) {
            shapeLayer.locked = false;
            shapeLayer.remove();
        } else {
            shapeLayer.enabled = false;
        }

        writeResult({
            success: true,
            message: "Exploded '" + originalName + "' into " + createdLayers.length + " layers" +
                     (deleteOriginal ? " (original deleted)" : " (original disabled)"),
            originalLayer: originalName,
            count: createdLayers.length,
            layers: createdLayers
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
