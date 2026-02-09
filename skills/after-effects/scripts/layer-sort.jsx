// layer-sort.jsx — Sort layers in timeline by various criteria
// Args: {
//   "sortBy": "name",       — "name", "inPoint", "type", "label", "position-y", "position-x"
//   "order": "ascending"    — "ascending" or "descending"
// }
// Operates on selected layers (or all layers if none selected) in active comp
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Sort Layers");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var sortBy = args.sortBy || "name";
        var order = args.order || "ascending";

        // Collect layers to sort
        var layers = comp.selectedLayers;
        var useSelected = layers.length >= 2;

        if (!useSelected) {
            layers = [];
            for (var i = 1; i <= comp.numLayers; i++) {
                layers.push(comp.layer(i));
            }
        }

        if (layers.length < 2) {
            writeResult({ error: "Need at least 2 layers to sort" });
            return;
        }

        // Get sort values for each layer
        var sortData = [];
        for (var s = 0; s < layers.length; s++) {
            var layer = layers[s];
            var sortVal;

            switch (sortBy) {
                case "name":
                    sortVal = layer.name.toLowerCase();
                    break;
                case "inPoint":
                    sortVal = layer.inPoint;
                    break;
                case "type":
                    sortVal = getLayerType(layer);
                    break;
                case "label":
                    sortVal = layer.label;
                    break;
                case "position-y":
                    try {
                        var posY = layer.property("ADBE Transform Group").property("ADBE Position").value;
                        sortVal = posY[1];
                    } catch (e) { sortVal = 0; }
                    break;
                case "position-x":
                    try {
                        var posX = layer.property("ADBE Transform Group").property("ADBE Position").value;
                        sortVal = posX[0];
                    } catch (e) { sortVal = 0; }
                    break;
                default:
                    writeResult({ error: "Unknown sortBy: " + sortBy + ". Use: name, inPoint, type, label, position-y, position-x" });
                    return;
            }

            sortData.push({
                layer: layer,
                index: layer.index,
                value: sortVal,
                name: layer.name
            });
        }

        // Sort
        for (var a = 0; a < sortData.length - 1; a++) {
            for (var b = a + 1; b < sortData.length; b++) {
                var swap = false;
                if (order === "ascending") {
                    swap = sortData[b].value < sortData[a].value;
                } else {
                    swap = sortData[b].value > sortData[a].value;
                }
                if (swap) {
                    var temp = sortData[a];
                    sortData[a] = sortData[b];
                    sortData[b] = temp;
                }
            }
        }

        // Reorder layers — move each to position after the previous
        // Find the topmost index among sorted layers as the target zone
        var topIndex = sortData[0].layer.index;
        for (var t = 1; t < sortData.length; t++) {
            if (sortData[t].layer.index < topIndex) {
                topIndex = sortData[t].layer.index;
            }
        }

        // Move layers into sorted order starting from topIndex
        for (var m = 0; m < sortData.length; m++) {
            var targetLayer = sortData[m].layer;
            var isLocked = targetLayer.locked;
            targetLayer.locked = false;
            targetLayer.moveTo(topIndex + m);
            targetLayer.locked = isLocked;
        }

        var sortedNames = [];
        for (var r = 0; r < sortData.length; r++) {
            sortedNames.push(sortData[r].name);
        }

        writeResult({
            success: true,
            message: "Sorted " + sortData.length + " layers by " + sortBy + " (" + order + ")",
            sortBy: sortBy,
            order: order,
            count: sortData.length,
            newOrder: sortedNames
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
