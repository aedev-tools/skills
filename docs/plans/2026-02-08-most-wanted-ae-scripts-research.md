# Most Wanted After Effects Scripts — Research

> Compiled 2026-02-08 from aescripts.com best sellers, Reddit, Adobe forums,
> Creative COW, GitHub collections, motion design blogs, and marketplace data.

## Purpose

Identify the most commonly requested AE automations that can be built as
simple ExtendScript (.jsx) scripts — runnable via our existing `runner.sh`
infrastructure, no CEP/UXP panels or C++ plugins required.

---

## Tier 1: Highest Demand — Build These First

These are the scripts people ask for constantly. All are fully feasible as
standalone .jsx files.

### 1. True Comp Duplicator

- **What:** Deep-clone a comp hierarchy so nested precomps are independent copies, not shared references
- **Pain point:** AE's Ctrl+D duplicates the top comp but nested precomps remain shared — editing one breaks the other. This is the #1 most confusing AE behavior for users
- **Market:** True Comp Duplicator ($25–40, aescripts.com) is virtually the only solution
- **Feasibility:** Excellent — recursively walk comp tree, duplicate each unique sub-comp, relink layer sources, optionally update expressions
- **Args:** `{ "compName": "Main Comp", "suffix": " COPY" }`

### 2. Global Font Find & Replace

- **What:** Find all fonts used in the project, replace one font with another across all text layers in all comps
- **Pain point:** No native global font replacement. Changing a brand font across 200 text layers in 50 comps = hours of clicking
- **Market:** FontMate ($15–25), Font Manager by MotionLand (best seller)
- **Feasibility:** Excellent — iterate all comps, find text layers, read/write `TextDocument.font` property
- **Args:** `{ "find": "Helvetica", "replace": "Inter", "scope": "project" }`

### 3. Batch Layer Renamer

- **What:** Rename selected layers or all layers with find/replace, prefix, suffix, sequential numbering, trimming
- **Pain point:** AE has zero batch rename. Renaming 50+ layers one-by-one is mind-numbing. Imported AI layers come in with cryptic names
- **Market:** AE Global Renamer 2 ($5–20), Dojo Renamer (free)
- **Feasibility:** Trivial — modify `layer.name` on selected/filtered layers
- **Args:** `{ "mode": "find-replace", "find": "Layer", "replace": "Element" }` or `{ "mode": "prefix", "prefix": "BG_" }` or `{ "mode": "sequence", "base": "Card", "start": 1 }`

### 4. Remove Unused / Consolidate Duplicates

- **What:** Remove unused footage, consolidate duplicate solids, delete empty folders, clean up project panel
- **Pain point:** Projects bloat with "Black Solid 1", "Black Solid 2", etc. AE's built-in `Remove Unused Footage` misses duplicate solids and empty comps
- **Market:** Project Cleaner (paid), conSOLIDator (free, open source)
- **Feasibility:** Excellent — iterate `app.project.items`, check usage via `item.usedIn`, remove/consolidate
- **Args:** `{ "removeSolids": true, "removeFootage": true, "removeEmptyFolders": true, "dryRun": true }`

### 5. Layer Stagger / Offset

- **What:** Offset selected layers in time by a fixed interval to create cascade/stagger animations
- **Pain point:** Manually dragging dozens of layers to create staggered reveals is tedious. Built-in Sequence Layers is limited
- **Market:** Dojo Shifter (free), pt_ShiftLayers (paid), Lazy 2 ($35)
- **Feasibility:** Trivial — modify `layer.startTime` with incremental offset
- **Args:** `{ "offset": 0.1, "direction": "forward", "unit": "seconds" }`

### 6. Expression Find & Replace

- **What:** Search/replace text inside expressions across the entire project — fix broken paths, rename variables, update references
- **Pain point:** Restructuring a project or renaming layers breaks expressions everywhere. Fixing them one-by-one is a nightmare
- **Market:** pt_ExpressEdit 2 (NYOP), find-n-replace (free)
- **Feasibility:** Excellent — iterate all comps/layers/properties, read `expression`, string replace, write back
- **Args:** `{ "find": "thisComp.layer(\"Old Name\")", "replace": "thisComp.layer(\"New Name\")", "dryRun": true }`

### 7. Apply Easing Presets to Keyframes

