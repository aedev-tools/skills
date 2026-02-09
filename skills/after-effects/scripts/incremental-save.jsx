// incremental-save.jsx — Save project with auto-incrementing version number
// Args: {
//   "comment": "before client revisions"  — optional comment appended to filename
// }
// Saves as: ProjectName_v001.aep, ProjectName_v002.aep, etc.
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    try {
        var args = readArgs();

        if (!app.project.file) {
            writeResult({ error: "Project has never been saved. Save it first, then use incremental save." });
            return;
        }

        var projectFile = app.project.file;
        var projectDir = projectFile.parent;
        var fullName = projectFile.name;

        // Strip extension
        var dotIdx = fullName.lastIndexOf(".");
        var baseName = (dotIdx > 0) ? fullName.substring(0, dotIdx) : fullName;
        var ext = (dotIdx > 0) ? fullName.substring(dotIdx) : ".aep";

        // Check if name already has a version pattern (_v001)
        var versionRegex = /_v(\d+)$/;
        var currentVersion = 0;
        var nameWithoutVersion = baseName;

        // Manual regex-like check since ES3 regex support is limited
        var vIdx = baseName.lastIndexOf("_v");
        if (vIdx > 0) {
            var suffix = baseName.substring(vIdx + 2);
            var isAllDigits = true;
            for (var c = 0; c < suffix.length; c++) {
                var ch = suffix.charCodeAt(c);
                if (ch < 48 || ch > 57) { isAllDigits = false; break; }
            }
            if (isAllDigits && suffix.length > 0) {
                currentVersion = parseInt(suffix, 10);
                nameWithoutVersion = baseName.substring(0, vIdx);
            }
        }

        // Find next available version number
        var nextVersion = currentVersion + 1;
        var versionStr = padNumber(nextVersion, 3);

        // Build new filename
        var newName = nameWithoutVersion + "_v" + versionStr;
        if (args.comment) {
            // Sanitize comment for filename
            var safeComment = args.comment.replace(/[\/\\:*?"<>|]/g, "_").substring(0, 30);
            newName += "_" + safeComment;
        }
        newName += ext;

        var newFile = new File(projectDir.fsName + "/" + newName);

        // Check if file already exists, increment further if needed
        while (newFile.exists) {
            nextVersion++;
            versionStr = padNumber(nextVersion, 3);
            newName = nameWithoutVersion + "_v" + versionStr;
            if (args.comment) {
                var safeComment2 = args.comment.replace(/[\/\\:*?"<>|]/g, "_").substring(0, 30);
                newName += "_" + safeComment2;
            }
            newName += ext;
            newFile = new File(projectDir.fsName + "/" + newName);
        }

        // Save current project first (to not lose work)
        app.project.save();

        // Save a copy with the new versioned name
        app.project.save(newFile);

        writeResult({
            success: true,
            message: "Saved incremental version: " + newName,
            fileName: newName,
            filePath: newFile.fsName,
            version: nextVersion
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    }
})();

function padNumber(num, length) {
    var str = String(num);
    while (str.length < length) {
        str = "0" + str;
    }
    return str;
}
