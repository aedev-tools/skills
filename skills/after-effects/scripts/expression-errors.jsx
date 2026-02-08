// expression-errors.jsx — Scan project for expression errors
// Args: { "scope": "project" } or { "compName": "Main Comp" }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var args = readArgs();
    var scope = args.scope || "project";

    var result = {
        totalExpressions: 0,
        totalErrors: 0,
        totalDisabled: 0,
        errors: [],
        disabled: []
    };

    function scanProperties(propertyGroup, compName, layerName, path) {
        for (var i = 1; i <= propertyGroup.numProperties; i++) {
            var prop = propertyGroup.property(i);

            if (prop.propertyType === PropertyType.PROPERTY) {
                if (prop.canSetExpression && prop.expression !== "") {
                    result.totalExpressions++;

                    if (!prop.expressionEnabled) {
                        result.totalDisabled++;
                        result.disabled.push({
                            comp: compName,
                            layer: layerName,
                            property: path + " > " + prop.name,
                            matchName: prop.matchName
                        });
                    } else if (prop.expressionError !== "") {
                        result.totalErrors++;
                        result.errors.push({
                            comp: compName,
                            layer: layerName,
                            property: path + " > " + prop.name,
                            matchName: prop.matchName,
                            error: prop.expressionError,
                            expression: prop.expression.substring(0, 200)
                        });
                    }
                }
            } else if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                       prop.propertyType === PropertyType.NAMED_GROUP) {
                scanProperties(prop, compName, layerName, path + " > " + prop.name);
            }
        }
    }

    function scanComp(comp) {
        for (var j = 1; j <= comp.numLayers; j++) {
            var layer = comp.layer(j);
            scanProperties(layer, comp.name, layer.name, "");
        }
    }

    if (scope === "project") {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) {
                scanComp(item);
            }
        }
    } else if (args.compName) {
        var found = false;
        for (var c = 1; c <= app.project.numItems; c++) {
            var cItem = app.project.item(c);
            if (cItem instanceof CompItem && cItem.name === args.compName) {
                scanComp(cItem);
                found = true;
                break;
            }
        }
        if (!found) {
            writeResult({ error: "Composition not found: " + args.compName });
            return;
        }
    } else {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }
        scanComp(comp);
    }

    writeResult(result);
})();
