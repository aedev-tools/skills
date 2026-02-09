// randomize-properties.jsx — Apply random values to properties on selected layers
// Args: {
//   "property": "rotation",    — "position", "rotation", "scale", "opacity", or matchName
//   "min": -15,                — minimum value
//   "max": 15,                 — maximum value
//   "mode": "absolute"         — "absolute" (set value) or "offset" (add to current value)
// }
// For position: min/max apply to both X and Y. Use minX/maxX/minY/maxY for independent axes.
// For scale: applies uniformly unless "uniform": false
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Randomize Properties");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            writeResult({ error: "Select layers to randomize" });
            return;
        }

        if (!args.property) {
            writeResult({ error: "Required arg: property (position, rotation, scale, opacity, or matchName)" });
            return;
        }

        var minVal = (args.min !== undefined) ? args.min : 0;
        var maxVal = (args.max !== undefined) ? args.max : 100;
        var mode = args.mode || "absolute";
        var uniform = (args.uniform !== false);

        // Map shorthand property names
        var propMap = {
            "position": "ADBE Position",
            "rotation": "ADBE Rotate Z",
            "scale": "ADBE Scale",
            "opacity": "ADBE Opacity",
            "anchorpoint": "ADBE Anchor Point"
        };

        var matchName = propMap[args.property.toLowerCase()] || args.property;
        var randomizedCount = 0;
        var results = [];

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var isLocked = layer.locked;
            layer.locked = false;

            var xf = layer.property("ADBE Transform Group");
            if (!xf) { layer.locked = isLocked; continue; }

            var prop = xf.property(matchName);
            if (!prop) { layer.locked = isLocked; continue; }

            var currentVal = prop.value;
            var newVal;

            if (currentVal instanceof Array) {
                // Multi-dimensional (position, scale, anchor point)
                newVal = [];
                var randBase = randomRange(minVal, maxVal);

                for (var d = 0; d < currentVal.length; d++) {
                    var dimMin = minVal;
                    var dimMax = maxVal;

                    // Support per-axis min/max for position
                    if (d === 0 && args.minX !== undefined) dimMin = args.minX;
                    if (d === 0 && args.maxX !== undefined) dimMax = args.maxX;
                    if (d === 1 && args.minY !== undefined) dimMin = args.minY;
                    if (d === 1 && args.maxY !== undefined) dimMax = args.maxY;
                    if (d === 2 && args.minZ !== undefined) dimMin = args.minZ;
                    if (d === 2 && args.maxZ !== undefined) dimMax = args.maxZ;

                    var randVal;
                    if (matchName === "ADBE Scale" && uniform) {
                        randVal = randBase; // same for all dimensions
                    } else {
                        randVal = randomRange(dimMin, dimMax);
                    }

                    if (mode === "offset") {
                        newVal.push(currentVal[d] + randVal);
                    } else {
                        newVal.push(randVal);
                    }
                }
            } else {
                // Single dimension (rotation, opacity)
                var randVal = randomRange(minVal, maxVal);
                if (mode === "offset") {
                    newVal = currentVal + randVal;
                } else {
                    newVal = randVal;
                }
            }

            prop.setValue(newVal);
            layer.locked = isLocked;
            randomizedCount++;

            if (results.length < 50) {
                results.push({
                    layer: layer.name,
                    oldValue: currentVal,
                    newValue: newVal
                });
            }
        }

        writeResult({
            success: true,
            message: "Randomized " + args.property + " on " + randomizedCount + " layers (range: " + minVal + " to " + maxVal + ")",
            property: args.property,
            count: randomizedCount,
            results: results
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();

function randomRange(min, max) {
    return min + Math.random() * (max - min);
}
