# After Effects Scripts — Descriptions

All scripts run via ExtendScript inside After Effects. No plugins required — just `.jsx` files executed through the built-in scripting engine.

---

## Query Scripts

These scripts read your project state without modifying anything. Use them to understand what's in your project before taking action.

### active-state.jsx

Returns the current working state of After Effects — which composition is open, which layers are selected, the current time indicator position, and the work area range. This is the starting point for any automation: know where you are before you do anything.

### project-overview.jsx

Gives you a bird's-eye view of your entire After Effects project. Shows the folder structure with item counts, lists every composition with its settings, and summarizes footage files grouped by type. Supports three modes: summary (default, fast), folder (drill into a specific folder), and full (every single item listed — use sparingly on large projects).

### comp-detail.jsx

Returns medium-level detail for a specific composition — every layer with its type, visibility, blend mode, parenting, effects list, and expression count. Think of it as the "table of contents" for a comp. Works on the active comp or any comp by name.

### layer-detail.jsx

Deep-dives into specific layers, returning full transform keyframe data, effect parameters with values, mask details, expression code, and text properties including font and styling. This is the script you run when you need to understand exactly what's happening on a layer before modifying it.

### expression-errors.jsx

Scans your entire project (or a specific comp) for broken expressions and reports every error with its location — comp name, layer name, property path, and the actual error message. Also counts disabled expressions. Instead of opening every comp to find red expression badges, run this once and get the full picture.

### font-inventory.jsx

Lists every font used across your project, sorted by how often each appears. For each font, shows the PostScript name, every size it's used at, and up to 20 locations (comp + layer name). Essential for font management, finding missing fonts, or preparing a project for handoff.

### project-audit.jsx

A comprehensive health check that scans for six categories of issues: unused footage, missing files, expression errors, duplicate solids, missing/substituted fonts, and empty folders. Returns a severity-rated list of everything that needs attention, plus an overall health score. Run this before delivering a project or when inheriting one from someone else.

### select-layers.jsx

Selects layers in the active comp based on filters — by type (text, shape, solid, null, camera), label color, lock state, visibility, 3D status, whether they have expressions or effects, or by name search. Supports inverting the selection. Useful as a precursor to other batch operations.

---

## Project Management Scripts

Tools for organizing, cleaning, and maintaining your After Effects projects.

### project-cleanup.jsx

Removes unused footage items, consolidates duplicate solids (same size and color merged into one with all references updated), and deletes empty folders. Supports a dry-run mode that shows you exactly what would be removed without touching anything. The single most impactful script for reducing project bloat.

### organize-project.jsx

Auto-sorts your project panel into organized folders. In "by-type" mode, creates folders for Comps, Footage, Solids, Images, Audio, and Placeholders. In "by-extension" mode, groups by file format (Images, Video, Audio, Sequences). Only moves items at the root level by default, so your existing folder structure stays intact.

### batch-rename.jsx

Renames layers, compositions, or project items in bulk. Supports five modes: find-and-replace, add prefix, add suffix, sequential numbering (e.g., "Card 1", "Card 2", "Card 3"), and character trimming. Works on selected layers, all layers in the active comp, selected project items, or all compositions.

### batch-comp-settings.jsx

Changes composition settings across multiple comps at once — frame rate, resolution, duration, and background color. When a client changes deliverable specs mid-project, this saves you from manually updating 30+ comps one by one. Supports targeting specific comps by name, selected comps, all comps, or an active comp plus all its nested precomps recursively.

### relink-footage.jsx

Batch-relinks missing footage by searching specified directories for files with matching names. Point it at one or more folders, and it finds and reconnects every missing item it can match. Supports recursive directory search and dry-run mode. Essential when moving projects between machines or drives.

### incremental-save.jsx

Saves your project with an auto-incrementing version number (e.g., `Project_v001.aep`, `Project_v002.aep`). Detects existing version numbers and increments from there. Optionally appends a comment to the filename. Never overwrites — always finds the next available version number.

---

## Composition Scripts

Scripts that create, duplicate, restructure, or batch-produce compositions.

### true-comp-duplicator.jsx

The script everyone wishes After Effects had built in. Duplicates a composition and all of its nested precomps as fully independent copies — editing the duplicate never affects the original. Standard Ctrl+D only creates a shallow copy where nested precomps are shared references. This script walks the entire comp hierarchy, duplicates every sub-comp, relinks all layer sources, and organizes everything into a folder. Handles shared precomps (only duplicated once) and circular references safely.

### smart-precompose.jsx

Precomposes selected layers with a key improvement over the built-in command: it automatically trims the new precomp's duration to match the actual time span of the layers, instead of inheriting the full parent comp duration. No more 30-second precomps that only contain 2 seconds of content.

### un-precompose.jsx

The reverse of precompose — extracts all layers from a precomp back into the parent composition, preserving timing offsets. The original precomp layer is disabled (or optionally deleted). Useful when you realize a precomp was unnecessary or need to restructure your comp hierarchy.