- **What:** Apply professional easing (ease in, ease out, bounce, elastic, overshoot) to selected keyframes without the Graph Editor
- **Pain point:** AE's Graph Editor is clunky. Most designers just want "make this ease nicely." Default Easy Ease is too generic
- **Market:** Flow ($30, industry standard), Motion Tools Pro (free), Ease and Wizz (free)
- **Feasibility:** Yes — uses `setTemporalEaseAtKey()` with predefined speed/influence values
- **Args:** `{ "preset": "smooth-ease-out", "influence": 75 }` or `{ "preset": "bounce" }`

---

## Tier 2: Frequently Requested — High Value

### 8. Organize Project Panel

- **What:** Auto-sort project items into folders by type (Comps, Footage, Solids, Audio, Images, Precomps)
- **Pain point:** Project panels become chaotic dump zones. Inherited projects are impossible to navigate
- **Market:** Organize Project Assets (free, David Torno), Declutter ($30)
- **Feasibility:** Easy — create `FolderItem` objects, move items based on type/extension
- **Args:** `{ "structure": "by-type" }` or `{ "structure": "by-extension" }`

### 9. Batch Comp Settings

- **What:** Change frame rate, resolution, duration, or background color across multiple compositions at once
- **Pain point:** Client changes specs mid-project: "actually make it 25fps" — updating 30+ comps one-by-one
- **Market:** rd_CompSetter (free, dated)
- **Feasibility:** Trivial — modify `compItem.frameRate`, `.width`, `.height`, `.duration`
- **Args:** `{ "fps": 25, "width": 3840, "height": 2160, "compNames": ["Comp 1", "Comp 2"] }`

### 10. Copy/Paste Easing Only

- **What:** Copy ease curves from one keyframe and apply to others without changing the actual values
- **Pain point:** AE's copy/paste copies everything. No way to just transfer the ease profile
- **Market:** EaseCopy ($10–15, aescripts.com)
- **Feasibility:** Yes — read `keyInTemporalEase` / `keyOutTemporalEase`, apply to target keys
- **Args:** `{ "sourceLayer": "Logo", "sourceProperty": "Position", "sourceKeyIndex": 2 }`

### 11. Smart Precompose

- **What:** Precompose selected layers with automatic duration trimming to match layer time span (not full parent comp duration)
- **Pain point:** Built-in precompose creates comp at parent's full duration even if layers span 2 seconds. Manual trimming required
- **Market:** SmartPrecomp (free, Gumroad)
- **Feasibility:** Easy — calculate min/max in/out points, create comp at correct duration
- **Args:** `{ "name": "My Precomp", "trimToContent": true }`

### 12. Un-PreCompose

- **What:** Extract layers from a precomp back into the parent comp, preserving transforms, effects, timing
- **Pain point:** Precompose is one-way — no native undo. Manually extracting layers is destructive
- **Market:** Un-PreCompose (free/NYOP, Batchframe)
- **Feasibility:** Yes — copy layers between comps, adjust transforms, transfer effects
- **Args:** `{ "precompLayerName": "Precomp 1" }`

### 13. Expression Error Scanner

- **What:** Scan all comps/layers/properties for broken expressions, report them with location and error message
- **Pain point:** AE only shows expression errors one at a time as you open each comp. No project-wide view
- **Market:** Underserved — no polished dedicated tool exists
- **Feasibility:** Excellent — iterate all properties, check `expressionEnabled` and `expressionError`
- **Args:** `{ "scope": "project" }` or `{ "compName": "Main Comp" }`

### 14. Reverse Keyframes

- **What:** Reverse the order of keyframe values in time (play animation backwards)
- **Pain point:** No native "reverse keyframes" command. Must manually swap values
- **Feasibility:** Yes — read values, reverse array, re-apply at same times preserving easing
- **Args:** `{}` (operates on selected keyframes)

### 15. Missing Footage Relinker

- **What:** Batch-relink missing footage by searching specified directories for matching filenames
- **Pain point:** Moving projects between machines breaks footage paths. AE's built-in relink is one-at-a-time
- **Market:** Relinker (paid), Find Missing Files by AEJuice (free)
- **Feasibility:** Yes — iterate footage items, check `footageMissing`, search directories, call `replace()`
- **Args:** `{ "searchPaths": ["/Volumes/Projects/footage", "~/Desktop/assets"] }`

### 16. Anchor Point Mover

- **What:** Set anchor point to center, corners, or edges with automatic position compensation
- **Pain point:** Pan Behind tool is imprecise. Shape layer anchor points are notoriously tricky
- **Market:** Many free versions exist (Spotlight FX, included in Motion Tools Pro)
- **Feasibility:** Trivial — use `sourceRectAtTime()`, modify anchor + position
- **Args:** `{ "position": "center" }` or `{ "position": "top-left" }`

