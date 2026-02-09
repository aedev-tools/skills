// expression-replace.jsx — Find and replace text inside expressions project-wide
// Args: {
//   "find": "thisComp.layer(\"Old Name\")",
//   "replace": "thisComp.layer(\"New Name\")",
//   "scope": "project",    — "project" or "comp" (active comp)
//   "dryRun": true          — preview without making changes
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Expression Replace");
    try {
        var args = readArgs();

        if (!args.find) {
            writeResult({ error: "Required arg: find (text to search for in expressions)" });
            return;
        }

        var findStr = args.find;
        var replaceStr = (args.replace !== undefined) ? args.replace : "";
        var scope = args.scope || "project";
        var dryRun = args.dryRun === true;

        var totalExpressions = 0;
        var matchCount = 0;
        var matches = [];

        function scanProperties(propertyGroup, compName, layerName) {
            for (var i = 1; i <= propertyGroup.numProperties; i++) {
                var prop = propertyGroup.property(i);

                if (prop.propertyType === PropertyType.PROPERTY) {
                    if (prop.canSetExpression && prop.expression !== "") {
                        totalExpressions++;

                        if (prop.expression.indexOf(findStr) !== -1) {
                            matchCount++;

                            var oldExpr = prop.expression;
                            var newExpr = oldExpr.split(findStr).join(replaceStr);

                            if (matches.length < 50) {
                                matches.push({
                                    comp: compName,
                                    layer: layerName,
                                    property: prop.name,
                                    matchName: prop.matchName,
                                    oldSnippet: oldExpr.substring(0, 150),
                                    newSnippet: newExpr.substring(0, 150)
                                });
                            }

                            if (!dryRun) {
                                prop.expression = newExpr;
                            }
                        }
                    }
                } else if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                           prop.propertyType === PropertyType.NAMED_GROUP) {
                    scanProperties(prop, compName, layerName);
                }
            }
        }

        function scanComp(comp) {
            for (var j = 1; j <= comp.numLayers; j++) {
                var layer = comp.layer(j);
                var isLocked = layer.locked;
                if (!dryRun) layer.locked = false;
                scanProperties(layer, comp.name, layer.name);
                if (!dryRun) layer.locked = isLocked;
            }
        }

        if (scope === "project") {
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem) {
                    scanComp(item);
                }
            }
        } else {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                writeResult({ error: "No active composition" });
                return;
            }
            scanComp(comp);
        }

        writeResult({
            success: true,
            dryRun: dryRun,
            message: dryRun
                ? "Found '" + findStr + "' in " + matchCount + " expressions (of " + totalExpressions + " total)"
                : "Replaced '" + findStr + "' in " + matchCount + " expressions",
            totalExpressions: totalExpressions,
            matchCount: matchCount,
            matches: matches
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
