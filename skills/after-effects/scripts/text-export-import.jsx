// text-export-import.jsx — Export/import all text content to/from CSV
// Args: {
//   "mode": "export",                  — "export" or "import"
//   "csvPath": "/tmp/project-text.csv" — file path for CSV
// }
// CSV format: comp_name, layer_name, layer_index, text_content
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Text Export/Import");
    try {
        var args = readArgs();
        var mode = args.mode || "export";
        var csvPath = args.csvPath || "/tmp/ae-project-text.csv";

        if (mode === "export") {
            doExport(csvPath);
        } else if (mode === "import") {
            doImport(csvPath);
        } else {
            writeResult({ error: "Unknown mode: " + mode + ". Use 'export' or 'import'" });
        }
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();

function doExport(csvPath) {
    var rows = [];
    rows.push("comp_name,layer_name,layer_index,font,font_size,text_content");

    var textCount = 0;

    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (!(item instanceof CompItem)) continue;

        for (var j = 1; j <= item.numLayers; j++) {
            var layer = item.layer(j);
            if (!(layer instanceof TextLayer)) continue;

            var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
            if (!textProp) continue;

            var textDoc = textProp.value;
            var text = textDoc.text;
            var font = textDoc.font;
            var fontSize = textDoc.fontSize;

            rows.push(
                csvEscape(item.name) + "," +
                csvEscape(layer.name) + "," +
                j + "," +
                csvEscape(font) + "," +
                fontSize + "," +
                csvEscape(text)
            );
            textCount++;
        }
    }

    var csvFile = new File(csvPath);
    csvFile.encoding = "UTF-8";
    csvFile.open("w");
    csvFile.write(rows.join("\n"));
    csvFile.close();

    writeResult({
        success: true,
        message: "Exported " + textCount + " text layers to " + csvPath,
        count: textCount,
        csvPath: csvPath
    });
}

function doImport(csvPath) {
    var csvFile = new File(csvPath);
    if (!csvFile.exists) {
        writeResult({ error: "CSV file not found: " + csvPath });
        return;
    }

    csvFile.encoding = "UTF-8";
    csvFile.open("r");
    var content = csvFile.read();
    csvFile.close();

    var lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (lines.length < 2) {
        writeResult({ error: "CSV file is empty or has only headers" });
        return;
    }

    // Skip header
    var updatedCount = 0;
    var errors = [];

    for (var l = 1; l < lines.length; l++) {
        if (lines[l].length === 0) continue;

        var fields = parseCSVLine(lines[l]);
        if (fields.length < 6) continue;

        var compName = fields[0];
        var layerName = fields[1];
        var layerIndex = parseInt(fields[2], 10);
        var newText = fields[5];

        // Find the comp
        var comp = null;
        for (var c = 1; c <= app.project.numItems; c++) {
            var cItem = app.project.item(c);
            if (cItem instanceof CompItem && cItem.name === compName) {
                comp = cItem;
                break;
            }
        }
        if (!comp) {
            errors.push("Comp not found: " + compName);
            continue;
        }

        // Find the layer (try by index first, then by name)
        var layer = null;
        if (layerIndex >= 1 && layerIndex <= comp.numLayers) {
            var candidate = comp.layer(layerIndex);
            if (candidate instanceof TextLayer && candidate.name === layerName) {
                layer = candidate;
            }
        }
        if (!layer) {
            for (var li = 1; li <= comp.numLayers; li++) {
                var lyr = comp.layer(li);
                if (lyr instanceof TextLayer && lyr.name === layerName) {
                    layer = lyr;
                    break;
                }
            }
        }
        if (!layer) {
            errors.push("Layer not found: " + layerName + " in " + compName);
            continue;
        }

        // Update text
        var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
        var isLocked = layer.locked;
        layer.locked = false;

        var textDoc = textProp.value;
        textDoc.text = newText;
        textProp.setValue(textDoc);

        layer.locked = isLocked;
        updatedCount++;
    }

    writeResult({
        success: true,
        message: "Updated " + updatedCount + " text layers from CSV" +
                 (errors.length > 0 ? " (" + errors.length + " errors)" : ""),
        count: updatedCount,
        errors: errors
    });
}

function csvEscape(str) {
    str = String(str);
    if (str.indexOf(",") !== -1 || str.indexOf('"') !== -1 || str.indexOf("\n") !== -1) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function parseCSVLine(line) {
    var fields = [];
    var current = "";
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i);

        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line.charAt(i + 1) === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                fields.push(current);
                current = "";
            } else {
                current += ch;
            }
        }
    }
    fields.push(current);
    return fields;
}
