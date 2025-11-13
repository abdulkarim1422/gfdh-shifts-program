export interface ShiftEntry {
  day: number;
  shifts: string[];
}

export interface DoctorShift {
  name: string;
  day: number;
  shiftType: '24h' | 'morning' | 'evening' | '8-16';
  column: number;
}

export interface ShiftData {
  month: string;
  entries: ShiftEntry[];
  allShifts: DoctorShift[];
}

export interface ValidationError {
  type: 'duplicate' | 'overlap' | 'format' | 'warning';
  message: string;
  day?: number;
  doctor?: string;
  severity: 'error' | 'warning';
}

export interface DoctorStatistics {
  name: string;
  totalDays: number;
  totalHours: number;
  shifts24h: number;
  shifts12h: number;
  shifts8h: number;
  daysList: number[];
}
