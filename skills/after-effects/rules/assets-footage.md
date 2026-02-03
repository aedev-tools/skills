# Assets & Footage

> Rule file for importing, replacing, organizing, and inspecting assets and footage in After Effects via ExtendScript.

---

## Importing Files

Use `app.project.importFile()` with an `ImportOptions` object built from a `File` reference.

```jsx
var io = new ImportOptions(new File("/absolute/path/to/file.mov"));
var item = app.project.importFile(io);
```

The returned object is a `FootageItem` (for single files) or a `CompItem` (when importing as composition).

### ImportAsType

Control how the file is interpreted with `importOptions.importAs`:

```jsx
// Import as footage (default for single media files)
var io = new ImportOptions(new File("/path/to/clip.mov"));
io.importAs = ImportAsType.FOOTAGE;
var footage = app.project.importFile(io);

// Import as composition (e.g. layered PSD, AI file)
var io = new ImportOptions(new File("/path/to/design.psd"));
io.importAs = ImportAsType.COMP;
var comp = app.project.importFile(io);

// Import an After Effects project into the current project
var io = new ImportOptions(new File("/path/to/other_project.aep"));
io.importAs = ImportAsType.PROJECT;
app.project.importFile(io);
```

### Importing Image Sequences

Enable sequence detection and alphabetical ordering on the `ImportOptions` object:

```jsx
var io = new ImportOptions(new File("/path/to/sequence/frame_0001.png"));
io.sequence = true;
io.forceAlphabetical = true;
var seqItem = app.project.importFile(io);
```

The `File` object must point to the **first frame** of the sequence. After Effects infers the remaining frames from the filename pattern.

---

## Replacing Footage

### Replace with a Single File

```jsx
footageItem.replace(new File("/absolute/path/to/new_file.mov"));
```

### Replace with an Image Sequence

```jsx
// firstFrame: File object pointing to the first frame
// forceAlphabetical: boolean — true to sort frames alphabetically
footageItem.replaceWithSequence(new File("/path/to/new_seq/frame_0001.png"), true);
```

Both methods update every composition that references the footage item.

---

## Creating and Organizing Folders

### Creating Folders

```jsx
var folder = app.project.items.addFolder("Assets");
```

Folders are `FolderItem` objects in the project panel.

### Nested Folders

```jsx
var rootFolder = app.project.items.addFolder("Project Assets");
var subfolder = app.project.items.addFolder("Footage");
subfolder.parentFolder = rootFolder;
```

### Moving Items into Folders

Assign the `parentFolder` property to relocate any project item (footage, comp, solid, folder):

```jsx
item.parentFolder = folder;
```

### Example: Organize All Footage into a Folder

```jsx
var folder = app.project.items.addFolder("Footage");
for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof FootageItem && item.parentFolder === app.project.rootFolder) {
        item.parentFolder = folder;
    }
}
```

---

## Footage Properties

Every `FootageItem` exposes properties about its media:

```jsx
var item = app.project.item(1); // assumes a FootageItem

item.name;            // String — display name in the project panel
item.width;           // Number — pixel width (0 if no video stream)
item.height;          // Number — pixel height (0 if no video stream)
item.duration;        // Number — duration in seconds (0 for stills)
item.hasVideo;        // Boolean — true if the item contains a video stream
item.hasAudio;        // Boolean — true if the item contains an audio stream
item.footageMissing;  // Boolean — true if the source file cannot be found on disk
item.frameRate;       // Number — frames per second
item.time;            // Number — current time (rarely used on footage)
```

### The mainSource Property

`footageItem.mainSource` returns a source descriptor object. Its type tells you what kind of asset the footage item wraps:

```jsx
var src = footageItem.mainSource;

if (src instanceof FileSource) {
    // File-based footage — video, image, audio, sequence
    var filePath = src.file.fsName; // full OS path to the source file
}

if (src instanceof SolidSource) {
    // Solid — created via comp.layers.addSolid()
    var color = src.color; // [r, g, b] in 0-1 range
}

if (src instanceof PlaceholderSource) {
    // Placeholder — a stand-in for missing or not-yet-linked media
}
```