### comp-from-csv.jsx

Generates multiple composition variations from a CSV spreadsheet. You create a template comp where text layer names match CSV column headers, then point this script at a CSV file — it duplicates the template for each row and swaps in the text. Perfect for producing localized versions, personalized lower thirds, or any template-based batch work. All generated comps are organized into a folder.

### render-queue-batch.jsx

Adds multiple compositions to the render queue in one operation with consistent output settings. Target comps by name, project panel selection, folder, or all comps. Optionally set output module template, render settings template, and output directory. Saves the repetitive clicking of adding and configuring render items one by one.

---

## Text & Font Scripts

Scripts for managing text content and typography across your project.

### font-replace.jsx

Finds every text layer using a specific font and replaces it with a different one — across the entire project or within a single comp. Uses partial matching so searching for "Helvetica" catches "Helvetica-Bold", "HelveticaNeue-Light", etc. Supports dry-run mode to preview changes. Handles keyframed source text (where the font might differ per keyframe).

### srt-import.jsx

Imports an SRT subtitle file and creates individual text layers for each subtitle entry, timed exactly to the SRT timestamps. Configurable font, size, color, and vertical position (top, center, bottom). Strips HTML formatting tags from subtitle text. Turns a tedious manual process into a single operation.

### text-export-import.jsx

Exports all text content from every text layer in your project to a CSV file — one row per layer with comp name, layer name, font, size, and the text itself. Edit the CSV in any spreadsheet app (for translations, client revisions, proofreading), then reimport to update all text layers automatically. Matches layers by comp name + layer name for accurate updates.

---

## Keyframe & Animation Scripts

Scripts for manipulating keyframes, easing, and animation timing.

### easing-presets.jsx

Applies professional easing curves to selected keyframes without touching the Graph Editor. Includes keyframe-based presets (smooth, sharp, snappy, linear) with adjustable influence, plus expression-based presets (bounce, elastic, overshoot) that create natural physics-like motion. The expression presets analyze velocity at each keyframe and apply mathematically correct decay curves.

### copy-ease.jsx

Copies the easing curve from one keyframe and pastes it onto others — without changing the actual keyframe values. After Effects' native copy/paste copies everything; this lets you transfer just the "feel" of the motion. Works across different properties and different dimension counts, automatically adapting the ease data.

### reverse-keyframes.jsx

Reverses the keyframe values on selected properties so the animation plays backwards while keeping the same timing. Preserves easing curves (swapped appropriately) and interpolation types. Select your properties, run the script, and your animation plays in reverse.

### layer-stagger.jsx

Offsets selected layers in time by a fixed interval to create cascade and stagger animations — the bread and butter of motion graphics. Configure the offset in seconds or frames, direction (top-to-bottom or reverse), and mode (shift in-points, shift start times, or shift keyframes). Turns the tedious process of manually dragging layers into a one-step operation.

---

## Layer Scripts

Scripts for manipulating layer properties, positions, and structure.

### anchor-point-mover.jsx

Moves the anchor point to any of nine preset positions (center, four corners, four edges) on selected layers — and compensates the position property so the layer doesn't visually move. Properly accounts for current scale. Works with keyframed position and anchor point values. Fixes the most common complaint about After Effects' Pan Behind tool.

### layer-sort.jsx

Reorders layers in the timeline based on various criteria: alphabetical name, in-point time, layer type, label color, Y position in the comp, or X position. Supports ascending and descending order. Works on selected layers or all layers. Particularly useful for organizing layers by their spatial position to match their visual stacking.

### explode-shape-layer.jsx

Splits a shape layer with multiple groups into individual layers — one layer per top-level shape group. When you import from Illustrator or paste vectors, After Effects often dumps everything into one monolithic shape layer. This script breaks them apart so you can animate each shape independently. The original layer is disabled (or optionally deleted).

### randomize-properties.jsx

Applies random values to transform properties (position, rotation, scale, opacity) across selected layers. Configure minimum and maximum ranges, choose between absolute values or offsets from current values, and optionally set per-axis ranges for position (different X and Y ranges). Scale can be randomized uniformly or per-axis. Useful for creating organic, varied layouts.

---

## Expression Scripts

Scripts for working with After Effects expressions in bulk.

### expression-replace.jsx

Finds and replaces text inside expressions across your entire project or a specific comp. When you rename a layer, restructure comps, or update variable names, expressions that reference the old names break. This script fixes them all at once. Supports dry-run mode to preview every match before committing changes.

### batch-expression.jsx

Applies an expression to a specific property on all selected layers in one go, or removes/enables/disables all expressions on selected layers. Instead of copying and pasting "wiggle(2, 10)" onto 20 layers one at a time, run this once. Supports property name shortcuts (just type "opacity" instead of "ADBE Opacity").
