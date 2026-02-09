// easing-presets.jsx — Apply professional easing to selected keyframes
// Args: {
//   "preset": "smooth",    — preset name (see list below)
//   "influence": 75,       — custom influence % for ease-in/out presets (optional)
//   "apply": "both"        — "both", "in", "out"
// }
// Presets: "smooth", "smooth-in", "smooth-out", "sharp", "sharp-in", "sharp-out",
//          "bounce", "elastic", "overshoot", "linear"
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Easing Presets");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var preset = args.preset || "smooth";
        var influence = args.influence || 75;
        var applyTo = args.apply || "both";

        // Define easing presets as [speed, influence] pairs
        var presets = {
            "smooth":      { in: [0, 75],  out: [0, 75] },
            "smooth-in":   { in: [0, 75],  out: null },
            "smooth-out":  { in: null,     out: [0, 75] },
            "sharp":       { in: [0, 33],  out: [0, 33] },
            "sharp-in":    { in: [0, 33],  out: null },
            "sharp-out":   { in: null,     out: [0, 33] },
            "snappy":      { in: [0, 90],  out: [0, 20] },
            "snappy-in":   { in: [0, 90],  out: null },
            "snappy-out":  { in: null,     out: [0, 20] },
            "linear":      { in: [0, 16.67], out: [0, 16.67] }
        };

        // Expression-based presets (applied as expressions, not keyframe easing)
        var expressionPresets = {
            "bounce": 'n = 0;\nif (numKeys > 0){\n  n = nearestKey(time).index;\n  if (key(n).time > time){n--;}\n}\nif (n == 0){t = 0;}else{t = time - key(n).time;}\nif (n > 0 && t < 1){\n  v = velocityAtTime(key(n).time - thisComp.frameDuration/10);\n  amp = .05;\n  freq = 4.0;\n  decay = 8.0;\n  value + v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t);\n}else{value}',
            "elastic": 'n = 0;\nif (numKeys > 0){\n  n = nearestKey(time).index;\n  if (key(n).time > time){n--;}\n}\nif (n == 0){t = 0;}else{t = time - key(n).time;}\nif (n > 0 && t < 1){\n  v = velocityAtTime(key(n).time - thisComp.frameDuration/10);\n  amp = .06;\n  freq = 3.0;\n  decay = 5.0;\n  value + v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t);\n}else{value}',
            "overshoot": 'n = 0;\nif (numKeys > 0){\n  n = nearestKey(time).index;\n  if (key(n).time > time){n--;}\n}\nif (n == 0){t = 0;}else{t = time - key(n).time;}\nif (n > 0 && t < 0.5){\n  v = velocityAtTime(key(n).time - thisComp.frameDuration/10);\n  amp = .04;\n  freq = 2.5;\n  decay = 6.0;\n  value + v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t);\n}else{value}'
        };

        var appliedCount = 0;
        var expressionApplied = false;

        // Check if this is an expression-based preset
        if (expressionPresets[preset]) {
            // Apply expression to selected properties
            var selProps = comp.selectedProperties;
            if (selProps.length === 0) {
                writeResult({ error: "Select properties to apply " + preset + " expression to" });
                return;
            }
            for (var p = 0; p < selProps.length; p++) {
                var prop = selProps[p];
                if (prop.propertyType === PropertyType.PROPERTY && prop.canSetExpression) {
                    prop.expression = expressionPresets[preset];
                    appliedCount++;
                }
            }
            expressionApplied = true;
        } else {
            // Keyframe easing preset
            var easeConfig = presets[preset];
            if (!easeConfig) {
                writeResult({ error: "Unknown preset: " + preset + ". Available: " + getKeys(presets).join(", ") + ", bounce, elastic, overshoot" });
                return;
            }

            // Override influence if provided
            if (args.influence) {
                if (easeConfig.in) easeConfig.in = [0, args.influence];
                if (easeConfig.out) easeConfig.out = [0, args.influence];
            }

            // Apply to selected keyframes on selected properties
            var selProps = comp.selectedProperties;
            if (selProps.length === 0) {
                writeResult({ error: "Select keyframes or properties to apply easing to" });
                return;
            }

            for (var sp = 0; sp < selProps.length; sp++) {
                var prop = selProps[sp];
                if (prop.propertyType !== PropertyType.PROPERTY) continue;
                if (prop.numKeys === 0) continue;

                // Get selected keyframes (or all if none selected)
                var keyIndices = prop.selectedKeys;
                if (!keyIndices || keyIndices.length === 0) {
                    keyIndices = [];
                    for (var k = 1; k <= prop.numKeys; k++) {
                        keyIndices.push(k);
                    }
                }

                // Determine number of dimensions for ease values
                var dims = 1;
                try {
                    var testVal = prop.keyValue(1);
                    if (testVal instanceof Array) dims = testVal.length;
                } catch (e) {}

                for (var ki = 0; ki < keyIndices.length; ki++) {
                    var idx = keyIndices[ki];

                    if (easeConfig.in && (applyTo === "both" || applyTo === "in")) {
                        var easeIn = [];
                        for (var d = 0; d < dims; d++) {
                            easeIn.push(new KeyframeEase(easeConfig.in[0], easeConfig.in[1]));
                        }
                        prop.setTemporalEaseAtKey(idx, easeIn);
                    }

                    if (easeConfig.out && (applyTo === "both" || applyTo === "out")) {
                        var easeOut = [];
                        for (var d2 = 0; d2 < dims; d2++) {
                            easeOut.push(new KeyframeEase(easeConfig.out[0], easeConfig.out[1]));
                        }
                        // setTemporalEaseAtKey takes (keyIndex, easeIn, easeOut)
                        // To set only out, we need to preserve the current in
                        var currentIn = prop.keyInTemporalEase(idx);
                        prop.setTemporalEaseAtKey(idx, currentIn, easeOut);
                    }

                    if (easeConfig.in && easeConfig.out && applyTo === "both") {
                        var bIn = [];
                        var bOut = [];
                        for (var d3 = 0; d3 < dims; d3++) {
                            bIn.push(new KeyframeEase(easeConfig.in[0], easeConfig.in[1]));
                            bOut.push(new KeyframeEase(easeConfig.out[0], easeConfig.out[1]));
                        }
                        prop.setTemporalEaseAtKey(idx, bIn, bOut);
                    }

                    appliedCount++;
                }
            }
        }

        writeResult({
            success: true,
            message: expressionApplied
                ? "Applied " + preset + " expression to " + appliedCount + " properties"
                : "Applied " + preset + " easing to " + appliedCount + " keyframes",
            preset: preset,
            count: appliedCount
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();

function getKeys(obj) {
    var keys = [];
    for (var k in obj) {
        keys.push(k);
    }
    return keys;
}
