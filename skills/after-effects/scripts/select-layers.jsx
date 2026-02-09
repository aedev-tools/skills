// select-layers.jsx — Select layers by type, attribute, or label color
// Args: {
//   "type": "text",         — "text", "shape", "solid", "null", "adjustment", "camera",
//                              "light", "precomp", "footage", "audio", "guide"
//   "label": 1,             — label color index (1-16)
//   "locked": true,         — select locked layers
//   "disabled": true,       — select disabled (eye off) layers
//   "has3d": true,          — select 3D layers
//   "hasExpressions": true, — select layers with any expression
//   "hasEffects": true,     — select layers with effects
//   "nameContains": "BG",   — select layers whose name contains this string
//   "invert": false         — invert selection
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var args = readArgs();
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return;
    }

    var invert = args.invert === true;
    var selectedNames = [];

    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        var matches = false;

        // Type filter
        if (args.type) {
            var layerType = getLayerType(layer);
            if (layerType === args.type) matches = true;
        }

        // Label filter
        if (args.label !== undefined) {
            if (layer.label === args.label) matches = true;
        }

        // Locked filter
        if (args.locked !== undefined) {
            if (layer.locked === args.locked) matches = true;
        }

        // Disabled filter
        if (args.disabled !== undefined) {
            if (layer.enabled === !args.disabled) matches = true;
        }

        // 3D filter
        if (args.has3d !== undefined) {
            if (layer instanceof AVLayer && layer.threeDLayer === args.has3d) matches = true;
        }

        // Has expressions filter
        if (args.hasExpressions === true) {
            if (layerHasExpressions(layer)) matches = true;
        }

        // Has effects filter
        if (args.hasEffects === true) {
            var effects = layer.property("ADBE Effect Parade");
            if (effects && effects.numProperties > 0) matches = true;
        }

        // Name contains filter
        if (args.nameContains) {
            if (layer.name.toLowerCase().indexOf(args.nameContains.toLowerCase()) !== -1) {
                matches = true;
            }
        }

        // If no filter args provided, don't select anything
        if (!args.type && args.label === undefined && args.locked === undefined &&
            args.disabled === undefined && args.has3d === undefined &&
            !args.hasExpressions && !args.hasEffects && !args.nameContains) {
            writeResult({ error: "Provide at least one filter: type, label, locked, disabled, has3d, hasExpressions, hasEffects, nameContains" });
            return;
        }

        if (invert) matches = !matches;

        layer.selected = matches;
        if (matches) {
            selectedNames.push({ name: layer.name, index: layer.index });
        }
    }

    writeResult({
        success: true,
        message: "Selected " + selectedNames.length + " of " + comp.numLayers + " layers",
        count: selectedNames.length,
        layers: selectedNames
    });
})();

function layerHasExpressions(layer) {
    return checkPropsForExpressions(layer);
}

function checkPropsForExpressions(propertyGroup) {
    for (var i = 1; i <= propertyGroup.numProperties; i++) {
        var prop = propertyGroup.property(i);
        if (prop.propertyType === PropertyType.PROPERTY) {
            if (prop.canSetExpression && prop.expression !== "") return true;
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                   prop.propertyType === PropertyType.NAMED_GROUP) {
            if (checkPropsForExpressions(prop)) return true;
        }
    }
    return false;
}
