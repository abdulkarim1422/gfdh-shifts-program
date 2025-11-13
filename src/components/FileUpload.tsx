import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ShiftData, ValidationError, DoctorShift } from '../types/shift';

interface FileUploadProps {
  onDataLoaded: (data: ShiftData) => void;
  onError: (errors: ValidationError[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, onError }) => {
  const parseShiftData = (rows: string[][]): ShiftData => {
    // First row contains month and column headers
    const month = rows[0]?.[0] || 'Unknown';
    
    // Find where the actual data ends (before extra info)
    let dataEndIndex = rows.length;
    for (let i = 1; i < rows.length; i++) {
      const firstCell = rows[i][0]?.trim();
      if (!firstCell || firstCell === '' || isNaN(Number(firstCell))) {
        dataEndIndex = i;
        break;
      }
    }
    
    const allShifts: DoctorShift[] = [];
    const entries = [];
    
    // Parse each day's shifts
    for (let i = 1; i < dataEndIndex; i++) {
      const row = rows[i];
      const day = parseInt(row[0]);
      
      if (isNaN(day)) continue;
      
      const shifts: string[] = [];
      
      // Process each column (shift position)
      for (let col = 1; col < row.length; col++) {
        const cell = row[col]?.trim();
        if (!cell) continue;
        
        shifts.push(cell);
        
        // Check if it's a split shift (morning/evening)
        if (cell.includes('/')) {
          const [name1, name2] = cell.split('/').map(n => n.trim());
          
          if (name1) {
            allShifts.push({
              name: name1.toLowerCase(),
              day,
              shiftType: 'morning',
              column: col,
              hours: 12
            });
          }
          
          if (name2) {
            allShifts.push({
              name: name2.toLowerCase(),
              day,
              shiftType: 'evening',
              column: col,
              hours: 12
            });
          }
        } else if (cell.match(/08-16/i)) {
          // 8-hour shift (08-16 format)
          const name = cell.replace(/08-16/i, '').trim().toLowerCase();
          if (name) {
            allShifts.push({
              name,
              day,
              shiftType: '8h',
              column: col,
              hours: 8
            });
          }
        } else if (cell.match(/\b(16|24)\b/)) {
          // Check for number suffix (yeşil16, yeşil24, etc.)
          const match = cell.match(/^(.+?)\s*(16|24)$/);
          if (match) {
            const name = match[1].trim().toLowerCase();
            const hours = parseInt(match[2]);
            
            if (name) {
              allShifts.push({
                name,
                day,
                shiftType: hours === 16 ? '16h' : '24h',
                column: col,
                hours: hours
              });
            }
          } else {
            // If no match, treat as 24h shift
            allShifts.push({
              name: cell.toLowerCase(),
              day,
              shiftType: '24h',
              column: col,
              hours: 24
            });
          }
        } else {
          // Default: 24-hour shift
          allShifts.push({
            name: cell.toLowerCase(),
            day,
            shiftType: '24h',
            column: col,
            hours: 24
          });
        }
      }
      
      entries.push({ day, shifts });
    }
    
    return { month, entries, allShifts };
  };

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
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
          
          const shiftData = parseShiftData(rows);
          onDataLoaded(shiftData);
          onError([]);
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
  }, [onDataLoaded, onError]);

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

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-2">File format requirements:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>First row: Month name and column headers</li>
          <li>First column: Day numbers (1-31)</li>
          <li>Single name = 24-hour shift</li>
          <li>name16 or name 16 = 16-hour shift (08:00-00:00)</li>
          <li>name24 or name 24 = 24-hour shift (explicit)</li>
          <li>name1/name2 = 12-hour split (morning/evening)</li>
          <li>name 08-16 = 8-hour shift (08:00-16:00)</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
