# Quick Start Guide

## Running the Application

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to http://localhost:5173

## Using the Application

### Step 1: Upload Your Shift File

1. Click on the upload area or drag and drop your file
2. Supported formats: `.csv`, `.xlsx`, `.xls`, `.ods`
3. The file should follow this format:
   - Row 1: Month name and headers
   - Column 1: Day numbers (1-31)
   - Other columns: Doctor names and shift assignments

### Step 2: Review Validation Results

After upload, the system automatically checks for:

- ✅ **No errors**: Green success message
- ❌ **Errors found**: Red error messages with details
  - Duplicate assignments
  - Overlapping shifts
  - Invalid shift combinations

### Step 3: View the Calendar

- See all shifts organized by day
- Color-coded by doctor
- Shift types clearly labeled:
  - **24h** = 24-hour shift
  - **Full** = Morning + Evening (12h + 12h)
  - **AM** = Morning shift (12h)
  - **PM** = Evening shift (12h)
  - **8h** = 8-hour shift (08-16)

### Step 4: Analyze Statistics

Review comprehensive statistics including:

- **Summary Cards**:
  - Total doctors
  - Total shifts
  - Total hours
  - Average hours per doctor

- **Detailed Table**:
  - Per-doctor breakdown
  - Total days and hours
  - Shift type counts
  - List of days worked

- **Distribution Chart**:
  - Visual representation of hours distribution
  - Percentage breakdown

### Step 5: Export Results

Click the "Export to Excel" button to download a report containing:

- **Statistics Sheet**: Complete doctor statistics
- **Schedule Sheet**: Day-by-day assignments
- **Summary Sheet**: Overall metrics

The file is automatically named with the month and current date.

## File Format Example

```csv
ekim25,st,sarı+müs,sarı+müs,sarı+müs,sarı+müs,yeşil 24,yeşil24,yeşil16,yeşil16,gündüz,gündüz,sarı +müş
1,begüm,hüseyin,nahit,anıl,bengisu/ceyda,elif,münire/saadet,kenan,orhan,murat 08-16,tanju 08-16
2,çınar,alper,gülcan,yiğit,bengisu/ceyda,abdül/alperen,münire/saadet,uğurcan,orhan,,tanju 08-16
3,hüseyin,busegül,nahit,algın,irem/sabriye,abdül/alperen,asude/sevdenur,elif,kenan
```

### Shift Type Formats:

- **Single name**: `begüm` → 24-hour shift
- **Name1/Name2**: `bengisu/ceyda` → Morning shift for bengisu, Evening shift for ceyda
- **Name 08-16**: `murat 08-16` → 8-hour shift for murat

## Common Issues

### File Not Loading?
- Check the file format (must be CSV, XLSX, XLS, or ODS)
- Ensure the first column contains day numbers
- Verify the file isn't corrupted

### Validation Errors?
- Review the error messages - they show exactly which doctor and day has issues
- Check for duplicate names on the same day
- Ensure 24h shifts don't overlap with other shifts

### Statistics Look Wrong?
- Verify the shift format in your file
- Check that split shifts use the `/` character
- Ensure 8-hour shifts include "08-16"

## Tips for Best Results

1. **Clean your data**: Remove extra notes/comments at the end of the file
2. **Consistent naming**: Use the same spelling for each doctor
3. **Check before uploading**: Review your source file for obvious errors
4. **Regular exports**: Download reports for record-keeping
5. **Use validation**: Fix all errors before finalizing schedules

## Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## Need Help?

- Check the validation messages - they're designed to be clear and actionable
- Review the example files in the `shift-files/` directory
- Make sure your file format matches the example

---

**Happy scheduling! 🏥**
