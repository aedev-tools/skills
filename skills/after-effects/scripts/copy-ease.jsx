// copy-ease.jsx — Copy easing from one keyframe and apply to others
// Args: {
//   "sourceLayer": "Logo",           — layer name to copy ease from (optional, uses selection)
//   "sourceProperty": "Position",    — property matchName or name (optional, uses selection)
//   "sourceKeyIndex": 2,             — which keyframe to copy ease from (optional, uses last key)
//   "mode": "both"                   — "both", "in", "out" — which ease to copy/apply
// }
// If no source args: copies ease from first selected property's last keyframe.
// Applies to all other selected keyframes.
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Copy Ease");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var mode = args.mode || "both";
        var sourceEaseIn = null;
        var sourceEaseOut = null;
        var sourceInterpIn = null;
        var sourceInterpOut = null;

        // Get source ease
        if (args.sourceLayer && args.sourceProperty) {
            // Find specific layer and property
            var srcLayer = comp.layers.byName(args.sourceLayer);
            if (!srcLayer) {
                writeResult({ error: "Layer not found: " + args.sourceLayer });
                return;
            }

            var srcProp = findPropertyByName(srcLayer, args.sourceProperty);
            if (!srcProp || srcProp.numKeys === 0) {
                writeResult({ error: "Property not found or has no keyframes: " + args.sourceProperty });
                return;
            }

            var srcKeyIdx = args.sourceKeyIndex || srcProp.numKeys;
            sourceEaseIn = srcProp.keyInTemporalEase(srcKeyIdx);
            sourceEaseOut = srcProp.keyOutTemporalEase(srcKeyIdx);
            try {
                sourceInterpIn = srcProp.keyInInterpolationType(srcKeyIdx);
                sourceInterpOut = srcProp.keyOutInterpolationType(srcKeyIdx);
            } catch (e) {}
        } else {
            // Use first selected property's selected/last keyframe
            var selProps = comp.selectedProperties;
            if (selProps.length === 0) {
                writeResult({ error: "Select properties with keyframes, or provide sourceLayer + sourceProperty args" });
                return;
            }

            var srcProp = null;
            for (var sp = 0; sp < selProps.length; sp++) {
                if (selProps[sp].propertyType === PropertyType.PROPERTY && selProps[sp].numKeys > 0) {
                    srcProp = selProps[sp];
                    break;
                }
            }

            if (!srcProp) {
                writeResult({ error: "No selected property has keyframes" });
                return;
            }

            var selectedKeys = srcProp.selectedKeys;
            var srcKeyIdx = (selectedKeys && selectedKeys.length > 0) ? selectedKeys[0] : srcProp.numKeys;

            sourceEaseIn = srcProp.keyInTemporalEase(srcKeyIdx);
            sourceEaseOut = srcProp.keyOutTemporalEase(srcKeyIdx);
            try {
                sourceInterpIn = srcProp.keyInInterpolationType(srcKeyIdx);
                sourceInterpOut = srcProp.keyOutInterpolationType(srcKeyIdx);
            } catch (e) {}
        }

        if (!sourceEaseIn && !sourceEaseOut) {
            writeResult({ error: "Could not read easing from source keyframe" });
            return;
        }

        // Apply to all selected properties' selected keyframes
        var selProps = comp.selectedProperties;
        var appliedCount = 0;

        for (var p = 0; p < selProps.length; p++) {
            var prop = selProps[p];
            if (prop.propertyType !== PropertyType.PROPERTY) continue;
            if (prop.numKeys === 0) continue;

            var keyIndices = prop.selectedKeys;
            if (!keyIndices || keyIndices.length === 0) {
                // Apply to all keyframes
                keyIndices = [];
                for (var k = 1; k <= prop.numKeys; k++) {
                    keyIndices.push(k);
                }
            }

            // Get dimension count for this property
            var dims = 1;
            try {
                var testVal = prop.keyValue(1);
                if (testVal instanceof Array) dims = testVal.length;
            } catch (e) {}

            for (var ki = 0; ki < keyIndices.length; ki++) {
                var idx = keyIndices[ki];

                try {
                    // Build ease arrays matching this property's dimension count
                    var easeIn = buildEaseArray(sourceEaseIn, dims);
                    var easeOut = buildEaseArray(sourceEaseOut, dims);

                    if (sourceInterpIn !== null) {
                        prop.setInterpolationTypeAtKey(idx,
                            (mode === "both" || mode === "in") ? sourceInterpIn : prop.keyInInterpolationType(idx),
                            (mode === "both" || mode === "out") ? sourceInterpOut : prop.keyOutInterpolationType(idx));
                    }

                    if (mode === "both") {
                        prop.setTemporalEaseAtKey(idx, easeIn, easeOut);
                    } else if (mode === "in") {
                        var currentOut = prop.keyOutTemporalEase(idx);
                        prop.setTemporalEaseAtKey(idx, easeIn, currentOut);
                    } else if (mode === "out") {
                        var currentIn = prop.keyInTemporalEase(idx);
                        prop.setTemporalEaseAtKey(idx, currentIn, easeOut);
                    }

                    appliedCount++;
                } catch (e) {
                    // Some keyframes may not support easing (hold, etc)
                }
            }
        }

        writeResult({
            success: true,
            message: "Applied easing to " + appliedCount + " keyframes (mode: " + mode + ")",
            count: appliedCount,
            mode: mode
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();

function buildEaseArray(sourceEase, targetDims) {
    var result = [];
    for (var d = 0; d < targetDims; d++) {
        var srcIdx = (d < sourceEase.length) ? d : 0;
        result.push(new KeyframeEase(sourceEase[srcIdx].speed, sourceEase[srcIdx].influence));
    }
    return result;
}

function findPropertyByName(layer, name) {
    // Try matchName first, then display name
    var searchName = name;
    return searchPropertyTree(layer, searchName);
}

function searchPropertyTree(group, name) {
    for (var i = 1; i <= group.numProperties; i++) {
        var prop = group.property(i);
        if (prop.name === name || prop.matchName === name) return prop;
        if (prop.propertyType === PropertyType.INDEXED_GROUP ||
            prop.propertyType === PropertyType.NAMED_GROUP) {
            var found = searchPropertyTree(prop, name);
            if (found) return found;
        }
    }
    return null;
}
