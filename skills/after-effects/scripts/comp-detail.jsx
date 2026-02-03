// comp-detail.jsx — Medium detail for a specific composition
// Args: { "compName": "Main Comp" } or uses active comp if no args
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

    var result = {
        comp: comp.name,
        width: comp.width,
        height: comp.height,
        duration: comp.duration,
        fps: comp.frameRate,
        bgColor: comp.bgColor,
        layers: []
    };

    for (var j = 1; j <= comp.numLayers; j++) {
        var layer = comp.layer(j);
        var layerInfo = {
            index: layer.index,
            name: layer.name,
            type: getLayerType(layer),
            enabled: layer.enabled,
            locked: layer.locked,
            shy: layer.shy,
            solo: layer.solo,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            startTime: layer.startTime,
            parent: layer.parent ? layer.parent.name : null,
            label: layer.label
        };

        // Blend mode (AVLayer only)
        if (layer instanceof AVLayer) {
            layerInfo.blendMode = getBlendModeName(layer.blendMode);
            layerInfo.trackMatteType = layer.trackMatteType;
            layerInfo.threeDLayer = layer.threeDLayer;
            layerInfo.motionBlur = layer.motionBlur;
        }

        // Effect count
        var effects = layer.property("ADBE Effect Parade");
        if (effects) {
            layerInfo.numEffects = effects.numProperties;
            layerInfo.effects = [];
            for (var e = 1; e <= effects.numProperties; e++) {
                layerInfo.effects.push({
                    name: effects.property(e).name,
                    matchName: effects.property(e).matchName,
                    enabled: effects.property(e).enabled
                });
            }
        }

        // Expression count
        var expressionCount = 0;
        function countExpressions(prop) {
            if (prop.propertyType === PropertyType.PROPERTY) {
                if (prop.expressionEnabled) expressionCount++;
            } else {
                for (var p = 1; p <= prop.numProperties; p++) {
                    countExpressions(prop.property(p));
                }
            }
        }
        countExpressions(layer);
        layerInfo.numExpressions = expressionCount;

        result.layers.push(layerInfo);
    }

    writeResult(result);
})();
