import React, { useMemo } from 'react';
import type { ShiftData, DoctorStatistics } from '../types/shift';
import ExportButton from './ExportButton';

interface StatisticsProps {
  shiftData: ShiftData;
}

const Statistics: React.FC<StatisticsProps> = ({ shiftData }) => {
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          Shift Statistics - {shiftData.month}
        </h2>
        <ExportButton shiftData={shiftData} statistics={statistics} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-blue-600 text-sm font-medium mb-1">Total Doctors</p>
          <p className="text-3xl font-bold text-blue-900">{uniqueDoctors}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-green-600 text-sm font-medium mb-1">Total Shifts</p>
          <p className="text-3xl font-bold text-green-900">{totalShifts}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-purple-600 text-sm font-medium mb-1">Total Hours</p>
          <p className="text-3xl font-bold text-purple-900">{totalHours.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-orange-600 text-sm font-medium mb-1">Avg Hours/Doctor</p>
          <p className="text-3xl font-bold text-orange-900">{averageHoursPerDoctor}</p>
        </div>
      </div>

      {/* Detailed Statistics Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Doctor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                24h Shifts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                16h Shifts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                12h Shifts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                8h Shifts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statistics.map((stat, index) => (
              <tr 
                key={stat.name}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {stat.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{stat.totalDays}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">
                    {stat.totalHours}h
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {stat.shifts24h}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                    {stat.shifts16h}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {stat.shifts12h}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {stat.shifts8h}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 max-w-md">
                    {stat.daysList.sort((a, b) => a - b).join(', ')}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Distribution Chart */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Hours Distribution
        </h3>
        <div className="space-y-3">
          {statistics.slice(0, 10).map((stat) => {
            const percentage = totalHours > 0 ? (stat.totalHours / totalHours) * 100 : 0;
            return (
              <div key={stat.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {stat.name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {stat.totalHours}h ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
