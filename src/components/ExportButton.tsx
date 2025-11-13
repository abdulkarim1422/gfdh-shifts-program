import React from 'react';
import * as XLSX from 'xlsx';
import type { ShiftData, DoctorStatistics } from '../types/shift';

interface ExportButtonProps {
  shiftData: ShiftData;
  statistics: DoctorStatistics[];
}

const ExportButton: React.FC<ExportButtonProps> = ({ shiftData, statistics }) => {
  const handleExport = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Statistics Summary
    const statsData = [
      ['Doctor Statistics - ' + shiftData.month],
      [],
      ['Doctor', 'Total Days', 'Total Hours', '24h Shifts', '16h Shifts', '12h Shifts', '8h Shifts', 'Days Worked'],
      ...statistics.map(stat => [
        stat.name,
        stat.totalDays,
        stat.totalHours,
        stat.shifts24h,
        stat.shifts16h,
        stat.shifts12h,
        stat.shifts8h,
        stat.daysList.sort((a, b) => a - b).join(', ')
      ])
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Statistics');

    // Sheet 2: Daily Schedule
    const maxDay = Math.max(...shiftData.allShifts.map(s => s.day));
    const days = Array.from({ length: maxDay }, (_, i) => i + 1);
    
    const scheduleData = [
      ['Daily Schedule - ' + shiftData.month],
      [],
      ['Day', 'Doctor', 'Shift Type', 'Region', 'Hours', 'Start Time', 'End Time']
    ];

    days.forEach(day => {
      const dayShifts = shiftData.allShifts.filter(s => s.day === day);
      if (dayShifts.length > 0) {
        dayShifts.forEach((shift, idx) => {
          const startTime = shift.startDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          const endTime = shift.endDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          
          scheduleData.push([
            idx === 0 ? String(day) : '',
            shift.name,
            shift.shiftType,
            shift.region || '-',
            String(shift.hours),
            startTime,
            endTime
          ]);
        });
      } else {
        scheduleData.push([String(day), 'No shifts', '', '', '', '', '']);
      }
    });

    const ws2 = XLSX.utils.aoa_to_sheet(scheduleData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Schedule');

    // Sheet 3: Summary
    const totalDoctors = new Set(shiftData.allShifts.map(s => s.name)).size;
    const totalShifts = shiftData.allShifts.length;
    const totalHours = statistics.reduce((sum, s) => sum + s.totalHours, 0);
    const avgHours = totalDoctors > 0 ? (totalHours / totalDoctors).toFixed(1) : 0;

    const summaryData = [
      ['Shift Summary - ' + shiftData.month],
      [],
      ['Metric', 'Value'],
      ['Total Doctors', totalDoctors],
      ['Total Shifts', totalShifts],
      ['Total Hours', totalHours],
      ['Average Hours per Doctor', avgHours],
      [],
      ['Shift Type Distribution'],
      ['24-hour Shifts', statistics.reduce((sum, s) => sum + s.shifts24h, 0)],
      ['16-hour Shifts', statistics.reduce((sum, s) => sum + s.shifts16h, 0)],
      ['12-hour Shifts', statistics.reduce((sum, s) => sum + s.shifts12h, 0)],
      ['8-hour Shifts', statistics.reduce((sum, s) => sum + s.shifts8h, 0)]
    ];

    const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Summary');

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `shift-report-${shiftData.month}-${today}.xlsx`;

    // Write the file
    XLSX.writeFile(wb, filename);
  };

  return (
    <button
      onClick={handleExport}
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Export to Excel
    </button>
  );
};

export default ExportButton;
