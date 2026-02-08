// project-audit.jsx — Comprehensive project health check
// Args: { "checks": ["unused", "missing", "expressions", "duplicates", "fonts", "empty"] }
//   Default: all checks enabled
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var args = readArgs();
    var checks = args.checks || ["unused", "missing", "expressions", "duplicates", "fonts", "empty"];

    function hasCheck(name) {
        for (var i = 0; i < checks.length; i++) {
            if (checks[i] === name) return true;
        }
        return false;
    }

    var result = {
        projectName: app.project.file ? app.project.file.name : "(unsaved)",
        totalItems: app.project.numItems,
        issues: []
    };

    // --- Check: Unused footage ---
    if (hasCheck("unused")) {
        var unusedCount = 0;
        var unusedItems = [];
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof FootageItem) {
                if (item.usedIn.length === 0) {
                    unusedCount++;
                    if (unusedItems.length < 30) {
                        unusedItems.push({
                            name: item.name,
                            type: (item.mainSource instanceof SolidSource) ? "solid" : "footage"
                        });
                    }
                }
            }
        }
        if (unusedCount > 0) {
            result.issues.push({
                check: "unused",
                severity: "warning",
                message: unusedCount + " unused footage/solid items found",
                count: unusedCount,
                items: unusedItems
            });
        }
    }

    // --- Check: Missing footage ---
    if (hasCheck("missing")) {
        var missingCount = 0;
        var missingItems = [];
        for (var m = 1; m <= app.project.numItems; m++) {
            var mItem = app.project.item(m);
            if (mItem instanceof FootageItem && mItem.footageMissing) {
                missingCount++;
                if (missingItems.length < 30) {
                    var filePath = "";
                    try {
                        if (mItem.mainSource instanceof FileSource) {
                            filePath = mItem.mainSource.file.fsName;
                        }
                    } catch (e) {}
                    missingItems.push({
                        name: mItem.name,
                        path: filePath
                    });
                }
            }
        }
        if (missingCount > 0) {
            result.issues.push({
                check: "missing",
                severity: "error",
                message: missingCount + " missing footage items",
                count: missingCount,
                items: missingItems
            });
        }
    }

    // --- Check: Expression errors ---
    if (hasCheck("expressions")) {
        var exprErrorCount = 0;
        var exprErrors = [];

        function scanExprErrors(propertyGroup, compName, layerName) {
            for (var p = 1; p <= propertyGroup.numProperties; p++) {
                var prop = propertyGroup.property(p);
                if (prop.propertyType === PropertyType.PROPERTY) {
                    if (prop.canSetExpression && prop.expressionEnabled && prop.expressionError !== "") {
                        exprErrorCount++;
                        if (exprErrors.length < 30) {
                            exprErrors.push({
                                comp: compName,
                                layer: layerName,
                                property: prop.name,
                                error: prop.expressionError
                            });
                        }
                    }
                } else if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                           prop.propertyType === PropertyType.NAMED_GROUP) {
                    scanExprErrors(prop, compName, layerName);
                }
            }
        }

        for (var e = 1; e <= app.project.numItems; e++) {
            var eItem = app.project.item(e);
            if (!(eItem instanceof CompItem)) continue;
            for (var el = 1; el <= eItem.numLayers; el++) {
                scanExprErrors(eItem.layer(el), eItem.name, eItem.layer(el).name);
            }
        }

        if (exprErrorCount > 0) {
            result.issues.push({
                check: "expressions",
                severity: "error",
                message: exprErrorCount + " expression errors found",
                count: exprErrorCount,
                items: exprErrors
            });
        }
    }

    // --- Check: Duplicate solids ---
    if (hasCheck("duplicates")) {
        var solidGroups = {};
        for (var d = 1; d <= app.project.numItems; d++) {
            var dItem = app.project.item(d);
            if (dItem instanceof FootageItem && dItem.mainSource instanceof SolidSource) {
                var color = dItem.mainSource.color;
                var key = dItem.width + "x" + dItem.height + "_" +
                          Math.round(color[0] * 255) + "," +
                          Math.round(color[1] * 255) + "," +
                          Math.round(color[2] * 255);
                if (!solidGroups[key]) {
                    solidGroups[key] = [];
                }
                solidGroups[key].push(dItem.name);
            }
        }

        var dupCount = 0;
        var dupGroups = [];
        for (var gKey in solidGroups) {
            if (solidGroups[gKey].length > 1) {
                dupCount += solidGroups[gKey].length - 1;
                dupGroups.push({
                    spec: gKey,
                    names: solidGroups[gKey],
                    duplicates: solidGroups[gKey].length - 1
                });
            }
        }

        if (dupCount > 0) {
            result.issues.push({
                check: "duplicates",
                severity: "warning",
                message: dupCount + " duplicate solids found across " + dupGroups.length + " groups",
                count: dupCount,
                items: dupGroups
            });
        }
    }

    // --- Check: Font issues (missing/substituted) ---
    if (hasCheck("fonts")) {
        var fontIssues = [];

        for (var f = 1; f <= app.project.numItems; f++) {
            var fItem = app.project.item(f);
            if (!(fItem instanceof CompItem)) continue;

            for (var fl = 1; fl <= fItem.numLayers; fl++) {
                var fLayer = fItem.layer(fl);
                if (!(fLayer instanceof TextLayer)) continue;

                var textProp = fLayer.property("ADBE Text Properties").property("ADBE Text Document");
                if (!textProp) continue;

                var textDoc = textProp.value;
                // Check via fontObject if available (AE 24.0+)
                try {
                    if (textDoc.fontObject && textDoc.fontObject.isSubstitute) {
                        fontIssues.push({
                            comp: fItem.name,
                            layer: fLayer.name,
                            font: textDoc.font,
                            status: "missing/substituted"
                        });
                    }
                } catch (e) {
                    // fontObject not available in older AE — skip this check
                }
            }
        }

        if (fontIssues.length > 0) {
            result.issues.push({
                check: "fonts",
                severity: "warning",
                message: fontIssues.length + " text layers with missing/substituted fonts",
                count: fontIssues.length,
                items: fontIssues
            });
        }
    }

    // --- Check: Empty folders ---
    if (hasCheck("empty")) {
        var emptyFolders = [];
        for (var ef = 1; ef <= app.project.numItems; ef++) {
            var efItem = app.project.item(ef);
            if (efItem instanceof FolderItem && efItem.numItems === 0) {
                emptyFolders.push({ name: efItem.name });
            }
        }
        if (emptyFolders.length > 0) {
            result.issues.push({
                check: "empty",
                severity: "info",
                message: emptyFolders.length + " empty folders",
                count: emptyFolders.length,
                items: emptyFolders
            });
        }
    }

    // --- Summary ---
    var totalIssues = 0;
    for (var s = 0; s < result.issues.length; s++) {
        totalIssues += result.issues[s].count;
    }
    result.totalIssues = totalIssues;
    result.healthScore = (totalIssues === 0) ? "clean" :
                         (totalIssues < 5) ? "minor issues" :
                         (totalIssues < 20) ? "needs cleanup" : "messy";

    writeResult(result);
})();
