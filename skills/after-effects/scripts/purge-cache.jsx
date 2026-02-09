// purge-cache.jsx — Clear memory caches, disk cache, and free up resources
// Args: {
//   "memory": true,        — purge all RAM/memory caches (default true)
//   "disk": true,           — clear Media & Disk Cache files (default true)
//   "undo": true,           — purge undo history (default true)
//   "snapshots": true,      — purge snapshot caches (default true)
//   "dryRun": false         — preview disk cache size without deleting
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    try {
        var args = readArgs();
        var purgeMemory = (args.memory !== false);
        var purgeDisk = (args.disk !== false);
        var purgeUndo = (args.undo !== false);
        var purgeSnapshots = (args.snapshots !== false);
        var dryRun = args.dryRun === true;

        var result = {
            success: true,
            actions: []
        };

        // --- Memory caches ---
        if (purgeMemory && !dryRun) {
            app.purge(PurgeTarget.IMAGE_CACHES);
            result.actions.push({
                action: "purge_image_caches",
                message: "Purged image caches from memory"
            });
        }

        // --- Undo caches ---
        if (purgeUndo && !dryRun) {
            app.purge(PurgeTarget.UNDO_CACHES);
            result.actions.push({
                action: "purge_undo",
                message: "Purged undo history"
            });
        }

        // --- Snapshot caches ---
        if (purgeSnapshots && !dryRun) {
            app.purge(PurgeTarget.SNAPSHOT_CACHES);
            result.actions.push({
                action: "purge_snapshots",
                message: "Purged snapshot caches"
            });
        }

        // --- Purge all (covers everything in memory) ---
        if (purgeMemory && purgeUndo && purgeSnapshots && !dryRun) {
            app.purge(PurgeTarget.ALL_CACHES);
            // Replace individual actions with single ALL action
            result.actions = [{
                action: "purge_all_memory",
                message: "Purged all memory caches (image, undo, snapshots)"
            }];
        }

        // --- Disk cache ---
        if (purgeDisk) {
            var diskResult = handleDiskCache(dryRun);
            result.actions.push(diskResult);
        }

        // Summary
        var actionNames = [];
        for (var i = 0; i < result.actions.length; i++) {
            actionNames.push(result.actions[i].message);
        }
        result.message = dryRun
            ? "Dry run: " + actionNames.join("; ")
            : "Done: " + actionNames.join("; ");

        writeResult(result);
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    }
})();

function handleDiskCache(dryRun) {
    // Try to find the disk cache folder from AE preferences
    var cachePath = "";

    // Method 1: Read from AE preferences
    try {
        cachePath = app.preferences.getPrefAsString(
            "Media Cache", "Folder Path Clean [DB]",
            PREFType.PREF_Type_MACHINE_INDEPENDENT
        );
    } catch (e1) {}

    // Method 2: Try alternate pref key
    if (!cachePath) {
        try {
            cachePath = app.preferences.getPrefAsString(
                "Media Cache", "Folder Path [DB]",
                PREFType.PREF_Type_MACHINE_INDEPENDENT
            );
        } catch (e2) {}
    }

    // Method 3: Try common default locations
    if (!cachePath) {
        var defaultPaths = [];

        if ($.os.indexOf("Mac") !== -1) {
            defaultPaths.push("~/Library/Caches/Adobe/After Effects/");
            defaultPaths.push("~/Library/Application Support/Adobe/Common/Media Cache Files/");
            defaultPaths.push("~/Library/Application Support/Adobe/Common/Media Cache/");
        } else {
            defaultPaths.push("~/AppData/Local/Adobe/Common/Media Cache Files/");
            defaultPaths.push("~/AppData/Local/Adobe/Common/Media Cache/");
        }

        for (var d = 0; d < defaultPaths.length; d++) {
            var testFolder = new Folder(defaultPaths[d]);
            if (testFolder.exists) {
                cachePath = testFolder.fsName;
                break;
            }
        }
    }

    if (!cachePath) {
        return {
            action: "disk_cache",
            message: "Could not locate disk cache folder. Use Edit > Purge > All Memory & Disk Cache manually.",
            cachePath: null,
            error: true
        };
    }

    var cacheFolder = new Folder(cachePath);
    if (!cacheFolder.exists) {
        return {
            action: "disk_cache",
            message: "Disk cache folder does not exist: " + cachePath,
            cachePath: cachePath,
            error: true
        };
    }

    // Calculate cache size and file count
    var stats = getCacheFolderStats(cacheFolder);

    if (dryRun) {
        return {
            action: "disk_cache_preview",
            message: "Disk cache: " + formatBytes(stats.totalSize) + " in " + stats.fileCount + " files",
            cachePath: cachePath,
            totalSize: stats.totalSize,
            totalSizeFormatted: formatBytes(stats.totalSize),
            fileCount: stats.fileCount
        };
    }

    // Delete cache files
    var deleted = deleteCacheFiles(cacheFolder);

    return {
        action: "disk_cache_cleared",
        message: "Cleared " + formatBytes(deleted.bytesDeleted) + " (" + deleted.filesDeleted + " files) from disk cache",
        cachePath: cachePath,
        filesDeleted: deleted.filesDeleted,
        bytesDeleted: deleted.bytesDeleted,
        bytesDeletedFormatted: formatBytes(deleted.bytesDeleted),
        errors: deleted.errors
    };
}

function getCacheFolderStats(folder) {
    var totalSize = 0;
    var fileCount = 0;
    var files = folder.getFiles();

    for (var i = 0; i < files.length; i++) {
        if (files[i] instanceof Folder) {
            var sub = getCacheFolderStats(files[i]);
            totalSize += sub.totalSize;
            fileCount += sub.fileCount;
        } else {
            try {
                totalSize += files[i].length;
                fileCount++;
            } catch (e) {}
        }
    }

    return { totalSize: totalSize, fileCount: fileCount };
}

function deleteCacheFiles(folder) {
    var filesDeleted = 0;
    var bytesDeleted = 0;
    var errors = 0;
    var files = folder.getFiles();

    for (var i = 0; i < files.length; i++) {
        if (files[i] instanceof Folder) {
            var sub = deleteCacheFiles(files[i]);
            filesDeleted += sub.filesDeleted;
            bytesDeleted += sub.bytesDeleted;
            errors += sub.errors;
            // Try to remove empty folder
            try { files[i].remove(); } catch (e) {}
        } else {
            try {
                var size = files[i].length;
                if (files[i].remove()) {
                    filesDeleted++;
                    bytesDeleted += size;
                } else {
                    errors++;
                }
            } catch (e) {
                errors++;
            }
        }
    }

    return { filesDeleted: filesDeleted, bytesDeleted: bytesDeleted, errors: errors };
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    var units = ["B", "KB", "MB", "GB", "TB"];
    var i = 0;
    var val = bytes;
    while (val >= 1024 && i < units.length - 1) {
        val = val / 1024;
        i++;
    }
    return Math.round(val * 100) / 100 + " " + units[i];
}
