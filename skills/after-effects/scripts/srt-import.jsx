// srt-import.jsx — Import SRT subtitle file and create timed text layers
// Args: {
//   "srtPath": "/path/to/subtitles.srt",
//   "font": "Arial",           — PostScript font name (optional)
//   "fontSize": 48,             — font size in px (optional, default 48)
//   "fillColor": [1,1,1],       — RGB 0-1 (optional, default white)
//   "position": "bottom",       — "bottom", "center", "top" (optional)
//   "compName": "Main Comp"     — target comp (optional, uses active)
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: SRT Import");
    try {
        var args = readArgs();

        if (!args.srtPath) {
            writeResult({ error: "Required arg: srtPath (path to .srt file)" });
            return;
        }

        var comp = null;
        if (args.compName) {
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.name === args.compName) {
                    comp = item;
                    break;
                }
            }
            if (!comp) {
                writeResult({ error: "Composition not found: " + args.compName });
                return;
            }
        } else {
            comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                writeResult({ error: "No active composition" });
                return;
            }
        }

        // Read SRT file
        var srtFile = new File(args.srtPath);
        if (!srtFile.exists) {
            writeResult({ error: "SRT file not found: " + args.srtPath });
            return;
        }

        srtFile.encoding = "UTF-8";
        srtFile.open("r");
        var content = srtFile.read();
        srtFile.close();

        // Parse SRT
        var subtitles = parseSRT(content);

        if (subtitles.length === 0) {
            writeResult({ error: "No subtitles found in SRT file" });
            return;
        }

        var font = args.font || "ArialMT";
        var fontSize = args.fontSize || 48;
        var fillColor = args.fillColor || [1, 1, 1];
        var position = args.position || "bottom";

        // Calculate Y position
        var posY;
        if (position === "bottom") {
            posY = comp.height * 0.85;
        } else if (position === "center") {
            posY = comp.height / 2;
        } else {
            posY = comp.height * 0.15;
        }

        var createdCount = 0;

        for (var s = 0; s < subtitles.length; s++) {
            var sub = subtitles[s];

            // Create text layer
            var textLayer = comp.layers.addText(sub.text);
            textLayer.name = "Sub " + sub.index;

            // Set timing
            textLayer.inPoint = sub.startTime;
            textLayer.outPoint = sub.endTime;

            // Set text properties
            var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
            var textDoc = textProp.value;
            textDoc.font = font;
            textDoc.fontSize = fontSize;
            textDoc.fillColor = fillColor;
            textDoc.applyFill = true;
            textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
            textProp.setValue(textDoc);

            // Set position
            var posProp = textLayer.property("ADBE Transform Group").property("ADBE Position");
            posProp.setValue([comp.width / 2, posY]);

            createdCount++;
        }

        writeResult({
            success: true,
            message: "Imported " + createdCount + " subtitles from SRT",
            count: createdCount,
            srtPath: args.srtPath
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();

function parseSRT(content) {
    var subtitles = [];
    // Normalize line endings
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var blocks = content.split("\n\n");

    for (var b = 0; b < blocks.length; b++) {
        var lines = blocks[b].split("\n");
        if (lines.length < 3) continue;

        // First line: index number
        var index = parseInt(lines[0], 10);
        if (isNaN(index)) continue;

        // Second line: timestamps "00:01:23,456 --> 00:01:25,789"
        var timeLine = lines[1];
        var timeParts = timeLine.split(" --> ");
        if (timeParts.length !== 2) continue;

        var startTime = parseSRTTime(timeParts[0]);
        var endTime = parseSRTTime(timeParts[1]);
        if (startTime === null || endTime === null) continue;

        // Remaining lines: subtitle text
        var textLines = [];
        for (var l = 2; l < lines.length; l++) {
            if (lines[l].length > 0) {
                // Strip basic HTML tags
                var cleaned = lines[l].replace(/<[^>]+>/g, "");
                textLines.push(cleaned);
            }
        }

        if (textLines.length > 0) {
            subtitles.push({
                index: index,
                startTime: startTime,
                endTime: endTime,
                text: textLines.join("\n")
            });
        }
    }

    return subtitles;
}

function parseSRTTime(timeStr) {
    // Format: "HH:MM:SS,mmm" or "HH:MM:SS.mmm"
    timeStr = timeStr.replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
    var parts = timeStr.split(":");
    if (parts.length !== 3) return null;

    var hours = parseInt(parts[0], 10);
    var minutes = parseInt(parts[1], 10);
    var secParts = parts[2].split(".");
    var seconds = parseInt(secParts[0], 10);
    var millis = secParts.length > 1 ? parseInt(secParts[1], 10) : 0;

    return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}
