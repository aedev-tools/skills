// font-replace.jsx — Find and replace fonts across the project
// Args: { "find": "Helvetica", "replace": "Inter-Regular", "scope": "project" }
//   find: font name to search for (partial match on PostScript name or family)
//   replace: PostScript name of replacement font (e.g., "Inter-Bold")
//   scope: "project" (default) or "comp" (uses active comp)
//   dryRun: true to preview without making changes
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Font Replace");
    try {
        var args = readArgs();

        if (!args.find || !args.replace) {
            writeResult({ error: "Required args: find (font to search for), replace (PostScript name of new font)" });
            return;
        }

        var findFont = args.find;
        var replaceFont = args.replace;
        var scope = args.scope || "project";
        var dryRun = args.dryRun === true;

        var replaced = [];
        var totalMatches = 0;

        function processTextLayer(layer, compName) {
            var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
            if (!textProp) return;

            // Handle keyframed source text — each keyframe may have different font
            if (textProp.numKeys > 0) {
                for (var k = 1; k <= textProp.numKeys; k++) {
                    var textDoc = textProp.keyValue(k);
                    if (fontMatches(textDoc.font, findFont)) {
                        totalMatches++;
                        if (!dryRun) {
                            textDoc.font = replaceFont;
                            textProp.setValueAtTime(textProp.keyTime(k), textDoc);
                        }
                        if (replaced.length < 50) {
                            replaced.push({
                                comp: compName,
                                layer: layer.name,
                                oldFont: textDoc.font,
                                keyframe: k
                            });
                        }
                    }
                }
            } else {
                var textDoc = textProp.value;
                if (fontMatches(textDoc.font, findFont)) {
                    totalMatches++;
                    if (replaced.length < 50) {
                        replaced.push({
                            comp: compName,
                            layer: layer.name,
                            oldFont: textDoc.font
                        });
                    }
                    if (!dryRun) {
                        textDoc.font = replaceFont;
                        textProp.setValue(textDoc);
                    }
                }
            }
        }

        function fontMatches(currentFont, searchTerm) {
            // Case-insensitive partial match
            var current = currentFont.toLowerCase();
            var search = searchTerm.toLowerCase();
            return current.indexOf(search) !== -1;
        }

        function scanComp(comp) {
            for (var j = 1; j <= comp.numLayers; j++) {
                var layer = comp.layer(j);
                if (layer instanceof TextLayer) {
                    var isLocked = layer.locked;
                    if (!dryRun) layer.locked = false;
                    processTextLayer(layer, comp.name);
                    if (!dryRun) layer.locked = isLocked;
                }
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
                ? "Found " + totalMatches + " text layers using '" + findFont + "' (no changes made)"
                : "Replaced font in " + totalMatches + " text layers: '" + findFont + "' → '" + replaceFont + "'",
            totalMatches: totalMatches,
            replaced: replaced
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
