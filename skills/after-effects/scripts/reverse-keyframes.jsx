// reverse-keyframes.jsx — Reverse keyframe values in time (play animation backwards)
// Args: {} — operates on selected properties in active comp
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Reverse Keyframes");
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var selProps = comp.selectedProperties;
        if (selProps.length === 0) {
            writeResult({ error: "Select properties with keyframes to reverse" });
            return;
        }

        var reversedCount = 0;
        var results = [];

        for (var p = 0; p < selProps.length; p++) {
            var prop = selProps[p];
            if (prop.propertyType !== PropertyType.PROPERTY) continue;
            if (prop.numKeys < 2) continue;

            // Collect all keyframe data
            var keys = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                keys.push({
                    time: prop.keyTime(k),
                    value: prop.keyValue(k)
                });

                // Try to capture easing
                try {
                    keys[keys.length - 1].easeIn = prop.keyInTemporalEase(k);
                    keys[keys.length - 1].easeOut = prop.keyOutTemporalEase(k);
                } catch (e) {}

                try {
                    keys[keys.length - 1].interpIn = prop.keyInInterpolationType(k);
                    keys[keys.length - 1].interpOut = prop.keyOutInterpolationType(k);
                } catch (e) {}
            }

            // Reverse the values while keeping times in place
            var times = [];
            var values = [];
            for (var t = 0; t < keys.length; t++) {
                times.push(keys[t].time);
                values.push(keys[keys.length - 1 - t].value);
            }

            // Remove existing keyframes (reverse order)
            for (var r = prop.numKeys; r >= 1; r--) {
                prop.removeKey(r);
            }

            // Re-add with reversed values
            for (var n = 0; n < times.length; n++) {
                prop.setValueAtTime(times[n], values[n]);
            }

            // Re-apply easing (reversed: swap in/out)
            for (var e = 0; e < keys.length; e++) {
                var srcIdx = keys.length - 1 - e;
                var keyIdx = e + 1;

                try {
                    if (keys[srcIdx].interpIn !== undefined) {
                        prop.setInterpolationTypeAtKey(keyIdx,
                            keys[srcIdx].interpOut || keys[srcIdx].interpIn,
                            keys[srcIdx].interpIn || keys[srcIdx].interpOut);
                    }
                } catch (e2) {}

                try {
                    if (keys[srcIdx].easeIn && keys[srcIdx].easeOut) {
                        prop.setTemporalEaseAtKey(keyIdx,
                            keys[srcIdx].easeOut, keys[srcIdx].easeIn);
                    }
                } catch (e3) {}
            }

            reversedCount++;
            results.push({
                property: prop.name,
                keyframes: keys.length
            });
        }

        writeResult({
            success: true,
            message: "Reversed keyframes on " + reversedCount + " properties",
            count: reversedCount,
            properties: results
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
