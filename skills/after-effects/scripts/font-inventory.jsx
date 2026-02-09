// font-inventory.jsx — List all fonts used across the project
// Args: {} (scans entire project) or { "compName": "Main Comp" }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    var args = readArgs();

    var fontMap = {};    // fontName -> { count, comps, layers }
    var totalTextLayers = 0;

    function scanTextLayer(layer, compName) {
        totalTextLayers++;
        var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
        if (!textProp) return;

        var textDoc;
        // Handle keyframed source text — check each keyframe
        if (textProp.numKeys > 0) {
            for (var k = 1; k <= textProp.numKeys; k++) {
                textDoc = textProp.keyValue(k);
                recordFont(textDoc, compName, layer.name);
            }
        } else {
            textDoc = textProp.value;
            recordFont(textDoc, compName, layer.name);
        }
    }

    function recordFont(textDoc, compName, layerName) {
        var fontName = textDoc.font;
        var fontSize = textDoc.fontSize;

        if (!fontMap[fontName]) {
            fontMap[fontName] = {
                font: fontName,
                count: 0,
                sizes: [],
                locations: []
            };
        }

        fontMap[fontName].count++;

        // Track unique sizes
        var sizeFound = false;
        for (var s = 0; s < fontMap[fontName].sizes.length; s++) {
            if (fontMap[fontName].sizes[s] === fontSize) {
                sizeFound = true;
                break;
            }
        }
        if (!sizeFound) {
            fontMap[fontName].sizes.push(fontSize);
        }

        // Track locations (limit to 20 per font to avoid massive output)
        if (fontMap[fontName].locations.length < 20) {
            fontMap[fontName].locations.push({
                comp: compName,
                layer: layerName
            });
        }
    }

    function scanComp(comp) {
        for (var j = 1; j <= comp.numLayers; j++) {
            var layer = comp.layer(j);
            if (layer instanceof TextLayer) {
                scanTextLayer(layer, comp.name);
            }
        }
    }

    if (args.compName) {
        var found = false;
        for (var c = 1; c <= app.project.numItems; c++) {
            var cItem = app.project.item(c);
            if (cItem instanceof CompItem && cItem.name === args.compName) {
                scanComp(cItem);
                found = true;
                break;
            }
        }
        if (!found) {
            writeResult({ error: "Composition not found: " + args.compName });
            return;
        }
    } else {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) {
                scanComp(item);
            }
        }
    }

    // Convert map to sorted array
    var fonts = [];
    for (var key in fontMap) {
        fonts.push(fontMap[key]);
    }
    // Sort by usage count descending
    for (var a = 0; a < fonts.length - 1; a++) {
        for (var b = a + 1; b < fonts.length; b++) {
            if (fonts[b].count > fonts[a].count) {
                var temp = fonts[a];
                fonts[a] = fonts[b];
                fonts[b] = temp;
            }
        }
    }

    writeResult({
        totalTextLayers: totalTextLayers,
        totalUniqueFonts: fonts.length,
        fonts: fonts
    });
})();