---

## Finding Footage by Name or Path

### By Name

```jsx
function findFootageByName(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FootageItem && item.name === name) {
            return item;
        }
    }
    return null;
}
```

### By File Path

```jsx
function findFootageByPath(filePath) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FootageItem && item.mainSource instanceof FileSource) {
            if (item.mainSource.file.fsName === filePath) {
                return item;
            }
        }
    }
    return null;
}
```

---

## Proxies

Proxies let you substitute a lighter file for preview without changing the final render source.

### Set a Proxy

```jsx
footageItem.setProxy(new File("/path/to/proxy_file.mov"));
```

### Remove a Proxy

```jsx
footageItem.setProxyToNone();
```

### Check Proxy Status

```jsx
if (footageItem.proxySource !== null) {
    // proxy is active
    var proxyPath = footageItem.proxySource.file.fsName;
}
```

---

## Interpret Footage

Interpretation settings live on `footageItem.mainSource`. After changing any interpretation property, call `footageItem.mainSource.guessAlphaMode()` or set values explicitly.

### Conform Frame Rate

```jsx
// Override the interpreted frame rate (does not re-encode)
footageItem.mainSource.conformFrameRate = 24;
```

### Alpha Mode

```jsx
// AlphaMode.IGNORE — treat as opaque
// AlphaMode.STRAIGHT — straight (unmatted) alpha
// AlphaMode.PREMULTIPLIED — premultiplied alpha
footageItem.mainSource.alphaMode = AlphaMode.PREMULTIPLIED;
```

### Field Separation

```jsx
// FieldSeparationType.OFF — progressive (no fields)
// FieldSeparationType.UPPER_FIELD_FIRST
// FieldSeparationType.LOWER_FIELD_FIRST
footageItem.mainSource.fieldSeparationType = FieldSeparationType.OFF;
```

---

## MUST

- **MUST** use absolute file paths when constructing `File` objects for import or replace. Relative paths resolve unpredictably and differ between macOS and Windows:

```jsx
// WRONG — relative path, will fail or resolve to the wrong location
var io = new ImportOptions(new File("footage/clip.mov"));

// CORRECT — absolute path
var io = new ImportOptions(new File("/Users/me/project/footage/clip.mov"));
```

- **MUST** verify that the file exists before importing. `ImportOptions` will throw if the file does not exist:

```jsx
var f = new File("/path/to/file.mov");
if (!f.exists) {
    writeResult({ error: "File not found: " + f.fsName });
    return;
}
var io = new ImportOptions(f);
var item = app.project.importFile(io);
```

- **MUST** wrap all import and project-structure operations in an undo group:

```jsx
app.beginUndoGroup("AE Assistant: import assets");
try {
    // ... import / organize operations ...
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```

- **MUST** use 1-based indexing when iterating `app.project.items` or `app.project.numItems`. Index 0 does not exist:

```jsx
for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
}
```

- **MUST** check `instanceof FootageItem` before accessing footage-specific properties like `.mainSource`, `.hasVideo`, `.footageMissing`, etc. `CompItem` and `FolderItem` do not have these properties:

```jsx
var item = app.project.item(i);
if (item instanceof FootageItem) {
    var src = item.mainSource;
}
```

---

## FORBIDDEN

- **FORBIDDEN:** Using relative paths in `new File()` calls. Always provide a full absolute path. Relative paths are resolved from an unpredictable working directory and are not portable.

- **FORBIDDEN:** Using ES5+ syntax. Use `var`, not `let`/`const`. Use string concatenation with `+`, not template literals. Use `function` declarations, not arrow functions.

- **FORBIDDEN:** Calling `footageItem.mainSource.file` on a `SolidSource` or `PlaceholderSource`. Only `FileSource` has a `.file` property. Always check the source type first:

