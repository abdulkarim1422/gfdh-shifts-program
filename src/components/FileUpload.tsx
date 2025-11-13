import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ShiftData, ValidationError, DoctorShift } from '../types/shift';

interface FileUploadProps {
  onDataLoaded: (data: ShiftData) => void;
  onError: (errors: ValidationError[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, onError }) => {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  const parseShiftData = (rows: string[][]): ShiftData => {
    // First row contains month and column headers
    const month = rows[0]?.[0] || 'Unknown';
    const headers = rows[0] || [];
    
    // Helper function to create date-time for shifts
    // Using a base year 2025 for calculations (can be any year)
    const createShiftDateTime = (day: number, hour: number, addDay: number = 0): Date => {
      return new Date(2025, 0, day + addDay, hour, 0, 0);
    };
    
    // Parse column headers to determine shift types
    const columnShiftTypes: Array<{type: 'split' | '24h' | '16h' | '8h' | 'unknown', hours: number, region: string}> = [];
    headers.forEach((header, index) => {
      const h = header?.toLowerCase().trim() || '';
      const originalHeader = header?.trim() || '';
      
      if (h.includes('24') || h.includes('yirmi dört')) {
        columnShiftTypes[index] = { type: '24h', hours: 24, region: originalHeader };
      } else if (h.includes('16') || h.includes('on altı')) {
        columnShiftTypes[index] = { type: '16h', hours: 16, region: originalHeader };
      } else if (h.includes('gündüz') || h.includes('08-16') || h.includes('8-16')) {
        columnShiftTypes[index] = { type: '8h', hours: 8, region: originalHeader };
      } else if (h.includes('/') || h.includes('sarı') || h.includes('müs')) {
        // Split shift columns (morning/evening)
        columnShiftTypes[index] = { type: 'split', hours: 12, region: originalHeader };
      } else {
        columnShiftTypes[index] = { type: 'unknown', hours: 24, region: originalHeader }; // default to 24h
      }
    });
    
    // Find where the actual data ends (before extra info)
    let dataEndIndex = rows.length;
    for (let i = 1; i < rows.length; i++) {
      const firstCell = rows[i][0];
      const firstCellStr = firstCell != null ? String(firstCell).trim() : '';
      if (!firstCellStr || firstCellStr === '' || isNaN(Number(firstCellStr))) {
        dataEndIndex = i;
        break;
      }
    }
    
    const allShifts: DoctorShift[] = [];
    const entries = [];
    
    // Parse each day's shifts
    for (let i = 1; i < dataEndIndex; i++) {
      const row = rows[i];
      const day = parseInt(String(row[0]));
      
      if (isNaN(day)) continue;
      
      const shifts: string[] = [];
      
      // Process each column (shift position)
      for (let col = 1; col < row.length; col++) {
        const cellValue = row[col];
        const cell = cellValue != null ? String(cellValue).trim() : '';
        if (!cell) continue;
        
        shifts.push(cell);
        
        // Get the shift type from column header
        const columnType = columnShiftTypes[col] || { type: 'unknown', hours: 24, region: '' };
        const region = columnType.region;
        
        // Check if it's a split shift - ONLY if cell actually contains "/"
        if (cell.includes('/')) {
          const [name1, name2] = cell.split('/').map(n => n.trim());
          
          if (name1) {
            // Morning shift: 08:00 - 20:00
            allShifts.push({
              name: name1.toLowerCase(),
              day,
              shiftType: 'morning',
              column: col,
              hours: 12,
              startDateTime: createShiftDateTime(day, 8),
              endDateTime: createShiftDateTime(day, 20),
              region
            });
          }
          
          if (name2) {
            // Evening shift: 20:00 - 08:00 next day
            allShifts.push({
              name: name2.toLowerCase(),
              day,
              shiftType: 'evening',
              column: col,
              hours: 12,
              startDateTime: createShiftDateTime(day, 20),
              endDateTime: createShiftDateTime(day, 8, 1), // next day at 08:00
              region
            });
          }
        } else if (cell.match(/08-16/i) || columnType.type === '8h') {
          // 8-hour shift: 08:00 - 16:00
          const name = cell.replace(/08-16/i, '').trim().toLowerCase();
          if (name) {
            allShifts.push({
              name,
              day,
              shiftType: '8h',
              column: col,
              hours: 8,
              startDateTime: createShiftDateTime(day, 8),
              endDateTime: createShiftDateTime(day, 16),
              region
            });
          }
        } else if (columnType.type === '16h' || cell.match(/16$/)) {
          // 16-hour shift: 08:00 - 00:00
          // Cell number (e.g., "uğurcan16") overrides header if present
          const hasExplicit16 = cell.match(/16$/);
          const name = cell.replace(/\s*(16|24|yesil|yeşil)\s*$/gi, '').trim().toLowerCase();
          
          if (name) {
            // If cell explicitly has "16" at the end, use 16h regardless of header
            // Otherwise, use the column type
            const actualShiftType = hasExplicit16 ? '16h' : columnType.type === '16h' ? '16h' : '24h';
            const actualHours = actualShiftType === '16h' ? 16 : 24;
            
            allShifts.push({
              name,
              day,
              shiftType: actualShiftType as '16h' | '24h',
              column: col,
              hours: actualHours,
              startDateTime: createShiftDateTime(day, 8),
              endDateTime: actualShiftType === '16h' 
                ? createShiftDateTime(day, 0, 1)  // 16h: next day at 00:00
                : createShiftDateTime(day, 8, 1), // 24h: next day at 08:00
              region
            });
          }
        } else if (columnType.type === '24h' || cell.match(/24$/)) {
          // 24-hour shift: 08:00 - 08:00 next day
          // Cell number (e.g., "uğurcan24") overrides header if present
          const hasExplicit24 = cell.match(/24$/);
          const name = cell.replace(/\s*(16|24|yesil|yeşil)\s*$/gi, '').trim().toLowerCase();
          
          if (name) {
            // If cell explicitly has "24" at the end, use 24h regardless of header
            // Otherwise, use the column type
            const actualShiftType = hasExplicit24 ? '24h' : columnType.type === '24h' ? '24h' : '16h';
            const actualHours = actualShiftType === '24h' ? 24 : 16;
            
            allShifts.push({
              name,
              day,
              shiftType: actualShiftType as '24h' | '16h',
              column: col,
              hours: actualHours,
              startDateTime: createShiftDateTime(day, 8),
              endDateTime: actualShiftType === '24h'
                ? createShiftDateTime(day, 8, 1)  // 24h: next day at 08:00
                : createShiftDateTime(day, 0, 1), // 16h: next day at 00:00
              region
            });
          }
        } else {
          // Default: treat as determined by column type or explicit number in cell
          // Check if cell has explicit shift duration (16 or 24) at the end
          const hasExplicit24 = cell.match(/24$/);
          const hasExplicit16 = cell.match(/16$/);
          
          // Extract clean name without the numbers
          const cleanName = cell.replace(/\s*(16|24|yesil|yeşil)\s*$/gi, '').trim().toLowerCase();
          
          let shiftType: '24h' | '16h' | '8h';
          let hours: number;
          let startTime: Date;
          let endTime: Date;
          
          // If cell has explicit number, that overrides the column header
          if (hasExplicit24) {
            shiftType = '24h';
            hours = 24;
            startTime = createShiftDateTime(day, 8);
            endTime = createShiftDateTime(day, 8, 1);
          } else if (hasExplicit16) {
            shiftType = '16h';
            hours = 16;
            startTime = createShiftDateTime(day, 8);
            endTime = createShiftDateTime(day, 0, 1);
          } else if (columnType.type === 'split' || columnType.type === 'unknown') {
            // Default to 24h if column is split (but no /) or unknown
            shiftType = '24h';
            hours = 24;
            startTime = createShiftDateTime(day, 8);
            endTime = createShiftDateTime(day, 8, 1);
          } else {
            shiftType = columnType.type as '24h' | '16h' | '8h';
            hours = columnType.hours;
            
            if (shiftType === '16h') {
              startTime = createShiftDateTime(day, 8);
              endTime = createShiftDateTime(day, 0, 1);
            } else if (shiftType === '8h') {
              startTime = createShiftDateTime(day, 8);
              endTime = createShiftDateTime(day, 16);
            } else {
              startTime = createShiftDateTime(day, 8);
              endTime = createShiftDateTime(day, 8, 1);
            }
          }
          
          allShifts.push({
            name: cleanName,
            day,
            shiftType,
            column: col,
            hours,
            startDateTime: startTime,
            endDateTime: endTime,
            region
          });
        }
      }
      
      entries.push({ day, shifts });
    }
    
    return { month, entries, allShifts };
  };

  const processWorkbookSheet = useCallback((wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
      
      const shiftData = parseShiftData(rows);
      onDataLoaded(shiftData);
      onError([]);
    } catch (err) {
      onError([{
        type: 'format',
        message: `Error parsing sheet: ${err instanceof Error ? err.message : 'Unknown error'}`,
        severity: 'error'
      }]);
    }
  }, [onDataLoaded, onError]);

