// layer-detail.jsx — Deep detail for specific layers
// Args: { "compName": "Main Comp", "layerNames": ["Logo"] }
//   or: { "layerNames": ["Logo"] } (uses active comp)
//   or: {} (uses selected layers in active comp)
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var args = readArgs();
    var comp = null;

    if (args.compName) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === args.compName) {
                comp = item;
                break;
            }
        }
        if (!comp) {
            writeResult({ error: "Composition not found: " + args.compName });
            return;
        }
    } else {
        comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }
    }

    // Determine which layers to detail
    var layers = [];
    if (args.layerNames && args.layerNames.length > 0) {
        for (var n = 0; n < args.layerNames.length; n++) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === args.layerNames[n]) {
                    layers.push(comp.layer(j));
                    break;
                }
            }
        }
    } else {
        // Use selected layers
        var sel = comp.selectedLayers;
        for (var s = 0; s < sel.length; s++) {
            layers.push(sel[s]);
        }
    }

    if (layers.length === 0) {
        writeResult({ error: "No layers found or selected" });
        return;
    }

    // Extract keyframe data for a property
    function getPropertyDetail(prop) {
        var detail = {
            name: prop.name,
            matchName: prop.matchName,
            value: null,
            numKeys: prop.numKeys,
            keyframes: [],
            expressionEnabled: prop.expressionEnabled,
            expression: prop.expressionEnabled ? prop.expression : null
        };

        try { detail.value = prop.value; } catch(e) {}

        for (var k = 1; k <= prop.numKeys; k++) {
            var kf = {
                time: prop.keyTime(k),
                value: prop.keyValue(k)
            };

            try {
                kf.inInterpolationType = prop.keyInInterpolationType(k);
                kf.outInterpolationType = prop.keyOutInterpolationType(k);
            } catch(e2) {}

            try {
                kf.temporalEaseIn = [];
                kf.temporalEaseOut = [];
                var easeIn = prop.keyInTemporalEase(k);
                var easeOut = prop.keyOutTemporalEase(k);
                for (var ei = 0; ei < easeIn.length; ei++) {
                    kf.temporalEaseIn.push({
                        speed: easeIn[ei].speed,
                        influence: easeIn[ei].influence
                    });
                }
                for (var eo = 0; eo < easeOut.length; eo++) {
                    kf.temporalEaseOut.push({
                        speed: easeOut[eo].speed,
                        influence: easeOut[eo].influence
                    });
                }
            } catch(e3) {}

            detail.keyframes.push(kf);
        }

        return detail;
    }

    // Recursively extract property group
    function getGroupDetail(group) {
        var detail = {
            name: group.name,
            matchName: group.matchName,
            properties: []
        };
        for (var p = 1; p <= group.numProperties; p++) {
            var prop = group.property(p);
            if (prop.propertyType === PropertyType.PROPERTY) {
                detail.properties.push(getPropertyDetail(prop));
            } else {
                detail.properties.push(getGroupDetail(prop));
            }
        }
        return detail;
    }

    var result = {
        comp: comp.name,
        layers: []
    };

    for (var l = 0; l < layers.length; l++) {
        var layer = layers[l];
        var layerData = {
            index: layer.index,
            name: layer.name,
            type: getLayerType(layer)
        };

        // Transform group
        var xf = layer.property("ADBE Transform Group");
        if (xf) {
            layerData.transform = {};
            var transformProps = [
                "ADBE Anchor Point", "ADBE Position", "ADBE Scale",
                "ADBE Rotate Z", "ADBE Opacity"
            ];
            // Add 3D props if applicable
            if (layer instanceof AVLayer && layer.threeDLayer) {
                transformProps.push("ADBE Rotate X", "ADBE Rotate Y", "ADBE Orientation");
            }
            for (var t = 0; t < transformProps.length; t++) {
                var tfProp = xf.property(transformProps[t]);
                if (tfProp) {
                    layerData.transform[transformProps[t]] = getPropertyDetail(tfProp);
                }
            }
        }

        // Effects
        var effects = layer.property("ADBE Effect Parade");
        if (effects && effects.numProperties > 0) {
            layerData.effects = [];
            for (var e = 1; e <= effects.numProperties; e++) {
                layerData.effects.push(getGroupDetail(effects.property(e)));
            }
        }

        // Masks
        var masks = layer.property("ADBE Mask Parade");
        if (masks && masks.numProperties > 0) {
            layerData.masks = [];
            for (var m = 1; m <= masks.numProperties; m++) {
                layerData.masks.push(getGroupDetail(masks.property(m)));
            }
        }

        // Text layer source text
        if (layer instanceof TextLayer) {
            try {
                var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
                if (textProp) {
                    var textDoc = textProp.value;
                    layerData.text = {
                        text: textDoc.text,
                        fontSize: textDoc.fontSize,
                        font: textDoc.font,
                        fillColor: textDoc.fillColor,
                        strokeColor: textDoc.strokeColor,
                        justification: textDoc.justification
                    };
                }
            } catch(e4) {}
        }

        result.layers.push(layerData);
    }

    writeResult(result);
})();
