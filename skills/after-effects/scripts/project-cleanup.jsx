// project-cleanup.jsx — Remove unused footage, consolidate solids, clean up project
// Args: {
//   "removeUnused": true,      — remove unused footage items
//   "consolidateSolids": true,  — merge duplicate solids (same size + color)
//   "removeEmptyFolders": true, — remove empty folders
//   "dryRun": true              — preview without making changes
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Project Cleanup");
    try {
        var args = readArgs();
        var removeUnused = (args.removeUnused !== false);
        var consolidateSolids = (args.consolidateSolids !== false);
        var removeEmptyFolders = (args.removeEmptyFolders !== false);
        var dryRun = args.dryRun === true;

        var result = {
            success: true,
            dryRun: dryRun,
            actions: []
        };

        // --- Pass 1: Remove unused footage ---
        if (removeUnused) {
            var unusedItems = [];
            for (var i = app.project.numItems; i >= 1; i--) {
                var item = app.project.item(i);
                if (item instanceof FootageItem && item.usedIn.length === 0) {
                    unusedItems.push({
                        name: item.name,
                        type: (item.mainSource instanceof SolidSource) ? "solid" : "footage"
                    });
                    if (!dryRun) {
                        item.remove();
                    }
                }
            }
            if (unusedItems.length > 0) {
                result.actions.push({
                    action: "removeUnused",
                    count: unusedItems.length,
                    items: unusedItems
                });
            }
        }

        // --- Pass 2: Consolidate duplicate solids ---
        if (consolidateSolids) {
            var solidGroups = {};

            // Group solids by dimensions + color
            for (var s = 1; s <= app.project.numItems; s++) {
                var sItem = app.project.item(s);
                if (!(sItem instanceof FootageItem)) continue;
                if (!(sItem.mainSource instanceof SolidSource)) continue;

                var color = sItem.mainSource.color;
                var key = sItem.width + "x" + sItem.height + "_" +
                          Math.round(color[0] * 255) + "," +
                          Math.round(color[1] * 255) + "," +
                          Math.round(color[2] * 255);

                if (!solidGroups[key]) {
                    solidGroups[key] = [];
                }
                solidGroups[key].push(sItem);
            }

            var consolidatedCount = 0;
            var consolidatedDetails = [];

            for (var gKey in solidGroups) {
                var group = solidGroups[gKey];
                if (group.length <= 1) continue;

                var keepSolid = group[0]; // keep the first one
                for (var g = 1; g < group.length; g++) {
                    var dupSolid = group[g];

                    if (!dryRun) {
                        // Relink all usages to the kept solid
                        var compsUsing = dupSolid.usedIn;
                        for (var cu = 0; cu < compsUsing.length; cu++) {
                            var uComp = compsUsing[cu];
                            for (var ul = 1; ul <= uComp.numLayers; ul++) {
                                var uLayer = uComp.layer(ul);
                                if (uLayer instanceof AVLayer && uLayer.source === dupSolid) {
                                    var isLocked = uLayer.locked;
                                    uLayer.locked = false;
                                    uLayer.replaceSource(keepSolid, false);
                                    uLayer.locked = isLocked;
                                }
                            }
                        }
                        dupSolid.remove();
                    }

                    consolidatedCount++;
                    if (consolidatedDetails.length < 30) {
                        consolidatedDetails.push({
                            removed: dupSolid.name,
                            keptAs: keepSolid.name,
                            spec: gKey
                        });
                    }
                }
            }

            if (consolidatedCount > 0) {
                result.actions.push({
                    action: "consolidateSolids",
                    count: consolidatedCount,
                    items: consolidatedDetails
                });
            }
        }

        // --- Pass 3: Remove empty folders ---
        if (removeEmptyFolders) {
            var emptyFolders = [];
            // May need multiple passes since removing items from a folder may empty its parent
            var removedThisPass = 1;
            while (removedThisPass > 0) {
                removedThisPass = 0;
                for (var f = app.project.numItems; f >= 1; f--) {
                    var fItem = app.project.item(f);
                    if (fItem instanceof FolderItem && fItem.numItems === 0) {
                        emptyFolders.push({ name: fItem.name });
                        if (!dryRun) {
                            fItem.remove();
                        }
                        removedThisPass++;
                    }
                }
                if (dryRun) break; // only one pass in dry run
            }
            if (emptyFolders.length > 0) {
                result.actions.push({
                    action: "removeEmptyFolders",
                    count: emptyFolders.length,
                    items: emptyFolders
                });
            }
        }

        // Summary
        var totalActions = 0;
        for (var a = 0; a < result.actions.length; a++) {
            totalActions += result.actions[a].count;
        }
        result.totalCleaned = totalActions;
        result.message = dryRun
            ? "Dry run: would clean " + totalActions + " items"
            : "Cleaned " + totalActions + " items from project";

        writeResult(result);
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