```jsx
// WRONG — throws if mainSource is not a FileSource
var path = footageItem.mainSource.file.fsName;

// CORRECT
if (footageItem.mainSource instanceof FileSource) {
    var path = footageItem.mainSource.file.fsName;
}
```

- **FORBIDDEN:** Importing files without error handling. `app.project.importFile()` throws when the file is missing, the format is unsupported, or import options are invalid. Always wrap in try/catch.

- **FORBIDDEN:** Assuming `importAs` is valid for all file types. Not every file supports every `ImportAsType`. For example, `ImportAsType.COMP` only works with layered formats (PSD, AI). Attempting an unsupported combination throws an error.

---

## Gotchas

- **Import paths must be absolute.** `new File("relative/path.mov")` resolves from ExtendScript's internal working directory, which is unpredictable and changes between sessions. Always build full paths. If you receive a relative path from the user, resolve it against a known base first.

- **macOS `File` paths use `/` separators.** On macOS, pass POSIX-style paths: `/Users/name/footage/clip.mov`. On Windows, use backslashes or forward slashes (both work): `C:/Users/name/footage/clip.mov`. The `File.fsName` property always returns the OS-native path format.

- **`importFile` can return either a `FootageItem` or a `CompItem`.** When `importAs` is `ImportAsType.COMP`, the return value is a `CompItem`. When importing a layered file as `COMP`, AE may also create a folder containing the individual layers as footage items. Do not assume the return type without checking.

- **Sequence import requires the first frame.** `ImportOptions.sequence = true` expects the `File` to point to the first numbered frame in the sequence. AE reads the filename pattern and finds subsequent frames automatically. If the first frame does not follow a recognized numbering pattern, the import fails silently or imports only that single frame.

- **`numItems` changes during loops that add items.** When importing files inside a loop over `app.project.numItems`, new items increment `numItems`. Cache the count before the loop or iterate backward to avoid processing newly added items:

```jsx
var count = app.project.numItems;
for (var i = 1; i <= count; i++) {
    // safe — count was captured before any imports
}
```

- **Replacing footage is destructive.** `footageItem.replace()` and `footageItem.replaceWithSequence()` permanently change the source for that item across all compositions. There is no built-in "unreplace" other than undo.

- **`footageMissing` is read-only.** You cannot set `footageMissing` to fix a broken link. Use `footageItem.replace(new File(correctPath))` to relink missing footage.

- **Proxy does not affect final render by default.** When rendering, AE uses the original source unless the render settings explicitly say "Use All Proxies." Setting a proxy only affects previews in the timeline.

- **`conformFrameRate` is not the same as source frame rate.** `mainSource.conformFrameRate` overrides the interpreted frame rate. Setting it to `0` resets to the file's native frame rate. The original frame rate of the file is not directly readable — `footageItem.frameRate` reflects the conformed (interpreted) rate.

---

## Complete Example: Import a File, Create a Folder, Move It In

```jsx
app.beginUndoGroup("AE Assistant: import and organize");
try {
    // 1. Define the file path and validate it exists
    var filePath = "/Users/me/project/footage/hero_shot.mov";
    var f = new File(filePath);
    if (!f.exists) {
        writeResult({ error: "File not found: " + f.fsName });
        return;
    }

    // 2. Import the file as footage
    var io = new ImportOptions(f);
    io.importAs = ImportAsType.FOOTAGE;
    var footageItem = app.project.importFile(io);

    // 3. Create a folder in the project panel
    var folder = app.project.items.addFolder("Imported Footage");

    // 4. Move the imported item into the folder
    footageItem.parentFolder = folder;

    // 5. Report results
    writeResult({
        success: true,
        message: "Imported and organized footage",
        item: {
            name: footageItem.name,
            width: footageItem.width,
            height: footageItem.height,
            duration: footageItem.duration,
            hasVideo: footageItem.hasVideo,
            hasAudio: footageItem.hasAudio,
            folder: folder.name
        }
    });
} catch (e) {
    writeResult({ error: e.toString(), line: e.line });
} finally {
    app.endUndoGroup();
}
```
