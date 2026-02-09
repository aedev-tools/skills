// layer-stagger.jsx — Offset selected layers in time to create stagger/cascade
// Args: {
//   "offset": 0.1,          — time offset between each layer (seconds or frames)
//   "unit": "seconds",      — "seconds" or "frames"
//   "direction": "forward",  — "forward" (top to bottom) or "reverse"
//   "mode": "inPoint"        — "inPoint" (shift in-point), "startTime" (shift start), "keyframes" (shift keys)
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Layer Stagger");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var layers = comp.selectedLayers;
        if (layers.length < 2) {
            writeResult({ error: "Select at least 2 layers to stagger" });
            return;
        }

        var offsetAmount = args.offset || 0.1;
        var unit = args.unit || "seconds";
        var direction = args.direction || "forward";
        var mode = args.mode || "inPoint";

        // Convert frames to seconds if needed
        if (unit === "frames") {
            offsetAmount = offsetAmount * comp.frameDuration;
        }

        // Sort layers by their current order (index)
        var sortedLayers = [];
        for (var i = 0; i < layers.length; i++) {
            sortedLayers.push(layers[i]);
        }
        // Sort by index ascending
        for (var a = 0; a < sortedLayers.length - 1; a++) {
            for (var b = a + 1; b < sortedLayers.length; b++) {
                if (sortedLayers[b].index < sortedLayers[a].index) {
                    var temp = sortedLayers[a];
                    sortedLayers[a] = sortedLayers[b];
                    sortedLayers[b] = temp;
                }
            }
        }

        if (direction === "reverse") {
            sortedLayers.reverse();
        }

        var staggered = [];

        for (var s = 0; s < sortedLayers.length; s++) {
            var layer = sortedLayers[s];
            var timeShift = offsetAmount * s;

            var isLocked = layer.locked;
            layer.locked = false;

            if (mode === "inPoint") {
                var baseIn = sortedLayers[0].inPoint;
                layer.startTime = layer.startTime + (baseIn + timeShift - layer.inPoint);
            } else if (mode === "startTime") {
                layer.startTime = layer.startTime + timeShift;
            } else if (mode === "keyframes") {
                // Shift all keyframes on this layer by timeShift
                shiftLayerKeyframes(layer, timeShift);
            }

            layer.locked = isLocked;

            staggered.push({
                name: layer.name,
                index: layer.index,
                offset: Math.round(timeShift * 1000) / 1000
            });
        }

        writeResult({
            success: true,
            message: "Staggered " + sortedLayers.length + " layers by " + offsetAmount +
                     (unit === "frames" ? " frames" : "s") + " each",
            layers: staggered
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();

function shiftLayerKeyframes(layer, timeShift) {
    shiftPropertyKeyframes(layer, timeShift);
}

function shiftPropertyKeyframes(propertyGroup, timeShift) {
    for (var i = 1; i <= propertyGroup.numProperties; i++) {
        var prop = propertyGroup.property(i);

        if (prop.propertyType === PropertyType.PROPERTY) {
            if (prop.numKeys > 0) {
                // Collect all keyframe data first
                var keys = [];
                for (var k = 1; k <= prop.numKeys; k++) {
                    keys.push({
                        time: prop.keyTime(k),
                        value: prop.keyValue(k)
                    });
                }
                // Remove existing keyframes (reverse order)
                for (var r = prop.numKeys; r >= 1; r--) {
                    prop.removeKey(r);
                }
                // Re-add shifted keyframes
                for (var n = 0; n < keys.length; n++) {
                    prop.setValueAtTime(keys[n].time + timeShift, keys[n].value);
                }
            }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                   prop.propertyType === PropertyType.NAMED_GROUP) {
            shiftPropertyKeyframes(prop, timeShift);
        }
    }
}
