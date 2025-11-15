import { useState, useEffect } from 'react'
import './App.css'
import FileUpload from './components/FileUpload'
import ShiftValidator from './components/ShiftValidator'
import Statistics from './components/Statistics'
import CalendarView from './components/CalendarView'
import type { ShiftData, ValidationError } from './types/shift'

function App() {
  const [shiftData, setShiftData] = useState<ShiftData | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [urlFile, setUrlFile] = useState<{ filename: string; page?: string } | null>(null)

  // Parse URL hash parameters on mount and when hash changes
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.slice(1) // Remove '#'
      if (!hash) {
        setUrlFile(null)
        return
      }

      const params = new URLSearchParams(hash.replace(/#/g, '&'))
      const file = params.get('file')
      const page = params.get('page')

      if (file) {
        setUrlFile({ filename: file, page: page || undefined })
      } else {
        setUrlFile(null)
      }
    }

    parseHash()
    window.addEventListener('hashchange', parseHash)
    return () => window.removeEventListener('hashchange', parseHash)
  }, [])

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
          <FileUpload 
            onDataLoaded={setShiftData} 
            onError={setErrors} 
            urlFile={urlFile}
          />
          
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