---

## Tier 3: Common Needs — Worth Building

### 17. SRT / Subtitle Importer

- **What:** Parse SRT file and create timed text layers with proper in/out points
- **Pain point:** Manually timing subtitles frame-by-frame is agonizing
- **Market:** pt_ImportSubtitles (free), SRT Importer (free)
- **Feasibility:** Yes — file I/O + SRT parsing + text layer creation
- **Args:** `{ "srtPath": "/path/to/subtitles.srt", "font": "Arial", "fontSize": 48 }`

### 18. Text Export / Import (CSV)

- **What:** Export all text content from project to CSV, edit externally, reimport changes
- **Pain point:** Client text revisions across a large project = hunting through comps
- **Market:** Text2Spreadsheet (paid, aescripts.com)
- **Feasibility:** Yes — iterate text layers, read/write sourceText, CSV file I/O
- **Args:** `{ "mode": "export", "outputPath": "/tmp/project-text.csv" }`

### 19. Batch Apply Expression

- **What:** Apply an expression string to a specific property on multiple selected layers
- **Pain point:** Writing the same expression on 20 layers = 20 copy-paste operations
- **Feasibility:** Trivial — iterate selected layers, set `property.expression`
- **Args:** `{ "property": "ADBE Opacity", "expression": "wiggle(2, 10)" }`

### 20. Layer Sort

- **What:** Sort layers in timeline by name, position, in-point, label color, or type
- **Pain point:** AE has no native layer sorting. 100+ layer timelines are chaos
- **Feasibility:** Easy — read properties, sort array, reorder with `moveAfter()` / `moveBefore()`
- **Args:** `{ "sortBy": "name", "order": "ascending" }`

### 21. Randomize Properties

- **What:** Apply random values to position, rotation, scale, or opacity across selected layers
- **Pain point:** Manual randomization across dozens of layers is tedious
- **Feasibility:** Easy — `Math.random()` within min/max range, set property values
- **Args:** `{ "property": "rotation", "min": -15, "max": 15 }`

### 22. Select Layers by Type / Attribute

- **What:** Select all layers matching criteria: type (text, shape, null), label color, visibility, etc.
- **Pain point:** Scrolling and shift-clicking to select groups is tedious in deep timelines
- **Feasibility:** Trivial — iterate layers, check attributes, set `layer.selected`
- **Args:** `{ "type": "text" }` or `{ "label": 1 }` or `{ "locked": true }`

### 23. Collect Project Fonts

- **What:** List every font used across the project with comp/layer locations
- **Pain point:** AE has no font inventory. Missing font dialogs on project open are cryptic
- **Feasibility:** Easy — iterate text layers, read `TextDocument.font`, compile list
- **Args:** `{}`

### 24. Comp From Spreadsheet / Data-Driven Versions

- **What:** Generate multiple comp variations from CSV data (different text, images per row)
- **Pain point:** Creating 50 localized lower thirds by hand is multi-day work
- **Market:** CompsFromSpreadsheet ($50, used by NBC/HBO/Disney)
- **Feasibility:** Yes — CSV parse + comp duplication + text/source replacement
- **Args:** `{ "templateComp": "Lower Third", "csvPath": "/path/to/data.csv" }`

### 25. Render Queue Batch Setup

- **What:** Add multiple comps to render queue with consistent output settings
- **Pain point:** Setting up renders for dozens of comps manually is repetitive
- **Market:** QueueMaster (paid)
- **Feasibility:** Yes — access `app.project.renderQueue`, add items, set output templates
- **Args:** `{ "compNames": ["Final_16x9", "Final_9x16"], "outputTemplate": "Lossless" }`

### 26. Project Health Audit

- **What:** Comprehensive report: unused footage, missing fonts, broken expressions, duplicate items, empty folders
- **Pain point:** Large projects accumulate cruft. No single tool audits everything
- **Feasibility:** Yes — combines several queries into one comprehensive scan
- **Args:** `{ "checks": ["unused", "missing", "expressions", "duplicates", "fonts"] }`

### 27. Explode Shape Layer

- **What:** Split grouped shape layer content into individual layers (one shape per layer)
- **Pain point:** Imported Illustrator files dump everything into one shape layer. Animating individual shapes requires splitting them
- **Market:** Explode Shape Layers ($30, aescripts.com)
- **Feasibility:** Yes but complex — iterate shape groups, create new layers, move shape data, handle nested groups
- **Args:** `{ "layerName": "AI Import" }`

