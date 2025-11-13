# Sheet Selection Feature

## Overview
Added the ability to select which sheet/page to process when uploading multi-sheet XLSX, XLS, or ODS files.

## Changes Made

### 1. Component State Management
Added three new state variables to `FileUpload.tsx`:
- `workbook`: Stores the loaded XLSX workbook object
- `selectedSheet`: Tracks the currently selected sheet name

### 2. New Functions

#### `processWorkbookSheet(wb: XLSX.WorkBook, sheetName: string)`
- Processes a specific sheet from the workbook
- Extracts rows and parses shift data
- Handles errors during sheet processing

#### `handleSheetSelection(event: React.ChangeEvent<HTMLSelectElement>)`
- Handles sheet selection from dropdown
- Updates the selected sheet state
- Triggers processing of the newly selected sheet

### 3. Updated File Upload Handler
When an XLSX/XLS/ODS file is uploaded:
1. The entire workbook is loaded and stored in state
2. If the workbook has multiple sheets:
   - The first sheet is processed by default
   - A dropdown selector appears for the user to choose a different sheet
3. If the workbook has only one sheet:
   - It's processed immediately (same behavior as before)

### 4. UI Enhancement
Added a new sheet selector UI that:
- Only appears when a multi-sheet file is loaded
- Shows all available sheet names in a dropdown
- Displays the total number of sheets
- Has a blue background to make it stand out
- Automatically updates the data when a different sheet is selected

## User Experience

### Single Sheet Files
- Works exactly as before
- No visible changes to the user
- Sheet is processed immediately upon upload

### Multi-Sheet Files
1. Upload the file as usual
2. First sheet is automatically loaded and displayed
3. A blue dropdown box appears below the upload area
4. Select any sheet from the dropdown
5. Data updates immediately when a new sheet is selected
6. No need to re-upload the file

## Technical Details

### File Types Supported
- XLSX (Excel 2007+)
- XLS (Excel 97-2003)
- ODS (OpenDocument Spreadsheet)

### Dependencies
Uses the existing `xlsx` library (already in package.json):
```json
"xlsx": "^0.18.5"
```

### Browser Compatibility
Works in all modern browsers that support:
- File API
- ArrayBuffer
- React hooks (useState, useCallback)

## Testing

To test the feature:
1. Find or create an XLSX/ODS file with multiple sheets
2. Upload it to the application
3. Verify the dropdown appears showing all sheet names
4. Select different sheets and verify the data updates
5. Check that single-sheet files still work without showing the dropdown

## Future Enhancements

Potential improvements:
- Show preview of sheet contents before selection
- Display sheet names with row counts
- Remember last selected sheet per file
- Batch process multiple sheets at once
- Show sheet tabs similar to Excel interface
