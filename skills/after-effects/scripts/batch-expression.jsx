// batch-expression.jsx — Apply or remove expressions on selected layers in bulk
// Args: {
//   "property": "ADBE Opacity",    — matchName or display name of target property
//   "expression": "wiggle(2, 10)", — expression to apply (omit or "" to remove)
//   "mode": "apply"                — "apply" (set expression), "remove" (clear all expressions),
//                                    "enable", "disable"
// }
// Operates on selected layers in active comp
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Batch Expression");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var mode = args.mode || "apply";
        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            writeResult({ error: "Select layers to apply expressions to" });
            return;
        }

        var appliedCount = 0;
        var results = [];

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var isLocked = layer.locked;
            layer.locked = false;

            if (mode === "apply" && args.property) {
                // Apply expression to specific property
                var prop = findProperty(layer, args.property);
                if (prop && prop.canSetExpression) {
                    prop.expression = args.expression || "";
                    appliedCount++;
                    results.push({ layer: layer.name, property: prop.name, action: "applied" });
                }
            } else if (mode === "remove") {
                // Remove ALL expressions from layer
                var count = removeAllExpressions(layer);
                appliedCount += count;
                if (count > 0) {
                    results.push({ layer: layer.name, action: "removed " + count + " expressions" });
                }
            } else if (mode === "enable" || mode === "disable") {
                // Enable/disable all expressions on layer
                var count = toggleExpressions(layer, mode === "enable");
                appliedCount += count;
                if (count > 0) {
                    results.push({ layer: layer.name, action: mode + "d " + count + " expressions" });
                }
            } else if (mode === "apply" && !args.property) {
                writeResult({ error: "property arg required for apply mode" });
                return;
            }

            layer.locked = isLocked;
        }

        writeResult({
            success: true,
            message: mode + ": affected " + appliedCount + " properties across " + layers.length + " layers",
            mode: mode,
            count: appliedCount,
            results: results
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();

function findProperty(layer, name) {
    // Try common transform properties by matchName shorthand
    var shortcuts = {
        "position": "ADBE Position",
        "scale": "ADBE Scale",
        "rotation": "ADBE Rotate Z",
        "opacity": "ADBE Opacity",
        "anchorpoint": "ADBE Anchor Point"
    };

    var matchName = shortcuts[name.toLowerCase()] || name;

    // Try transform group first
    var xf = layer.property("ADBE Transform Group");
    if (xf) {
        var prop = xf.property(matchName);
        if (prop) return prop;
    }

    // Search full property tree
    return searchTree(layer, matchName);
}

function searchTree(group, name) {
    for (var i = 1; i <= group.numProperties; i++) {
        var prop = group.property(i);
        if (prop.matchName === name || prop.name === name) return prop;
        if (prop.propertyType === PropertyType.INDEXED_GROUP ||
            prop.propertyType === PropertyType.NAMED_GROUP) {
            var found = searchTree(prop, name);
            if (found) return found;
        }
    }
    return null;
}

function removeAllExpressions(propertyGroup) {
    var count = 0;
    for (var i = 1; i <= propertyGroup.numProperties; i++) {
        var prop = propertyGroup.property(i);
        if (prop.propertyType === PropertyType.PROPERTY) {
            if (prop.canSetExpression && prop.expression !== "") {
                prop.expression = "";
                count++;
            }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                   prop.propertyType === PropertyType.NAMED_GROUP) {
            count += removeAllExpressions(prop);
        }
    }
    return count;
}

function toggleExpressions(propertyGroup, enable) {
    var count = 0;
    for (var i = 1; i <= propertyGroup.numProperties; i++) {
        var prop = propertyGroup.property(i);
        if (prop.propertyType === PropertyType.PROPERTY) {
            if (prop.canSetExpression && prop.expression !== "") {
                prop.expressionEnabled = enable;
                count++;
            }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                   prop.propertyType === PropertyType.NAMED_GROUP) {
            count += toggleExpressions(prop, enable);
        }
    }
    return count;
}