### 28. Incremental Save / Version Snapshot

- **What:** Quick-save project with auto-incrementing version number and optional comment
- **Pain point:** AE has no version control. Users manually "Save As" with version numbers
- **Feasibility:** Trivial — `app.project.save()` with incremented filename
- **Args:** `{ "comment": "before client revisions" }`

---

## Not Feasible as ExtendScript (Requires Plugins/Panels)

These are popular but **cannot** be built as simple .jsx scripts:

| Script | Why Not |
|--------|---------|
| **Overlord** (AI-to-AE shapes) | Cross-app communication, needs CEP on both sides |
| **KBar** (custom toolbar) | Custom panel infrastructure, CEP/UXP extension |
| **Flow** (interactive graph editor) | Interactive UI for curve editing, CEP panel |
| **FX Console** (effect search) | System keyboard shortcuts, floating search UI |
| **AfterCodecs** (H.264 render) | Compiled C++ codec plugin |
| **Shadow Studio** (raytraced shadows) | Pixel-level rendering plugin |
| **TextBox** (auto-sizing bg) | Native plugin applied to render pipeline |

---

## Priority Matrix

Scripts sorted by **impact x feasibility** for our use case (AI agent running .jsx via runner.sh):

| Priority | Script | Complexity | Value |
|----------|--------|-----------|-------|
| P0 | True Comp Duplicator | Medium | Extremely High |
| P0 | Global Font Find & Replace | Low | Extremely High |
| P0 | Remove Unused / Consolidate | Low | Very High |
| P0 | Expression Error Scanner | Low | Very High |
| P0 | Project Health Audit | Medium | Very High |
| P1 | Batch Layer Renamer | Low | High |
| P1 | Layer Stagger / Offset | Low | High |
| P1 | Expression Find & Replace | Medium | High |
| P1 | Organize Project Panel | Low | High |
| P1 | Collect Project Fonts | Low | High |
| P1 | Batch Comp Settings | Low | High |
| P2 | Apply Easing Presets | Medium | High |
| P2 | Anchor Point Mover | Low | Medium |
| P2 | Reverse Keyframes | Low | Medium |
| P2 | Select Layers by Type | Low | Medium |
| P2 | Layer Sort | Low | Medium |
| P2 | Smart Precompose | Medium | Medium |
| P2 | Copy/Paste Easing | Medium | Medium |
| P2 | Missing Footage Relinker | Medium | Medium |
| P3 | SRT Importer | Medium | Medium |
| P3 | Text Export/Import CSV | Medium | Medium |
| P3 | Batch Apply Expression | Low | Medium |
| P3 | Randomize Properties | Low | Low-Medium |
| P3 | Un-PreCompose | High | Medium |
| P3 | Comp From Spreadsheet | High | Medium |
| P3 | Render Queue Batch | Medium | Medium |
| P3 | Incremental Save | Low | Low |
| P3 | Explode Shape Layer | High | Medium |

---

## Key Insight: Query vs Action Scripts

For our skill architecture, these break into two types:

**Query scripts** (read-only, auto-run, reusable across sessions):
- Expression Error Scanner
- Project Health Audit
- Collect Project Fonts
- Select Layers by Type (returns list, doesn't modify)

**Action scripts** (mutations, some need confirmation):
- Everything else — these modify the project

The query scripts should be **permanent files** in the `scripts/` folder (like
`active-state.jsx` and `project-overview.jsx`). The action scripts could either
be permanent files with args-based behavior, or generated on-the-fly into
`ae-action.jsx` as we do today.

**Recommendation:** Build the top query scripts as permanent files. For actions,
build the highest-value ones (True Comp Duplicator, Font Replace, Project
Cleanup) as permanent parameterized scripts, and continue generating simpler
one-offs into `ae-action.jsx`.

---

## Sources

- aescripts.com best sellers and category listings
- Reddit r/AfterEffects, r/motiongraphics
- Adobe Community Forums (After Effects)
- Creative COW forums
- GitHub: kyletmartinez/after-effects-scripts, aturtur/after-effects-scripts
- School of Motion, Ukramedia, Made by Loop blog posts
- VideoHive best-selling AE scripts
- SpotlightFX free scripts collection
- Good Boy Ninja free scripts collection
- Plainly Videos automation guide
- Editing Corp best AE scripts roundup
