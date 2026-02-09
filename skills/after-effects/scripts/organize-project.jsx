// organize-project.jsx — Auto-sort project panel items into folders by type
// Args: {
//   "structure": "by-type",    — "by-type" (Comps, Footage, Solids, Audio) or "by-extension"
//   "prefix": "_",             — folder name prefix (default "_" so they sort to top)
//   "rootOnly": true           — only organize items at root level (default true)
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Organize Project");
    try {
        var args = readArgs();
        var structure = args.structure || "by-type";
        var prefix = (args.prefix !== undefined) ? args.prefix : "_";
        var rootOnly = (args.rootOnly !== false);

        var movedCount = 0;
        var folderMap = {}; // category name -> FolderItem

        function getOrCreateFolder(name) {
            var fullName = prefix + name;
            if (!folderMap[fullName]) {
                // Check if folder already exists at root
                for (var f = 1; f <= app.project.numItems; f++) {
                    var fi = app.project.item(f);
                    if (fi instanceof FolderItem && fi.name === fullName &&
                        fi.parentFolder === app.project.rootFolder) {
                        folderMap[fullName] = fi;
                        return fi;
                    }
                }
                // Create new folder
                folderMap[fullName] = app.project.items.addFolder(fullName);
            }
            return folderMap[fullName];
        }

        function getFileExtension(fileName) {
            var dotIdx = fileName.lastIndexOf(".");
            if (dotIdx > 0) {
                return fileName.substring(dotIdx + 1).toLowerCase();
            }
            return "";
        }

        function categorizeByType(item) {
            if (item instanceof CompItem) {
                return "Comps";
            } else if (item instanceof FootageItem) {
                if (item.mainSource instanceof SolidSource) {
                    return "Solids";
                } else if (item.mainSource instanceof FileSource) {
                    if (!item.hasVideo && item.hasAudio) {
                        return "Audio";
                    }
                    // Check if image (still)
                    if (item.mainSource.isStill) {
                        return "Images";
                    }
                    return "Footage";
                } else if (item.mainSource instanceof PlaceholderSource) {
                    return "Placeholders";
                }
                return "Footage";
            }
            return null; // folders stay where they are
        }

        function categorizeByExtension(item) {
            if (item instanceof CompItem) {
                return "Comps";
            } else if (item instanceof FootageItem) {
                if (item.mainSource instanceof SolidSource) {
                    return "Solids";
                } else if (item.mainSource instanceof FileSource) {
                    var ext = getFileExtension(item.mainSource.file.name);
                    // Group by common categories
                    var imageExts = ["png", "jpg", "jpeg", "gif", "tif", "tiff", "psd", "ai", "svg", "bmp", "webp", "exr"];
                    var videoExts = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "m4v", "webm", "mxf", "r3d"];
                    var audioExts = ["mp3", "wav", "aac", "m4a", "ogg", "flac", "aif", "aiff"];
                    var seqExts = ["dpx", "cin", "tga"];

                    for (var ie = 0; ie < imageExts.length; ie++) {
                        if (ext === imageExts[ie]) return "Images";
                    }
                    for (var ve = 0; ve < videoExts.length; ve++) {
                        if (ext === videoExts[ve]) return "Video";
                    }
                    for (var ae = 0; ae < audioExts.length; ae++) {
                        if (ext === audioExts[ae]) return "Audio";
                    }
                    for (var se = 0; se < seqExts.length; se++) {
                        if (ext === seqExts[se]) return "Sequences";
                    }
                    return "Other";
                }
                return "Other";
            }
            return null;
        }

        var moved = [];

        // Iterate in reverse since moving items changes indices
        for (var i = app.project.numItems; i >= 1; i--) {
            var item = app.project.item(i);

            // Skip folders themselves
            if (item instanceof FolderItem) continue;

            // Skip items not at root if rootOnly
            if (rootOnly && item.parentFolder !== app.project.rootFolder) continue;

            var category;
            if (structure === "by-extension") {
                category = categorizeByExtension(item);
            } else {
                category = categorizeByType(item);
            }

            if (!category) continue;

            var folder = getOrCreateFolder(category);

            // Don't move if already in the right folder
            if (item.parentFolder === folder) continue;

            item.parentFolder = folder;
            movedCount++;

            if (moved.length < 50) {
                moved.push({
                    name: item.name,
                    category: category
                });
            }
        }

        // Count created folders
        var createdFolders = [];
        for (var fName in folderMap) {
            createdFolders.push(fName);
        }

        writeResult({
            success: true,
            message: "Organized " + movedCount + " items into " + createdFolders.length + " folders",
            movedCount: movedCount,
            folders: createdFolders,
            moved: moved
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
