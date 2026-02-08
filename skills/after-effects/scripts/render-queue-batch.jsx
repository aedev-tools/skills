// render-queue-batch.jsx — Add multiple comps to render queue with consistent settings
// Args: {
//   "compNames": ["Final 16x9", "Final 9x16"],  — comp names to add (optional)
//   "scope": "selected",     — "selected" (project panel), "folder" (by folder name), "all"
//   "folderName": "Renders", — for scope "folder"
//   "outputPath": "~/Desktop/renders/",  — output directory
//   "outputModule": "Lossless",          — output module template name (optional)
//   "renderTemplate": "Best Settings",   — render settings template name (optional)
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    try {
        var args = readArgs();

        // Collect comps to render
        var comps = [];

        if (args.compNames && args.compNames.length > 0) {
            for (var n = 0; n < args.compNames.length; n++) {
                for (var i = 1; i <= app.project.numItems; i++) {
                    var item = app.project.item(i);
                    if (item instanceof CompItem && item.name === args.compNames[n]) {
                        comps.push(item);
                        break;
                    }
                }
            }
        } else {
            var scope = args.scope || "selected";

            if (scope === "selected") {
                var sel = app.project.selection;
                for (var s = 0; s < sel.length; s++) {
                    if (sel[s] instanceof CompItem) comps.push(sel[s]);
                }
            } else if (scope === "folder") {
                if (!args.folderName) {
                    writeResult({ error: "folderName required for scope 'folder'" });
                    return;
                }
                for (var f = 1; f <= app.project.numItems; f++) {
                    var fItem = app.project.item(f);
                    if (fItem instanceof FolderItem && fItem.name === args.folderName) {
                        for (var fi = 1; fi <= fItem.numItems; fi++) {
                            if (fItem.item(fi) instanceof CompItem) {
                                comps.push(fItem.item(fi));
                            }
                        }
                        break;
                    }
                }
            } else if (scope === "all") {
                for (var a = 1; a <= app.project.numItems; a++) {
                    if (app.project.item(a) instanceof CompItem) {
                        comps.push(app.project.item(a));
                    }
                }
            }
        }

        if (comps.length === 0) {
            writeResult({ error: "No compositions found to render" });
            return;
        }

        var rq = app.project.renderQueue;
        var addedCount = 0;
        var added = [];

        for (var c = 0; c < comps.length; c++) {
            var comp = comps[c];
            var rqItem = rq.items.add(comp);

            // Apply render settings template if specified
            if (args.renderTemplate) {
                try {
                    rqItem.applyTemplate(args.renderTemplate);
                } catch (e) {
                    // Template might not exist
                }
            }

            // Configure output module
            var om = rqItem.outputModule(1);

            if (args.outputModule) {
                try {
                    om.applyTemplate(args.outputModule);
                } catch (e) {
                    // Template might not exist
                }
            }

            // Set output path
            if (args.outputPath) {
                var outputDir = args.outputPath;
                // Ensure trailing separator
                if (outputDir.charAt(outputDir.length - 1) !== "/" &&
                    outputDir.charAt(outputDir.length - 1) !== "\\") {
                    outputDir += "/";
                }
                var outFile = new File(outputDir + comp.name);
                om.file = outFile;
            }

            addedCount++;
            added.push({
                name: comp.name,
                output: om.file ? om.file.fsName : "(default)"
            });
        }

        writeResult({
            success: true,
            message: "Added " + addedCount + " compositions to render queue",
            count: addedCount,
            items: added,
            note: "Use File > Export > Add to Render Queue or run 'aerender' from command line to start rendering"
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    }
})();
