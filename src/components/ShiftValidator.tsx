import React, { useEffect, useState } from 'react';
import type { ShiftData, ValidationError, DoctorShift } from '../types/shift';

interface SwapSuggestion {
  errorIndex: number;
  problemDoctor: string;
  problemDay: number;
  swapWithDoctor: string;
  swapDay: number;
  reasoning: string;
  conflicts: string[];
}

interface ShiftValidatorProps {
  shiftData: ShiftData;
  errors: ValidationError[];
  onErrorsUpdate: (errors: ValidationError[]) => void;
}

const ShiftValidator: React.FC<ShiftValidatorProps> = ({ 
  shiftData, 
  errors, 
  onErrorsUpdate 
}) => {
  const [selectedError, setSelectedError] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<SwapSuggestion[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [daySearchInput, setDaySearchInput] = useState<string>('');
  const [doctorSearchInput, setDoctorSearchInput] = useState<string>('');
  const [showDaySuggestions, setShowDaySuggestions] = useState(false);
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const findSwapSuggestions = (errorIndex: number, error: ValidationError): SwapSuggestion[] => {
    if (!error.doctor || !error.day) return [];

    const suggestions: SwapSuggestion[] = [];
    const problemDoctor = error.doctor;
    const problemDay = error.day;

    // Get all shifts for the problem doctor on the problem day
    const problemShifts = shiftData.allShifts.filter(
      s => s.name === problemDoctor && s.day === problemDay
    );

    if (problemShifts.length === 0) return [];

    // Determine which days to search (either filtered or all)
    let daysToSearch: number[] = [];
    if (selectedDays.length > 0) {
      daysToSearch = selectedDays;
    } else {
      // Search all days except the problem day
      const allDays = Array.from(new Set(shiftData.allShifts.map(s => s.day)));
      daysToSearch = allDays.filter(d => d !== problemDay);
    }

    // Get all unique doctors
    const allDoctors = Array.from(new Set(shiftData.allShifts.map(s => s.name)));
    const doctorsToConsider = selectedDoctors.length > 0
      ? selectedDoctors.filter(d => d !== problemDoctor)
      : allDoctors.filter(d => d !== problemDoctor);

    // For each potential swap candidate
    doctorsToConsider.forEach(candidateDoctor => {
      daysToSearch.forEach(candidateDay => {
        // Get shifts for candidate doctor on candidate day
        const candidateShifts = shiftData.allShifts.filter(
          s => s.name === candidateDoctor && s.day === candidateDay
        );

        // CRITICAL: Check if total hours match (can only swap shifts with same total duration)
        const problemShiftTotalHours = problemShifts.reduce((sum, s) => sum + s.hours, 0);
        const candidateShiftTotalHours = candidateShifts.reduce((sum, s) => sum + s.hours, 0);
        
        if (problemShiftTotalHours !== candidateShiftTotalHours) {
          // Skip this swap - hours don't match
          return;
        }

        // Check if swap is feasible
        const conflicts: string[] = [];

        // Check if problem doctor would have conflicts on candidate day
        const problemDoctorOnCandidateDay = shiftData.allShifts.filter(
          s => s.name === problemDoctor && s.day === candidateDay
        );
        
        if (problemDoctorOnCandidateDay.length > 0) {
          // Check time conflicts
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

        // Check rest time violations for problem doctor
        const problemDoctorAllShifts = shiftData.allShifts
          .filter(s => s.name === problemDoctor)
          .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

        // Simulate the swap and check rest times
        const simulatedShifts = problemDoctorAllShifts
          .filter(s => !(s.day === problemDay && problemShifts.some(ps => ps.column === s.column)))
          .concat(candidateShifts.map(cs => ({ ...cs, name: problemDoctor, day: candidateDay })))
          .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

        for (let i = 0; i < simulatedShifts.length - 1; i++) {
          const restTime = (simulatedShifts[i + 1].startDateTime.getTime() - 
                           simulatedShifts[i].endDateTime.getTime()) / (1000 * 60 * 60);
          if (restTime < 8) {
            conflicts.push(`${problemDoctor} would have insufficient rest (${restTime.toFixed(1)}h) between day ${simulatedShifts[i].day} and ${simulatedShifts[i + 1].day}`);
          }
        }

        // Check rest time for candidate doctor
        const candidateDoctorAllShifts = shiftData.allShifts
          .filter(s => s.name === candidateDoctor)
          .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

        const simulatedCandidateShifts = candidateDoctorAllShifts
          .filter(s => !(s.day === candidateDay && candidateShifts.some(cs => cs.column === s.column)))
          .concat(problemShifts.map(ps => ({ ...ps, name: candidateDoctor, day: problemDay })))
          .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

        for (let i = 0; i < simulatedCandidateShifts.length - 1; i++) {
          const restTime = (simulatedCandidateShifts[i + 1].startDateTime.getTime() - 
                           simulatedCandidateShifts[i].endDateTime.getTime()) / (1000 * 60 * 60);
          if (restTime < 8) {
            conflicts.push(`${candidateDoctor} would have insufficient rest (${restTime.toFixed(1)}h) between day ${simulatedCandidateShifts[i].day} and ${simulatedCandidateShifts[i + 1].day}`);
          }
        }

        // Only suggest if there are shifts to swap and not too many conflicts
        if (candidateShifts.length > 0 && conflicts.length <= 2) {
          const shiftTypes = problemShifts.map(s => s.shiftType).join(', ');
          const candidateTypes = candidateShifts.map(s => s.shiftType).join(', ');
          const totalHours = problemShiftTotalHours;
          
          suggestions.push({
            errorIndex,
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

    // Sort by number of conflicts (fewer is better)
    return suggestions.sort((a, b) => a.conflicts.length - b.conflicts.length).slice(0, 10);
  };

  const shiftsOverlap = (shift1: DoctorShift, shift2: DoctorShift): boolean => {
    if (shift1.shiftType === '24h' || shift2.shiftType === '24h') return true;
    if (shift1.shiftType === shift2.shiftType && 
        (shift1.shiftType === 'morning' || shift1.shiftType === 'evening')) return true;
    return false;
  };

  const handleGenerateSuggestions = (errorIndex: number) => {
    if (selectedError === errorIndex && showSuggestions) {
      setShowSuggestions(false);
      setSelectedError(null);
    } else {
      setSelectedError(errorIndex);
      const error = errors[errorIndex];
      const newSuggestions = findSwapSuggestions(errorIndex, error);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    const validateShifts = () => {
      const newErrors: ValidationError[] = [];
      
      // Group shifts by day and doctor
      const shiftsByDay = new Map<number, Map<string, number>>();
      
      shiftData.allShifts.forEach(shift => {
        if (!shiftsByDay.has(shift.day)) {
          shiftsByDay.set(shift.day, new Map());
        }
        
        const dayShifts = shiftsByDay.get(shift.day)!;
        const currentCount = dayShifts.get(shift.name) || 0;
        dayShifts.set(shift.name, currentCount + 1);
      });
      
      // Check for duplicate shifts (same doctor, same day, multiple times)
      shiftsByDay.forEach((doctors, day) => {
        doctors.forEach((count, doctorName) => {
          if (count > 1) {
            // Check if it's the same shift type or different
            const doctorShiftsOnDay = shiftData.allShifts.filter(
              s => s.day === day && s.name === doctorName
            );
            
            const shiftTypes = doctorShiftsOnDay.map(s => s.shiftType);
            const uniqueTypes = new Set(shiftTypes);
            
            if (shiftTypes.length !== uniqueTypes.size || 
                (uniqueTypes.has('24h') && shiftTypes.length > 1)) {
              newErrors.push({
                type: 'duplicate',
                message: `Doctor "${doctorName}" appears ${count} times on day ${day}`,
                day,
                doctor: doctorName,
                severity: 'error'
              });
            }
          }
        });
      });
      
      // Check for overlapping shifts
      shiftData.allShifts.forEach((shift, index) => {
        const overlappingShifts = shiftData.allShifts.filter((s, i) => 
          i !== index &&
          s.name === shift.name &&
          s.day === shift.day
        );
        
        overlappingShifts.forEach(overlap => {
          // 24h shifts cannot overlap with anything
          if (shift.shiftType === '24h' || overlap.shiftType === '24h') {
            const errorExists = newErrors.some(
              e => e.day === shift.day && e.doctor === shift.name && e.type === 'overlap'
            );
            
            if (!errorExists) {
              newErrors.push({
                type: 'overlap',
                message: `Doctor "${shift.name}" has overlapping shifts on day ${shift.day} (${shift.shiftType} and ${overlap.shiftType})`,
                day: shift.day,
                doctor: shift.name,
                severity: 'error'
              });
            }
          }
          
          // Morning and evening on same day is OK, but morning+morning or evening+evening is not
          if (shift.shiftType === overlap.shiftType && 
              (shift.shiftType === 'morning' || shift.shiftType === 'evening')) {
            const errorExists = newErrors.some(
              e => e.day === shift.day && e.doctor === shift.name && e.type === 'overlap'
            );
            
            if (!errorExists) {
              newErrors.push({
                type: 'overlap',
                message: `Doctor "${shift.name}" has duplicate ${shift.shiftType} shifts on day ${shift.day}`,
                day: shift.day,
                doctor: shift.name,
                severity: 'error'
              });
            }
          }
        });
      });
      
      // Check for consecutive shifts after night duty
      // Group shifts by doctor
      const shiftsByDoctor = new Map<string, typeof shiftData.allShifts>();
      shiftData.allShifts.forEach(shift => {
        if (!shiftsByDoctor.has(shift.name)) {
          shiftsByDoctor.set(shift.name, []);
        }
        shiftsByDoctor.get(shift.name)!.push(shift);
      });
      
      // Check each doctor's shifts for insufficient rest time
      shiftsByDoctor.forEach((shifts, doctorName) => {
        // Sort shifts by start time
        const sortedShifts = [...shifts].sort((a, b) => 
          a.startDateTime.getTime() - b.startDateTime.getTime()
        );
        
        // Check consecutive shifts
        for (let i = 0; i < sortedShifts.length - 1; i++) {
          const currentShift = sortedShifts[i];
          const nextShift = sortedShifts[i + 1];
          
          // Calculate rest time between shifts (in hours)
          const restTimeMs = nextShift.startDateTime.getTime() - currentShift.endDateTime.getTime();
          const restTimeHours = restTimeMs / (1000 * 60 * 60);
          
          // Minimum rest time should be at least 8 hours
          const minimumRestHours = 8;
          
          if (restTimeHours < minimumRestHours) {
            const errorExists = newErrors.some(
              e => e.day === currentShift.day && e.doctor === doctorName && 
              e.message.includes(`day ${nextShift.day}`)
            );
            
            if (!errorExists) {
              const restTimeFormatted = restTimeHours.toFixed(1);
              newErrors.push({
                type: 'overlap',
                message: `Doctor "${doctorName}" has insufficient rest between shifts: ${currentShift.shiftType} shift on day ${currentShift.day} ends at ${currentShift.endDateTime.getHours()}:00, and next shift on day ${nextShift.day} starts at ${nextShift.startDateTime.getHours()}:00. Only ${restTimeFormatted} hours rest (minimum ${minimumRestHours} hours required).`,
                day: currentShift.day,
                doctor: doctorName,
                severity: 'error'
              });
            }
          }
        }
      });
      
      // Remove duplicate errors
      const uniqueErrors = Array.from(
        new Map(newErrors.map(e => [
          `${e.type}-${e.day}-${e.doctor}-${e.message}`, 
          e
        ])).values()
      );
      
      onErrorsUpdate(uniqueErrors);
    };
    
    validateShifts();
  }, [shiftData, onErrorsUpdate]);

  if (errors.length === 0) {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6">
        <div className="flex items-center">
          <svg
            className="w-6 h-6 text-green-500 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-green-800">
              Validation Passed
            </h3>
            <p className="text-green-700">
              No conflicts or errors found in the shift schedule
            </p>
          </div>
        </div>
      </div>
    );
  }

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Validation Results
      </h2>
      
      <div className="mb-4 flex gap-4">
        {errorCount > 0 && (
          <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-medium">
            {errorCount} Error{errorCount !== 1 ? 's' : ''}
          </div>
        )}
        {warningCount > 0 && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-medium">
            {warningCount} Warning{warningCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {errors.map((error, index) => (
          <div key={index}>
            <div
              className={`p-4 rounded-lg border-l-4 ${
                error.severity === 'error'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <div className="flex items-start">
                <svg
                  className={`w-5 h-5 mr-3 mt-0.5 ${
                    error.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className={`font-medium ${
                    error.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {error.message}
                  </p>
                  {error.day && (
                    <p className={`text-sm mt-1 ${
                      error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      Day: {error.day}
                      {error.doctor && ` • Doctor: ${error.doctor}`}
                    </p>
                  )}
                  {error.doctor && error.day && (
                    <button
                      onClick={() => handleGenerateSuggestions(index)}
                      className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                    >
                      {selectedError === index && showSuggestions ? 'Hide Solutions' : 'Suggest Solutions'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Solution Suggestions Panel */}
            {selectedError === index && showSuggestions && (
              <div className="mt-3 ml-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Solution Suggestions</h4>
                
                {/* Filters */}
                <div className="mb-4 space-y-3">
                  <div className="flex gap-3">
                    {/* Days Filter */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-blue-800 mb-1">
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
                          className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {/* Day suggestions dropdown */}
                        {showDaySuggestions && filteredDaySuggestions.length > 0 && (
                          <div 
                            className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto"
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
                      {/* Selected days as tags */}
                      {selectedDays.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedDays.map(day => (
                            <span
                              key={day}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                            >
                              Day {day}
                              <button
                                onClick={() => removeDay(day)}
                                className="hover:text-blue-900"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Doctor Filter */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-blue-800 mb-1">
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
                          className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {/* Doctor suggestions dropdown */}
                        {showDoctorSuggestions && filteredDoctorSuggestions.length > 0 && (
                          <div 
                            className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto"
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
                      {/* Selected doctors as tags */}
                      {selectedDoctors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedDoctors.map(doctor => (
                            <span
                              key={doctor}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded capitalize"
                            >
                              {doctor}
                              <button
                                onClick={() => removeDoctor(doctor)}
                                className="hover:text-blue-900"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          const newSuggestions = findSwapSuggestions(index, error);
                          setSuggestions(newSuggestions);
                        }}
                        className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors whitespace-nowrap"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>

                {/* Suggestions List */}
                {suggestions.length === 0 ? (
                  <p className="text-sm text-blue-700">
                    No viable swap suggestions found. Try adjusting the filters or this conflict may require manual resolution.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((suggestion, sIndex) => (
                      <div
                        key={sIndex}
                        className={`p-3 rounded border ${
                          suggestion.conflicts.length === 0
                            ? 'bg-green-50 border-green-300'
                            : 'bg-yellow-50 border-yellow-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
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
                              <p className="text-xs text-green-700 mt-1">
                                ✓ No conflicts detected - Safe to swap
                              </p>
                            )}
                          </div>
                          <div className="ml-3">
                            {suggestion.conflicts.length === 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Recommended
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Caution
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShiftValidator;
