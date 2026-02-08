// relink-footage.jsx — Batch-relink missing footage by searching directories
// Args: {
//   "searchPaths": ["/path/to/footage", "/other/path"],  — directories to search
//   "recursive": true,    — search subdirectories (default true)
//   "dryRun": true        — preview without making changes
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Relink Footage");
    try {
        var args = readArgs();

        if (!args.searchPaths || args.searchPaths.length === 0) {
            writeResult({ error: "Required arg: searchPaths (array of directory paths to search)" });
            return;
        }

        var searchPaths = args.searchPaths;
        var recursive = (args.recursive !== false);
        var dryRun = args.dryRun === true;

        // Build a map of filename -> full path by scanning search directories
        var fileMap = {}; // filename (lowercase) -> File object

        for (var sp = 0; sp < searchPaths.length; sp++) {
            var searchFolder = new Folder(searchPaths[sp]);
            if (!searchFolder.exists) continue;
            scanFolder(searchFolder, fileMap, recursive);
        }

        // Find missing footage and try to relink
        var missingCount = 0;
        var relinkedCount = 0;
        var notFound = [];
        var relinked = [];

        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (!(item instanceof FootageItem)) continue;
            if (!item.footageMissing) continue;
            if (!(item.mainSource instanceof FileSource)) continue;

            missingCount++;
            var originalFile = item.mainSource.file;
            var fileName = originalFile.name.toLowerCase();

            if (fileMap[fileName]) {
                if (!dryRun) {
                    item.replace(fileMap[fileName]);
                }
                relinkedCount++;
                if (relinked.length < 50) {
                    relinked.push({
                        name: item.name,
                        oldPath: originalFile.fsName,
                        newPath: fileMap[fileName].fsName
                    });
                }
            } else {
                if (notFound.length < 50) {
                    notFound.push({
                        name: item.name,
                        fileName: originalFile.name,
                        oldPath: originalFile.fsName
                    });
                }
            }
        }

        writeResult({
            success: true,
            dryRun: dryRun,
            message: dryRun
                ? "Found " + relinkedCount + " of " + missingCount + " missing items in search paths (no changes made)"
                : "Relinked " + relinkedCount + " of " + missingCount + " missing footage items",
            missingCount: missingCount,
            relinkedCount: relinkedCount,
            stillMissing: missingCount - relinkedCount,
            relinked: relinked,
            notFound: notFound,
            searchedFiles: countKeys(fileMap)
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();

function scanFolder(folder, fileMap, recursive) {
    var files = folder.getFiles();
    for (var i = 0; i < files.length; i++) {
        if (files[i] instanceof Folder) {
            if (recursive) {
                scanFolder(files[i], fileMap, recursive);
            }
        } else {
            var name = files[i].name.toLowerCase();
            if (!fileMap[name]) {
                fileMap[name] = files[i];
            }
        }
    }
}

function countKeys(obj) {
    var count = 0;
    for (var k in obj) count++;
    return count;
}
