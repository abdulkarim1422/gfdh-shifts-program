import { useState } from 'react'
import './App.css'
import FileUpload from './components/FileUpload'
import ShiftValidator from './components/ShiftValidator'
import Statistics from './components/Statistics'
import CalendarView from './components/CalendarView'
import type { ShiftData, ValidationError } from './types/shift'

function App() {
  const [shiftData, setShiftData] = useState<ShiftData | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Hospital Shift Management System
          </h1>
          <p className="text-gray-600">
            Upload, validate, and analyze monthly doctor shift schedules
          </p>
        </header>

        <div className="max-w-6xl mx-auto space-y-8">
          <FileUpload onDataLoaded={setShiftData} onError={setErrors} />
          
          {shiftData && (
            <>
              <ShiftValidator 
                shiftData={shiftData} 
                errors={errors}
                onErrorsUpdate={setErrors}
              />
              
              <CalendarView shiftData={shiftData} />
              
              <Statistics shiftData={shiftData} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
