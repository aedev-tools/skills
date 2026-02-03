// project-overview.jsx — Smart project structure dump
// Default: summary mode — shows folder tree with item counts, lists comps, summarizes footage
// Args: { "mode": "full" } for the old full listing (use sparingly on large projects)
//       { "mode": "folder", "folderName": "Images" } to list contents of a specific folder
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var args = readArgs();
    var mode = args.mode || "summary";

    var result = {
        projectName: app.project.file ? app.project.file.name : "(unsaved)",
        projectPath: app.project.file ? app.project.file.fsName : null,
        totalItems: app.project.numItems,
        mode: mode
    };

    // --- SUMMARY MODE (default) ---
    // Shows: folder tree with counts, all comps listed, footage summarized by type/folder

    if (mode === "summary") {
        var totalComps = 0;
        var totalFootage = 0;
        var totalSolids = 0;
        var totalFolders = 0;
        var totalMissing = 0;

        // Count items globally
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) totalComps++;
            else if (item instanceof FolderItem) totalFolders++;
            else if (item instanceof FootageItem) {
                if (item.mainSource instanceof SolidSource) totalSolids++;
                else {
                    totalFootage++;
                    if (item.footageMissing) totalMissing++;
                }
            }
        }

        result.summary = {
            compositions: totalComps,
            footageFiles: totalFootage,
            solids: totalSolids,
            folders: totalFolders,
            missingFootage: totalMissing
        };

        // List ALL compositions (these are always useful to know)
        result.compositions = [];
        for (var c = 1; c <= app.project.numItems; c++) {
            var compItem = app.project.item(c);
            if (compItem instanceof CompItem) {
                result.compositions.push({
                    name: compItem.name,
                    width: compItem.width,
                    height: compItem.height,
                    duration: compItem.duration,
                    fps: compItem.frameRate,
                    numLayers: compItem.numLayers,
                    folder: compItem.parentFolder === app.project.rootFolder ? "(root)" : compItem.parentFolder.name
                });
            }
        }

        // Build folder tree with counts (NOT individual items)
        function summarizeFolder(folder, depth) {
            var info = {
                name: folder.name || "(root)",
                subfolders: [],
                counts: { comps: 0, footage: 0, solids: 0, other: 0, total: 0 }
            };

            for (var f = 1; f <= folder.numItems; f++) {
                var fi = folder.item(f);
                info.counts.total++;
                if (fi instanceof FolderItem) {
                    info.subfolders.push(summarizeFolder(fi, depth + 1));
                } else if (fi instanceof CompItem) {
                    info.counts.comps++;
                } else if (fi instanceof FootageItem) {
                    if (fi.mainSource instanceof SolidSource) info.counts.solids++;
                    else info.counts.footage++;
                } else {
                    info.counts.other++;
                }
            }
            return info;
        }

        result.folderTree = summarizeFolder(app.project.rootFolder, 0);

        // Group footage by file extension (show counts, not individual files)
        var extCounts = {};
        for (var e = 1; e <= app.project.numItems; e++) {
            var eItem = app.project.item(e);
            if (eItem instanceof FootageItem && eItem.mainSource instanceof FileSource) {
                var fileName = eItem.mainSource.file.name;
                var dotIdx = fileName.lastIndexOf(".");
                var ext = dotIdx > 0 ? fileName.substring(dotIdx).toLowerCase() : "(no ext)";
                if (!extCounts[ext]) extCounts[ext] = 0;
                extCounts[ext]++;
            }
        }
        result.footageByType = extCounts;
    }

    // --- FOLDER MODE ---
    // List contents of a specific folder

    else if (mode === "folder") {
        var targetName = args.folderName;
        var targetFolder = null;

        if (!targetName || targetName === "(root)") {
            targetFolder = app.project.rootFolder;
        } else {
            for (var fi2 = 1; fi2 <= app.project.numItems; fi2++) {
                var item2 = app.project.item(fi2);
                if (item2 instanceof FolderItem && item2.name === targetName) {
                    targetFolder = item2;
                    break;
                }
            }
        }

        if (!targetFolder) {
            writeResult({ error: "Folder not found: " + targetName });
            return;
        }

        result.folder = targetName || "(root)";
        result.items = [];
        for (var fi3 = 1; fi3 <= targetFolder.numItems; fi3++) {
            var fItem = targetFolder.item(fi3);
            var entry = { name: fItem.name };

            if (fItem instanceof FolderItem) {
                entry.type = "folder";
                entry.numItems = fItem.numItems;
            } else if (fItem instanceof CompItem) {
                entry.type = "comp";
                entry.width = fItem.width;
                entry.height = fItem.height;
                entry.duration = fItem.duration;
                entry.fps = fItem.frameRate;
                entry.numLayers = fItem.numLayers;
            } else if (fItem instanceof FootageItem) {
                if (fItem.mainSource instanceof SolidSource) {
                    entry.type = "solid";
                } else if (fItem.mainSource instanceof FileSource) {
                    entry.type = "footage";
                    entry.filePath = fItem.mainSource.file.fsName;
                    entry.footageMissing = fItem.footageMissing;
                } else {
                    entry.type = "placeholder";
                }
            }
            result.items.push(entry);
        }
    }

    // --- FULL MODE ---
    // Original full dump — use sparingly on large projects

    else if (mode === "full") {
        function processFolder(folder, depth) {
            var items = [];
            for (var i = 1; i <= folder.numItems; i++) {
                var item = folder.item(i);
                var entry = {
                    name: item.name,
                    id: item.id
                };

                if (item instanceof FolderItem) {
                    entry.type = "folder";
                    entry.children = processFolder(item, depth + 1);
                } else if (item instanceof CompItem) {
                    entry.type = "comp";
                    entry.width = item.width;
                    entry.height = item.height;
                    entry.duration = item.duration;
                    entry.fps = item.frameRate;
                    entry.numLayers = item.numLayers;
                } else if (item instanceof FootageItem) {
                    entry.type = "footage";
                    entry.hasVideo = item.hasVideo;
                    entry.hasAudio = item.hasAudio;
                    entry.duration = item.duration;
                    if (item.mainSource instanceof FileSource) {
                        entry.filePath = item.mainSource.file.fsName;
                    } else if (item.mainSource instanceof SolidSource) {
                        entry.type = "solid";
                        entry.color = item.mainSource.color;
                        entry.width = item.width;
                        entry.height = item.height;
                    } else if (item.mainSource instanceof PlaceholderSource) {
                        entry.type = "placeholder";
                    }
                    entry.footageMissing = item.footageMissing;
                }

                items.push(entry);
            }
            return items;
        }

        result.items = processFolder(app.project.rootFolder, 0);
    }

    writeResult(result);
})();
