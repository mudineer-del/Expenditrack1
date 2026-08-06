# HTML Asset Refactoring Guide

## Overview
This refactoring extracts embedded image assets (base64 data URIs) from the HTML file into separate, clean file references. This makes the code much easier to read, edit, and maintain on GitHub.

## What Changed

### Before
```javascript
const OGDCL_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...VERY_LONG_STRING...";
const OGDCL_LOGO_DARK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...VERY_LONG_STRING...";
```

### After
```javascript
const OGDCL_LOGO = "./assets/ogdcl_logo.png";
const OGDCL_LOGO_DARK = "./assets/ogdcl_logo_dark.png";
```

## File Structure

```
Expenditrack1/
├── index-refactored.html          (2.1 MB - cleaned)
├── assets/
│   ├── ogdcl_logo.png            (48 KB)
│   └── ogdcl_logo_dark.png       (46 KB)
├── assets-manifest.json           (metadata)
└── REFACTORING_NOTES.md          (this file)
```

## How to Use

1. **Deploy Together**: Ensure `assets/` folder is deployed alongside `index-refactored.html`
2. **Path Handling**: Image paths use relative references (`./assets/...`), so they'll work in any directory structure as long as the folder layout is maintained
3. **No Code Changes**: The JavaScript code requires no changes — it already references the asset files by their new paths

## Benefits

✅ **Readability**: HTML file is 5% smaller and much easier to navigate  
✅ **GitHub-Friendly**: Clean file structure, no massive embedded strings  
✅ **Maintainability**: Images can be updated independently  
✅ **Performance**: Browsers can cache images separately from HTML  
✅ **Editing**: Code diffs show actual changes, not encoded image data  

## Asset Manifest

The `assets-manifest.json` file contains metadata about all extracted assets:

```json
{
  "OGDCL_LOGO": {
    "filename": "ogdcl_logo.png",
    "mime_type": "image/png",
    "data": "iVBORw0KGgo..."
  },
  ...
}
```

This is provided for reference and as a backup if assets need to be re-embedded.

## Migration Checklist

- [ ] Copy `index-refactored.html` to your destination
- [ ] Copy `assets/` folder to the same location
- [ ] Verify both logo images load in the browser
- [ ] Test all features that depend on the images
- [ ] Update any deployment scripts if needed
- [ ] Remove the old HTML file once verified

## Notes

- The SheetJS library (Excel import functionality) remains bundled in the HTML, as it's a required library dependency rather than a static asset
- If you need to re-embed assets (for any reason), you can use the provided `assets-manifest.json` as a reference
