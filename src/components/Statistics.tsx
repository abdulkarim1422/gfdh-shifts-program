import React, { useMemo, useState } from 'react';
import type { ShiftData, DoctorStatistics } from '../types/shift';
import ExportButton from './ExportButton';

interface StatisticsProps {
  shiftData: ShiftData;
}

const Statistics: React.FC<StatisticsProps> = ({ shiftData }) => {
  const [isRelativeMode, setIsRelativeMode] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // November (0-indexed)
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (doctorName: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(doctorName)) {
        newSet.delete(doctorName);
      } else {
        newSet.add(doctorName);
      }
      return newSet;
    });
  };

  // Function to open modal for calendar export
  const openCalendarModal = (doctorName: string) => {
    setSelectedDoctor(doctorName);
    setShowCalendarModal(true);
  };

  // Function to generate iCalendar (.ics) file for a doctor's shifts
  const generateCalendarFile = () => {
    const doctorShifts = shiftData.allShifts.filter(shift => shift.name === selectedDoctor);
    
    // Helper function to create date-time with selected month/year
    const createShiftDateTime = (day: number, hour: number, addDay: number = 0): Date => {
      const date = new Date(selectedYear, selectedMonth, day + addDay, hour, 0, 0);
      return date;
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[selectedMonth];
    
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Shift Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${selectedDoctor} - ${monthName} ${selectedYear} Shifts
X-WR-TIMEZONE:UTC
`;

    doctorShifts.forEach((shift, index) => {
      // Recreate shift dates with the selected month and year
      let startDate: Date;
      let endDate: Date;

      switch (shift.shiftType) {
        case 'morning':
          startDate = createShiftDateTime(shift.day, 8);
          endDate = createShiftDateTime(shift.day, 20);
          break;
        case 'evening':
          startDate = createShiftDateTime(shift.day, 20);
          endDate = createShiftDateTime(shift.day, 8, 1);
          break;
        case '8h':
          startDate = createShiftDateTime(shift.day, 8);
          endDate = createShiftDateTime(shift.day, 16);
          break;
        case '16h':
          startDate = createShiftDateTime(shift.day, 8);
          endDate = createShiftDateTime(shift.day, 0, 1);
          break;
        case '24h':
        default:
          startDate = createShiftDateTime(shift.day, 8);
          endDate = createShiftDateTime(shift.day, 8, 1);
          break;
      }

      const startDateStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icsContent += `BEGIN:VEVENT
UID:shift-${selectedDoctor}-${shift.day}-${index}@shifts-program
DTSTAMP:${now}
DTSTART:${startDateStr}
DTEND:${endDateStr}
SUMMARY:${shift.shiftType.toUpperCase()} Shift - ${shift.region}
DESCRIPTION:Shift Type: ${shift.shiftType}\\nRegion: ${shift.region}\\nHours: ${shift.hours}h
LOCATION:${shift.region}
STATUS:CONFIRMED
END:VEVENT
`;
    });

    icsContent += 'END:VCALENDAR';
    
    // Create and download the .ics file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedDoctor.replace(/\s+/g, '_')}_${monthName}_${selectedYear}_shifts.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    // Close modal
    setShowCalendarModal(false);
  };

  const statistics = useMemo(() => {
    const doctorMap = new Map<string, DoctorStatistics>();

    shiftData.allShifts.forEach(shift => {
      if (!doctorMap.has(shift.name)) {
        doctorMap.set(shift.name, {
          name: shift.name,
          totalDays: 0,
          totalHours: 0,
          shifts24h: 0,
          shifts12h: 0,
          shifts16h: 0,
          shifts8h: 0,
          daysList: []
        });
      }

      const stats = doctorMap.get(shift.name)!;
      
      // Add day to list if not already present
      if (!stats.daysList.includes(shift.day)) {
        stats.daysList.push(shift.day);
        stats.totalDays++;
      }

      // Calculate hours based on shift type (use the hours field from shift)
      stats.totalHours += shift.hours;
      
      switch (shift.shiftType) {
        case '24h':
          stats.shifts24h++;
          break;
        case 'morning':
        case 'evening':
          stats.shifts12h++;
          break;
        case '16h':
          stats.shifts16h++;
          break;
        case '8h':
          stats.shifts8h++;
          break;
      }
    });

    // Sort by total hours (descending)
    return Array.from(doctorMap.values())
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [shiftData]);

  const totalShifts = shiftData.allShifts.length;
  const uniqueDoctors = new Set(shiftData.allShifts.map(s => s.name)).size;
  const totalHours = statistics.reduce((sum, s) => sum + s.totalHours, 0);
  const averageHoursPerDoctor = uniqueDoctors > 0 ? (totalHours / uniqueDoctors).toFixed(1) : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Shift Statistics - {shiftData.month}
        </h2>
        <ExportButton shiftData={shiftData} statistics={statistics} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
          <p className="text-blue-600 text-xs sm:text-sm font-medium mb-1">Total Doctors</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-900">{uniqueDoctors}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 sm:p-4">
          <p className="text-green-600 text-xs sm:text-sm font-medium mb-1">Total Shifts</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-900">{totalShifts}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
          <p className="text-purple-600 text-xs sm:text-sm font-medium mb-1">Total Hours</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-900">{totalHours.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
          <p className="text-orange-600 text-xs sm:text-sm font-medium mb-1">Avg Hours/Doctor</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-900">{averageHoursPerDoctor}</p>
        </div>
      </div>

      {/* Detailed Statistics Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    24h
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    16h
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    12h
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    8h
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day List
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calendar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statistics.map((stat, index) => {
                  const isExpanded = expandedRows.has(stat.name);
                  return (
                    <React.Fragment key={stat.name}>
                      <tr 
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleRowExpansion(stat.name)}
                              className="md:hidden p-1 hover:bg-gray-200 rounded transition-colors"
                              aria-label={isExpanded ? "Collapse details" : "Expand details"}
                            >
                              <svg 
                                className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={2} 
                                  d="M9 5l7 7-7 7" 
                                />
                              </svg>
                            </button>
                            <div className="text-xs sm:text-sm font-medium text-gray-900 capitalize">
                              {stat.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">{stat.totalDays}</div>
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-semibold text-gray-900">
                            {stat.totalHours}h
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {stat.shifts24h}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            {stat.shifts16h}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {stat.shifts12h}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {stat.shifts8h}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-md">
                            {stat.daysList.sort((a, b) => a - b).join(', ')}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <button
                            onClick={() => openCalendarModal(stat.name)}
                            className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            title="Download calendar file for all shifts"
                          >
                            <svg 
                              className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                              />
                            </svg>
                            <span className="hidden sm:inline">Add to Calendar</span>
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Details Row for Mobile */}
                      {isExpanded && (
                        <tr className={`md:hidden ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td colSpan={9} className="px-3 py-3">
                            <div className="space-y-3 border-l-4 border-indigo-500 pl-3">
                              {/* Shift Breakdown */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 mb-2">Shift Breakdown:</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center justify-between bg-blue-50 rounded px-2 py-1.5">
                                    <span className="text-xs text-blue-700 font-medium">24h Shifts:</span>
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                      {stat.shifts24h}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between bg-purple-50 rounded px-2 py-1.5">
                                    <span className="text-xs text-purple-700 font-medium">16h Shifts:</span>
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                      {stat.shifts16h}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between bg-green-50 rounded px-2 py-1.5">
                                    <span className="text-xs text-green-700 font-medium">12h Shifts:</span>
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      {stat.shifts12h}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between bg-yellow-50 rounded px-2 py-1.5">
                                    <span className="text-xs text-yellow-700 font-medium">8h Shifts:</span>
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      {stat.shifts8h}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* Day List */}
                              <div className="lg:hidden">
                                <h4 className="text-xs font-semibold text-gray-700 mb-1">Shift Days:</h4>
                                <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5">
                                  {stat.daysList.sort((a, b) => a - b).join(', ')}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="mt-6 sm:mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
            Hours Distribution
          </h3>
          <button
            onClick={() => setIsRelativeMode(!isRelativeMode)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {isRelativeMode ? 'Show Absolute' : 'Show Relative'}
          </button>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {statistics.map((stat) => {
            const maxHours = statistics[0]?.totalHours || 1;
            const absolutePercentage = totalHours > 0 ? (stat.totalHours / totalHours) * 100 : 0;
            const relativePercentage = maxHours > 0 ? (stat.totalHours / maxHours) * 100 : 0;
            const displayPercentage = isRelativeMode ? relativePercentage : absolutePercentage;
            
            return (
              <div key={stat.name}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 capitalize">
                    {stat.name}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-600 flex flex-wrap gap-x-2">
                    <span>{stat.totalHours}h ({absolutePercentage.toFixed(1)}%)</span>
                    {isRelativeMode && relativePercentage < 100 && (
                      <span className="text-blue-600">
                        {relativePercentage.toFixed(1)}% of max
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5">
                  <div
                    className="bg-blue-600 h-2 sm:h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${displayPercentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Export Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
              Export Calendar for {selectedDoctor}
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="month-select" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Select Month:
                </label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={0}>January</option>
                  <option value={1}>February</option>
                  <option value={2}>March</option>
                  <option value={3}>April</option>
                  <option value={4}>May</option>
                  <option value={5}>June</option>
                  <option value={6}>July</option>
                  <option value={7}>August</option>
                  <option value={8}>September</option>
                  <option value={9}>October</option>
                  <option value={10}>November</option>
                  <option value={11}>December</option>
                </select>
              </div>

              <div>
                <label htmlFor="year-select" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Select Year:
                </label>
                <input
                  id="year-select"
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  min={2020}
                  max={2030}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 rounded p-2 sm:p-3">
                <p className="font-medium mb-1">Note:</p>
                <p>The calendar file (.ics) will contain all shifts for this doctor with the dates set to the selected month and year.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={generateCalendarFile}
                className="flex-1 px-4 py-2 text-sm sm:text-base bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Download Calendar
              </button>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="flex-1 px-4 py-2 text-sm sm:text-base bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
