import React from 'react';
import type { ShiftData } from '../types/shift';

interface CalendarViewProps {
  shiftData: ShiftData;
}

const CalendarView: React.FC<CalendarViewProps> = ({ shiftData }) => {
  // Get unique doctors for color mapping
  const uniqueDoctors = Array.from(
    new Set(shiftData.allShifts.map(s => s.name))
  ).sort();

  // Generate consistent colors for doctors
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-yellow-100 text-yellow-800',
    'bg-indigo-100 text-indigo-800',
    'bg-red-100 text-red-800',
    'bg-orange-100 text-orange-800',
    'bg-teal-100 text-teal-800',
    'bg-cyan-100 text-cyan-800',
  ];

  const doctorColors = new Map(
    uniqueDoctors.map((doc, idx) => [doc, colors[idx % colors.length]])
  );

  // Group shifts by day
  const shiftsByDay = new Map<number, typeof shiftData.allShifts>();
  shiftData.allShifts.forEach(shift => {
    if (!shiftsByDay.has(shift.day)) {
      shiftsByDay.set(shift.day, []);
    }
    shiftsByDay.get(shift.day)!.push(shift);
  });

  // Get max day number
  const maxDay = Math.max(...Array.from(shiftsByDay.keys()));
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Calendar View - {shiftData.month}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {days.map(day => {
          const dayShifts = shiftsByDay.get(day) || [];
          
          // Group by doctor name
          const doctorShifts = new Map<string, typeof dayShifts>();
          dayShifts.forEach(shift => {
            if (!doctorShifts.has(shift.name)) {
              doctorShifts.set(shift.name, []);
            }
            doctorShifts.get(shift.name)!.push(shift);
          });

          return (
            <div
              key={day}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg text-gray-800">
                  Day {day}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {dayShifts.length} shifts
                </span>
              </div>

              <div className="space-y-1.5">
                {Array.from(doctorShifts.entries()).map(([doctorName, shifts]) => {
                  const shiftTypes = shifts.map(s => s.shiftType);
                  const colorClass = doctorColors.get(doctorName) || 'bg-gray-100 text-gray-800';
                  
                  let shiftLabel = '';
                  if (shiftTypes.includes('24h')) {
                    shiftLabel = '24h';
                  } else if (shiftTypes.includes('16h')) {
                    shiftLabel = '16h';
                  } else if (shiftTypes.includes('morning') && shiftTypes.includes('evening')) {
                    shiftLabel = 'Full';
                  } else if (shiftTypes.includes('morning')) {
                    shiftLabel = 'AM';
                  } else if (shiftTypes.includes('evening')) {
                    shiftLabel = 'PM';
                  } else if (shiftTypes.includes('8h')) {
                    shiftLabel = '8h';
                  }

                  return (
                    <div
                      key={doctorName}
                      className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="capitalize truncate">{doctorName}</span>
                        <span className="ml-1 font-bold">{shiftLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {dayShifts.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No shifts
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-2">
          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
            <span className="font-bold">24h</span> = 24-hour shift
          </div>
          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
            <span className="font-bold">16h</span> = 16-hour shift (08:00-00:00)
          </div>
          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
            <span className="font-bold">Full</span> = Morning + Evening (24h split)
          </div>
          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
            <span className="font-bold">AM</span> = Morning (12h)
          </div>
          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
            <span className="font-bold">PM</span> = Evening (12h)
          </div>
          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
            <span className="font-bold">8h</span> = 8-hour shift (08:00-16:00)
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
