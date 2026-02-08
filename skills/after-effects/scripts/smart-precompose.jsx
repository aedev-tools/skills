// smart-precompose.jsx — Precompose with auto-trimmed duration matching layer span
// Args: {
//   "name": "Precomp Name",  — name for new precomp (optional, auto-generates if omitted)
//   "trimToContent": true,    — trim precomp duration to match layer span (default true)
//   "moveAttributes": true    — move all attributes into new comp (default true)
// }
// Operates on selected layers in active comp
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Smart Precompose");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            writeResult({ error: "Select layers to precompose" });
            return;
        }

        var trimToContent = (args.trimToContent !== false);
        var moveAttributes = (args.moveAttributes !== false);

        // Calculate content time span
        var minIn = Infinity;
        var maxOut = -Infinity;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].inPoint < minIn) minIn = layers[i].inPoint;
            if (layers[i].outPoint > maxOut) maxOut = layers[i].outPoint;
        }

        // Collect layer indices (1-based)
        var indices = [];
        for (var j = 0; j < layers.length; j++) {
            indices.push(layers[j].index);
        }

        // Generate name if not provided
        var precompName = args.name;
        if (!precompName) {
            if (layers.length === 1) {
                precompName = layers[0].name + " Precomp";
            } else {
                precompName = "Precomp " + (comp.numLayers + 1);
            }
        }

        // Precompose
        var newComp = comp.layers.precompose(indices, precompName, moveAttributes);

        // Trim precomp duration to content span
        if (trimToContent && minIn < Infinity && maxOut > -Infinity) {
            var contentDuration = maxOut - minIn;
            if (contentDuration > 0 && contentDuration < comp.duration) {
                newComp.duration = contentDuration;
                newComp.workAreaStart = 0;
                newComp.workAreaDuration = contentDuration;

                // Adjust the precomp layer's start time to match original position
                // Find the precomp layer in the parent comp
                for (var l = 1; l <= comp.numLayers; l++) {
                    if (comp.layer(l).source === newComp) {
                        comp.layer(l).startTime = minIn;
                        break;
                    }
                }
            }
        }

        writeResult({
            success: true,
            message: "Precomposed " + indices.length + " layers into '" + precompName + "'" +
                     (trimToContent ? " (trimmed to " + (Math.round((maxOut - minIn) * 100) / 100) + "s)" : ""),
            precompName: precompName,
            layerCount: indices.length,
            duration: trimToContent ? (maxOut - minIn) : comp.duration
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