  const handleSheetSelection = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const sheetName = event.target.value;
    setSelectedSheet(sheetName);
    
    if (workbook && sheetName) {
      processWorkbookSheet(workbook, sheetName);
    }
  }, [workbook, processWorkbookSheet]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      // Parse CSV
      Papa.parse(file, {
        complete: (results) => {
          try {
            const shiftData = parseShiftData(results.data as string[][]);
            onDataLoaded(shiftData);
            onError([]);
          } catch (err) {
            onError([{
              type: 'format',
              message: `Error parsing CSV: ${err instanceof Error ? err.message : 'Unknown error'}`,
              severity: 'error'
            }]);
          }
        },
        error: (error) => {
          onError([{
            type: 'format',
            message: `CSV parsing error: ${error.message}`,
            severity: 'error'
          }]);
        }
      });
    } else if (['xlsx', 'xls', 'ods'].includes(fileExtension || '')) {
      // Parse Excel/ODS
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          
          // Store workbook for later use
          setWorkbook(wb);
          
          // If multiple sheets, let user choose; otherwise process first sheet
          if (wb.SheetNames.length > 1) {
            setSelectedSheet(wb.SheetNames[0]);
            // Process first sheet by default
            processWorkbookSheet(wb, wb.SheetNames[0]);
          } else {
            // Single sheet - process immediately
            setSelectedSheet(wb.SheetNames[0]);
            processWorkbookSheet(wb, wb.SheetNames[0]);
          }
        } catch (err) {
          onError([{
            type: 'format',
            message: `Error parsing file: ${err instanceof Error ? err.message : 'Unknown error'}`,
            severity: 'error'
          }]);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      onError([{
        type: 'format',
        message: 'Unsupported file format. Please upload CSV, XLSX, XLS, or ODS files.',
        severity: 'error'
      }]);
    }

    // Reset input
    event.target.value = '';
  }, [onDataLoaded, onError, processWorkbookSheet]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Upload Shift Schedule
      </h2>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center">
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-lg font-medium text-gray-700 mb-2">
              Click to upload or drag and drop
            </span>
            <span className="text-sm text-gray-500">
              CSV, XLSX, XLS, or ODS files
            </span>
          </div>
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.ods"
          onChange={handleFileUpload}
        />
      </div>

      {/* Sheet Selector - shown when workbook has multiple sheets */}
      {workbook && workbook.SheetNames.length > 1 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label htmlFor="sheet-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Sheet/Page:
          </label>
          <select
            id="sheet-select"
            value={selectedSheet}
            onChange={handleSheetSelection}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {workbook.SheetNames.map((sheetName) => (
              <option key={sheetName} value={sheetName}>
                {sheetName}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-600">
            This file contains {workbook.SheetNames.length} sheets. Select which one to process.
          </p>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-2">File format requirements:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>First row: Month name and column headers (headers define shift types)</li>
          <li>First column: Day numbers (1-31)</li>
          <li>Column headers determine shift type for entire column:</li>
          <li className="ml-6">• "yeşil24" or "24" → 24-hour shifts</li>
          <li className="ml-6">• "yeşil16" or "16" → 16-hour shifts (08:00-00:00)</li>
          <li className="ml-6">• "gündüz" or "08-16" → 8-hour shifts (08:00-16:00)</li>
          <li className="ml-6">• "sarı" or "/" in header → 12-hour split shifts</li>
          <li>Cell with "/" always creates morning/evening split (name1/name2)</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
