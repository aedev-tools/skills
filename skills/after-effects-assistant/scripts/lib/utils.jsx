// utils.jsx — Shared helpers for AE Assistant query scripts
// All query scripts #include this file

// Write JSON result to temp output file
function writeResult(obj) {
    var jsonStr = JSON.stringify(obj);
    var outFile = new File("/tmp/ae-assistant-result.json");
    outFile.encoding = "UTF-8";
    outFile.open("w");
    outFile.write(jsonStr);
    outFile.close();
}

// Write error even if JSON.stringify fails — last-resort error capture
function writeError(message, detail) {
    var errStr = '{"error":' + '"' + String(message).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    if (detail) {
        errStr += ',"detail":"' + String(detail).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    }
    errStr += '}';
    var outFile = new File("/tmp/ae-assistant-result.json");
    outFile.encoding = "UTF-8";
    outFile.open("w");
    outFile.write(errStr);
    outFile.close();
}

// Append to persistent log file
function appendLog(message) {
    var logFile = new File("~/.ae-assistant-extendscript.log");
    logFile.encoding = "UTF-8";
    logFile.open("a");
    logFile.writeln("[" + new Date().toString() + "] " + message);
    logFile.close();
}

// Read arguments from temp input file
function readArgs() {
    var argFile = new File("/tmp/ae-assistant-args.json");
    if (!argFile.exists) return {};
    argFile.encoding = "UTF-8";
    argFile.open("r");
    var content = argFile.read();
    argFile.close();
    if (!content || content.length === 0) return {};
    return JSON.parse(content);
}

// Detect layer type string
function getLayerType(layer) {
    switch (layer.matchName) {
        case "ADBE Vector Layer": return "shape";
        case "ADBE Text Layer": return "text";
        case "ADBE Camera Layer": return "camera";
        case "ADBE Light Layer": return "light";
        case "ADBE AV Layer":
            if (layer.nullLayer) return "null";
            if (layer.adjustmentLayer) return "adjustment";
            if (layer.guideLayer) return "guide";
            try {
                if (layer.source instanceof CompItem) return "precomp";
                if (layer.source.mainSource instanceof SolidSource) return "solid";
                if (layer.source.mainSource instanceof PlaceholderSource) return "placeholder";
                if (layer.source.mainSource instanceof FileSource) {
                    if (layer.source.footageMissing) return "missing";
                    if (!layer.source.hasVideo && layer.source.hasAudio) return "audio";
                    return "footage";
                }
            } catch(e) {}
            return "av";
        default: return "unknown";
    }
}

// Get blend mode display name
function getBlendModeName(mode) {
    for (var key in BlendingMode) {
        if (BlendingMode[key] === mode) return key;
    }
    return "unknown";
}
