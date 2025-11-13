export interface ShiftEntry {
  day: number;
  shifts: string[];
}

export interface DoctorShift {
  name: string;
  day: number;
  shiftType: '24h' | 'morning' | 'evening' | '16h' | '8h';
  column: number;
  hours: number; // Total hours for this shift
  startDateTime: Date; // Actual start date and time
  endDateTime: Date; // Actual end date and time
  region: string; // Region/area of work (e.g., "st", "sarı+müs", "yeşil 24")
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
  shifts16h: number;
  shifts8h: number;
  daysList: number[];
}
