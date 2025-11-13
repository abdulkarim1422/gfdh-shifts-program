# Hospital Shift Management System

A comprehensive web application for managing and validating monthly doctor shift schedules at hospitals.

## Features

### 📤 File Upload
- Support for multiple file formats: **CSV**, **XLSX**, **XLS**, and **ODS**
- Drag-and-drop interface for easy file upload
- Automatic parsing and data extraction

### ✅ Validation
- **Duplicate Detection**: Identifies doctors scheduled multiple times on the same day
- **Overlap Detection**: Catches conflicting shift assignments
  - 24-hour shifts cannot overlap with any other shift
  - Multiple morning or evening shifts for the same doctor
- **Clear Error Reporting**: Visual error messages with day and doctor information

### 📊 Statistics & Analytics
- **Summary Cards**:
  - Total number of doctors
  - Total shifts scheduled
  - Total hours across all doctors
  - Average hours per doctor

- **Detailed Statistics Table**:
  - Individual doctor statistics
  - Total days worked
  - Total hours
  - Breakdown by shift type (24h, 12h, 8h)
  - List of all days worked

- **Visual Distribution Chart**:
  - Hours distribution across top 10 doctors
  - Percentage breakdown

## File Format

The application expects shift schedules in the following format:

### Structure
```
Row 1: Month name and column headers
Column 1: Day numbers (1-31)
Remaining columns: Shift assignments
```

### Shift Types
- **24-hour shift**: Single doctor name (e.g., `begüm`)
- **12-hour split shift**: Two names separated by `/` (e.g., `bengisu/ceyda`)
  - First name: Morning shift (12 hours)
  - Second name: Evening shift (12 hours)
- **8-hour shift**: Name followed by `08-16` (e.g., `murat 08-16`)

### Example
```csv
ekim25,st,sarı+müs,sarı+müs,...
1,begüm,hüseyin,nahit,anıl,bengisu/ceyda,...
2,çınar,alper,gülcan,yiğit,bengisu/ceyda,...
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

## Build

```bash
npm run build
```

## Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **XLSX** - Excel file parsing
- **PapaParse** - CSV parsing

## Usage

1. **Upload File**: Click the upload area or drag and drop a shift schedule file
2. **Review Validation**: Check for any errors or conflicts in the schedule
3. **View Statistics**: Analyze the distribution of shifts and hours across doctors

## Validation Rules

The system checks for:

1. **No duplicate assignments**: Same doctor cannot have multiple shifts on the same day (except morning + evening split)
2. **No overlapping 24h shifts**: Doctors with 24-hour shifts cannot have any other shifts that day
3. **No duplicate shift types**: Cannot have two morning or two evening shifts for the same doctor on the same day

## Notes

- The application automatically ignores additional information at the end of the file
- Doctor names are normalized to lowercase for consistency
- Days are sorted numerically in the statistics display
- Empty cells and rows are automatically filtered out

---

## React + Vite Template Info


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
