import React, { useEffect } from 'react';
import type { ShiftData, ValidationError } from '../types/shift';

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
      
      // Check each doctor's shifts for consecutive issues
      shiftsByDoctor.forEach((shifts, doctorName) => {
        shifts.forEach(shift => {
          // Check if this shift involves night duty that requires rest
          // Evening shift (night) -> only problematic if followed by MORNING shift
          // 24h shift -> problematic if followed by ANY shift
          
          if (shift.shiftType === 'evening') {
            // Evening shift: only check if next day has a MORNING shift
            const nextDayMorningShifts = shifts.filter(
              s => s.day === shift.day + 1 && s.shiftType === 'morning'
            );
            
            if (nextDayMorningShifts.length > 0) {
              const errorExists = newErrors.some(
                e => e.day === shift.day && e.doctor === doctorName && 
                e.message.includes('evening shift') && e.message.includes(`day ${shift.day + 1}`)
              );
              
              if (!errorExists) {
                newErrors.push({
                  type: 'overlap',
                  message: `Doctor "${doctorName}" has an evening shift on day ${shift.day} (ends late night) and a morning shift on day ${shift.day + 1}. Not enough rest time between shifts.`,
                  day: shift.day,
                  doctor: doctorName,
                  severity: 'error'
                });
              }
            }
          } else if (shift.shiftType === '24h') {
            // 24h shift: check if next day has ANY shift
            const nextDayShifts = shifts.filter(s => s.day === shift.day + 1);
            
            if (nextDayShifts.length > 0) {
              const errorExists = newErrors.some(
                e => e.day === shift.day && e.doctor === doctorName && 
                e.message.includes('24-hour shift') && e.message.includes(`day ${shift.day + 1}`)
              );
              
              if (!errorExists) {
                newErrors.push({
                  type: 'overlap',
                  message: `Doctor "${doctorName}" has a 24-hour shift on day ${shift.day} and another shift on day ${shift.day + 1}. No one should work after a 24-hour shift.`,
                  day: shift.day,
                  doctor: doctorName,
                  severity: 'error'
                });
              }
            }
          }
        });
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
          <div
            key={index}
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShiftValidator;
