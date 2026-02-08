// un-precompose.jsx — Extract layers from a precomp back into the parent comp
// Args: {
//   "precompLayerName": "Precomp 1",  — name of the precomp layer to un-precompose
//   "precompLayerIndex": 3,           — or specify by index
//   "deletePrecomp": false            — delete the precomp item after extraction (default false)
// }
// Operates on the specified precomp layer in the active comp
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Un-PreCompose");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        // Find the precomp layer
        var precompLayer = null;

        if (args.precompLayerName) {
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === args.precompLayerName) {
                    precompLayer = comp.layer(i);
                    break;
                }
            }
        } else if (args.precompLayerIndex) {
            precompLayer = comp.layer(args.precompLayerIndex);
        } else {
            // Use first selected layer
            var sel = comp.selectedLayers;
            if (sel.length > 0) precompLayer = sel[0];
        }

        if (!precompLayer) {
            writeResult({ error: "Precomp layer not found. Provide precompLayerName, precompLayerIndex, or select a layer." });
            return;
        }

        if (!(precompLayer instanceof AVLayer) || !precompLayer.source || !(precompLayer.source instanceof CompItem)) {
            writeResult({ error: "Selected layer is not a precomp: " + precompLayer.name });
            return;
        }

        var precomp = precompLayer.source;
        var precompStartTime = precompLayer.startTime;
        var precompInPoint = precompLayer.inPoint;
        var insertIndex = precompLayer.index;

        // Get precomp layer's transform to apply to extracted layers
        var precompPos = precompLayer.property("ADBE Transform Group").property("ADBE Position").value;
        var precompScale = precompLayer.property("ADBE Transform Group").property("ADBE Scale").value;
        var precompRotation = precompLayer.property("ADBE Transform Group").property("ADBE Rotate Z").value;
        var precompOpacity = precompLayer.property("ADBE Transform Group").property("ADBE Opacity").value;

        var extractedCount = 0;
        var extractedNames = [];

        // Copy layers from precomp to parent comp
        // Work backwards so indices don't shift during copy
        for (var l = precomp.numLayers; l >= 1; l--) {
            var srcLayer = precomp.layer(l);

            // Copy the layer to parent comp
            srcLayer.copyToComp(comp);

            // The copied layer appears at index 1
            var newLayer = comp.layer(1);

            // Unlock to modify
            var wasLocked = newLayer.locked;
            newLayer.locked = false;

            // Adjust timing: offset by precomp's start time
            newLayer.startTime = newLayer.startTime + precompStartTime;

            // Move layer to correct position (after the precomp layer)
            newLayer.moveTo(insertIndex);

            newLayer.locked = wasLocked;

            extractedCount++;
            extractedNames.push(newLayer.name);
        }

        // Disable the original precomp layer
        precompLayer.enabled = false;

        // Optionally delete
        var deletePrecomp = args.deletePrecomp === true;
        if (deletePrecomp) {
            precompLayer.remove();
        }

        writeResult({
            success: true,
            message: "Extracted " + extractedCount + " layers from '" + precomp.name + "'" +
                     (deletePrecomp ? " (precomp layer removed)" : " (precomp layer disabled)"),
            count: extractedCount,
            layers: extractedNames,
            precompName: precomp.name
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
