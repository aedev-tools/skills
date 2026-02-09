// anchor-point-mover.jsx — Move anchor point to preset positions with position compensation
// Args: {
//   "position": "center",   — "center", "top-left", "top", "top-right", "left", "right",
//                              "bottom-left", "bottom", "bottom-right"
// }
// Operates on selected layers in active comp
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Move Anchor Point");
    try {
        var args = readArgs();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            writeResult({ error: "No active composition" });
            return;
        }

        var position = args.position || "center";
        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            writeResult({ error: "Select at least one layer" });
            return;
        }

        var movedCount = 0;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var isLocked = layer.locked;
            layer.locked = false;

            // Get layer bounds using sourceRectAtTime
            var rect = layer.sourceRectAtTime(comp.time, false);
            var anchorProp = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
            var posProp = layer.property("ADBE Transform Group").property("ADBE Position");

            // Calculate target anchor point based on source rect
            var targetAnchor;
            switch (position) {
                case "center":
                    targetAnchor = [rect.left + rect.width / 2, rect.top + rect.height / 2];
                    break;
                case "top-left":
                    targetAnchor = [rect.left, rect.top];
                    break;
                case "top":
                    targetAnchor = [rect.left + rect.width / 2, rect.top];
                    break;
                case "top-right":
                    targetAnchor = [rect.left + rect.width, rect.top];
                    break;
                case "left":
                    targetAnchor = [rect.left, rect.top + rect.height / 2];
                    break;
                case "right":
                    targetAnchor = [rect.left + rect.width, rect.top + rect.height / 2];
                    break;
                case "bottom-left":
                    targetAnchor = [rect.left, rect.top + rect.height];
                    break;
                case "bottom":
                    targetAnchor = [rect.left + rect.width / 2, rect.top + rect.height];
                    break;
                case "bottom-right":
                    targetAnchor = [rect.left + rect.width, rect.top + rect.height];
                    break;
                default:
                    writeResult({ error: "Unknown position: " + position });
                    return;
            }

            // Calculate the delta in anchor point
            var oldAnchor = anchorProp.value;
            var deltaX = targetAnchor[0] - oldAnchor[0];
            var deltaY = targetAnchor[1] - oldAnchor[1];

            // Get current scale to properly compensate position
            var scaleProp = layer.property("ADBE Transform Group").property("ADBE Scale");
            var scale = scaleProp.value;
            var scaleX = scale[0] / 100;
            var scaleY = scale[1] / 100;

            // Set anchor point
            if (anchorProp.numKeys > 0) {
                // If keyframed, offset all keyframes
                for (var k = 1; k <= anchorProp.numKeys; k++) {
                    var kVal = anchorProp.keyValue(k);
                    anchorProp.setValueAtTime(anchorProp.keyTime(k),
                        [kVal[0] + deltaX, kVal[1] + deltaY]);
                }
            } else {
                anchorProp.setValue(targetAnchor);
            }

            // Compensate position so layer doesn't move visually
            if (posProp.numKeys > 0) {
                for (var pk = 1; pk <= posProp.numKeys; pk++) {
                    var pVal = posProp.keyValue(pk);
                    if (pVal.length === 3) {
                        posProp.setValueAtTime(posProp.keyTime(pk),
                            [pVal[0] + deltaX * scaleX, pVal[1] + deltaY * scaleY, pVal[2]]);
                    } else {
                        posProp.setValueAtTime(posProp.keyTime(pk),
                            [pVal[0] + deltaX * scaleX, pVal[1] + deltaY * scaleY]);
                    }
                }
            } else {
                var pos = posProp.value;
                if (pos.length === 3) {
                    posProp.setValue([pos[0] + deltaX * scaleX, pos[1] + deltaY * scaleY, pos[2]]);
                } else {
                    posProp.setValue([pos[0] + deltaX * scaleX, pos[1] + deltaY * scaleY]);
                }
            }

            layer.locked = isLocked;
            movedCount++;
        }

        writeResult({
            success: true,
            message: "Moved anchor point to " + position + " on " + movedCount + " layers",
            position: position,
            count: movedCount
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
