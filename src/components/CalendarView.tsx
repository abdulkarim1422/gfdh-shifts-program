import React, { useState, useEffect } from 'react';
import type { ShiftData, DoctorShift } from '../types/shift';

interface SwapSuggestion {
  problemDoctor: string;
  problemDay: number;
  swapWithDoctor: string;
  swapDay: number;
  reasoning: string;
  conflicts: string[];
}

interface CalendarViewProps {
  shiftData: ShiftData;
}

const CalendarView: React.FC<CalendarViewProps> = ({ shiftData }) => {
  const [selectedShift, setSelectedShift] = useState<{ doctor: string; day: number } | null>(null);
  const [suggestions, setSuggestions] = useState<SwapSuggestion[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [daySearchInput, setDaySearchInput] = useState<string>('');
  const [doctorSearchInput, setDoctorSearchInput] = useState<string>('');
  const [showDaySuggestions, setShowDaySuggestions] = useState(false);
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);

  // Get all available days and doctors
  const allAvailableDays = Array.from(new Set(shiftData.allShifts.map(s => s.day))).sort((a, b) => a - b);
  const allAvailableDoctors = Array.from(new Set(shiftData.allShifts.map(s => s.name))).sort();

  // Filtered suggestions based on search input
  const filteredDaySuggestions = allAvailableDays.filter(day => 
    !selectedDays.includes(day) && 
    String(day).includes(daySearchInput)
  );

  const filteredDoctorSuggestions = allAvailableDoctors.filter(doctor =>
    !selectedDoctors.includes(doctor) &&
    doctor.toLowerCase().includes(doctorSearchInput.toLowerCase())
  );

  const addDay = (day: number) => {
    if (!selectedDays.includes(day)) {
      setSelectedDays([...selectedDays, day]);
      setDaySearchInput('');
      setShowDaySuggestions(false);
    }
  };

  const removeDay = (day: number) => {
    setSelectedDays(selectedDays.filter(d => d !== day));
  };

  const addDoctor = (doctor: string) => {
    if (!selectedDoctors.includes(doctor)) {
      setSelectedDoctors([...selectedDoctors, doctor]);
      setDoctorSearchInput('');
      setShowDoctorSuggestions(false);
    }
  };

  const removeDoctor = (doctor: string) => {
    setSelectedDoctors(selectedDoctors.filter(d => d !== doctor));
  };

  const handleDayInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && daySearchInput) {
      const day = parseInt(daySearchInput);
      if (!isNaN(day)) {
        addDay(day);
      }
    } else if (e.key === 'Escape') {
      setShowDaySuggestions(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDaySuggestions(false);
      setShowDoctorSuggestions(false);
    };

    if (showDaySuggestions || showDoctorSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDaySuggestions, showDoctorSuggestions]);

  const shiftsOverlap = (shift1: DoctorShift, shift2: DoctorShift): boolean => {
    if (shift1.shiftType === '24h' || shift2.shiftType === '24h') return true;
    if (shift1.shiftType === shift2.shiftType && 
        (shift1.shiftType === 'morning' || shift1.shiftType === 'evening')) return true;
    return false;
  };

  const findSwapSuggestions = (doctor: string, day: number): SwapSuggestion[] => {
    const suggestions: SwapSuggestion[] = [];
    const problemDoctor = doctor;
    const problemDay = day;

    // Get all shifts for the problem doctor on the problem day
    const problemShifts = shiftData.allShifts.filter(
      s => s.name === problemDoctor && s.day === problemDay
    );

    if (problemShifts.length === 0) return [];

    // Determine which days to search
    let daysToSearch: number[] = [];
    if (selectedDays.length > 0) {
      daysToSearch = selectedDays;
    } else {
      const allDays = Array.from(new Set(shiftData.allShifts.map(s => s.day)));
      daysToSearch = allDays.filter(d => d !== problemDay);
    }

    // Get all unique doctors
    const allDoctors = Array.from(new Set(shiftData.allShifts.map(s => s.name)));
    const doctorsToConsider = selectedDoctors.length > 0
      ? selectedDoctors.filter(d => d !== problemDoctor)
      : allDoctors.filter(d => d !== problemDoctor);

    // Calculate total hours for problem shift
    const problemShiftTotalHours = problemShifts.reduce((sum, s) => sum + s.hours, 0);

    // For each potential swap candidate
    doctorsToConsider.forEach(candidateDoctor => {
      daysToSearch.forEach(candidateDay => {
        // Get shifts for candidate doctor on candidate day
        const candidateShifts = shiftData.allShifts.filter(
          s => s.name === candidateDoctor && s.day === candidateDay
        );

        // Check if total hours match
        const candidateShiftTotalHours = candidateShifts.reduce((sum, s) => sum + s.hours, 0);
        
        if (problemShiftTotalHours !== candidateShiftTotalHours) {
          return; // Skip - hours don't match
        }

        const conflicts: string[] = [];

        // Check if problem doctor would have conflicts on candidate day
        const problemDoctorOnCandidateDay = shiftData.allShifts.filter(
          s => s.name === problemDoctor && s.day === candidateDay
        );
        
        if (problemDoctorOnCandidateDay.length > 0) {
          candidateShifts.forEach(candShift => {
            problemDoctorOnCandidateDay.forEach(existingShift => {
              if (shiftsOverlap(candShift, existingShift)) {
                conflicts.push(`${problemDoctor} already has ${existingShift.shiftType} shift on day ${candidateDay}`);
              }
            });
          });
        }

        // Check if candidate doctor would have conflicts on problem day
        const candidateDoctorOnProblemDay = shiftData.allShifts.filter(
          s => s.name === candidateDoctor && s.day === problemDay
        );
        
        if (candidateDoctorOnProblemDay.length > 0) {
          problemShifts.forEach(probShift => {
            candidateDoctorOnProblemDay.forEach(existingShift => {
              if (shiftsOverlap(probShift, existingShift)) {
                conflicts.push(`${candidateDoctor} already has ${existingShift.shiftType} shift on day ${problemDay}`);
              }
            });
          });
        }

        // Check rest time violations
        const checkRestTime = (doctorName: string, shiftsToRemove: DoctorShift[], shiftsToAdd: DoctorShift[]) => {
          const allShifts = shiftData.allShifts
            .filter(s => s.name === doctorName)
            .filter(s => !shiftsToRemove.some(r => r.day === s.day && r.column === s.column))
            .concat(shiftsToAdd)
            .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

          for (let i = 0; i < allShifts.length - 1; i++) {
            const restTime = (allShifts[i + 1].startDateTime.getTime() - 
                             allShifts[i].endDateTime.getTime()) / (1000 * 60 * 60);
            if (restTime < 8) {
              conflicts.push(`${doctorName} would have insufficient rest (${restTime.toFixed(1)}h) between day ${allShifts[i].day} and ${allShifts[i + 1].day}`);
            }
          }
        };

        checkRestTime(problemDoctor, problemShifts, candidateShifts.map(cs => ({ ...cs, name: problemDoctor, day: candidateDay })));
        checkRestTime(candidateDoctor, candidateShifts, problemShifts.map(ps => ({ ...ps, name: candidateDoctor, day: problemDay })));

        // Only suggest if there are shifts to swap and not too many conflicts
        if (candidateShifts.length > 0 && conflicts.length <= 2) {
          const shiftTypes = problemShifts.map(s => s.shiftType).join(', ');
          const candidateTypes = candidateShifts.map(s => s.shiftType).join(', ');
          const totalHours = problemShiftTotalHours;
          
          suggestions.push({
            problemDoctor,
            problemDay,
            swapWithDoctor: candidateDoctor,
            swapDay: candidateDay,
            reasoning: `Swap ${problemDoctor}'s ${shiftTypes} shift (${totalHours}h) on day ${problemDay} with ${candidateDoctor}'s ${candidateTypes} shift (${totalHours}h) on day ${candidateDay}`,
            conflicts
          });
        }
      });
    });

    return suggestions.sort((a, b) => a.conflicts.length - b.conflicts.length).slice(0, 15);
  };

  const handleShiftClick = (doctor: string, day: number) => {
    setSelectedShift({ doctor, day });
    setSelectedDays([]);
    setSelectedDoctors([]);
    const newSuggestions = findSwapSuggestions(doctor, day);
    setSuggestions(newSuggestions);
  };

  const closeModal = () => {
    setSelectedShift(null);
    setSuggestions([]);
    setSelectedDays([]);
    setSelectedDoctors([]);
    setDaySearchInput('');
    setDoctorSearchInput('');
  };

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
                  {dayShifts.length} doctors
                </span>
              </div>

              <div className="space-y-1.5">
                {Array.from(doctorShifts.entries()).map(([doctorName, shifts]) => {
                  const shiftTypes = shifts.map(s => s.shiftType);
                  const regions = [...new Set(shifts.map(s => s.region).filter(r => r))];
                  const regionLabel = regions.length > 0 ? regions.join(', ') : '';
                  const colorClass = doctorColors.get(doctorName) || 'bg-gray-100 text-gray-800';
                  
                  let shiftLabel = '';
                  if (shiftTypes.includes('24h')) {
                    shiftLabel = '24h';
                  } else if (shiftTypes.includes('16h')) {
                    shiftLabel = '16h';
                  } else if (shiftTypes.includes('morning') && shiftTypes.includes('evening')) {
                    shiftLabel = 'Full';
                  } else if (shiftTypes.includes('morning')) {
                    shiftLabel = '12 (sabah)';
                  } else if (shiftTypes.includes('evening')) {
                    shiftLabel = '12 (gece)';
                  } else if (shiftTypes.includes('8h')) {
                    shiftLabel = '8h';
                  }

                  return (
                    <button
                      key={doctorName}
                      onClick={() => handleShiftClick(doctorName, day)}
                      className={`w-full px-2 py-1 rounded text-xs font-medium ${colorClass} hover:opacity-80 transition-opacity cursor-pointer text-left`}
                    >
                      <div className="flex justify-between items-center gap-1">
                        <span className="capitalize truncate">{doctorName}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {regionLabel && (
                            <span className="text-[10px] opacity-75 truncate max-w-[60px]" title={regionLabel}>
                              [{regionLabel}]
                            </span>
                          )}
                          <span className="font-bold">{shiftLabel}</span>
                        </div>
                      </div>
                    </button>
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

      {/* Swap Suggestion Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Find Shift Exchange for {selectedShift.doctor}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Day {selectedShift.day} • Click on suggestions to see swap options
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filters */}
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  {/* Days Filter */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Filter by Days
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={daySearchInput}
                        onChange={(e) => {
                          setDaySearchInput(e.target.value);
                          setShowDaySuggestions(true);
                        }}
                        onKeyDown={handleDayInputKeyDown}
                        onFocus={() => setShowDaySuggestions(true)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Type day number..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showDaySuggestions && filteredDaySuggestions.length > 0 && (
                        <div 
                          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {filteredDaySuggestions.slice(0, 10).map(day => (
                            <button
                              key={day}
                              onClick={() => addDay(day)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                            >
                              Day {day}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedDays.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedDays.map(day => (
                          <span
                            key={day}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            Day {day}
                            <button onClick={() => removeDay(day)} className="hover:text-blue-900">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Doctor Filter */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Filter by Doctor Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={doctorSearchInput}
                        onChange={(e) => {
                          setDoctorSearchInput(e.target.value);
                          setShowDoctorSuggestions(true);
                        }}
                        onFocus={() => setShowDoctorSuggestions(true)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Type doctor name..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showDoctorSuggestions && filteredDoctorSuggestions.length > 0 && (
                        <div 
                          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {filteredDoctorSuggestions.slice(0, 10).map(doctor => (
                            <button
                              key={doctor}
                              onClick={() => addDoctor(doctor)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors capitalize"
                            >
                              {doctor}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedDoctors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedDoctors.map(doctor => (
                          <span
                            key={doctor}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded capitalize"
                          >
                            {doctor}
                            <button onClick={() => removeDoctor(doctor)} className="hover:text-blue-900">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        const newSuggestions = findSwapSuggestions(selectedShift.doctor, selectedShift.day);
                        setSuggestions(newSuggestions);
                      }}
                      className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors whitespace-nowrap"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggestions List */}
            <div className="p-6">
              {suggestions.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg">No viable swap suggestions found</p>
                  <p className="text-gray-500 text-sm mt-2">Try adjusting the filters or this shift may require manual coordination</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    Found {suggestions.length} potential exchange{suggestions.length !== 1 ? 's' : ''} (showing up to 15)
                  </p>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        suggestion.conflicts.length === 0
                          ? 'bg-green-50 border-green-300 hover:border-green-400'
                          : 'bg-yellow-50 border-yellow-300 hover:border-yellow-400'
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {suggestion.reasoning}
                          </p>
                          {suggestion.conflicts.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-yellow-800 mb-1">
                                ⚠️ Potential Issues:
                              </p>
                              <ul className="text-xs text-yellow-700 space-y-0.5 ml-4">
                                {suggestion.conflicts.map((conflict, cIndex) => (
                                  <li key={cIndex}>• {conflict}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {suggestion.conflicts.length === 0 && (
                            <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              No conflicts detected - Safe to swap
                            </p>
                          )}
                        </div>
                        <div>
                          {suggestion.conflicts.length === 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                              ✓ Recommended
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                              ⚠ Caution
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
