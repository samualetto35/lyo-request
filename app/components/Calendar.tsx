import React, { useState } from 'react'

interface CalendarProps {
  selectedDate?: Date | null
  onDateSelect: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  className?: string
  highlightedDays?: { date: Date, label: string, isSelectedStudent?: boolean }[]
  rangeStart?: Date | null
  rangeEnd?: Date | null
  disabledDays?: Date[]
}

const Calendar: React.FC<CalendarProps> = ({ 
  selectedDate, 
  onDateSelect, 
  minDate,
  maxDate,
  className = '',
  highlightedDays = [],
  rangeStart = null,
  rangeEnd = null,
  disabledDays = [],
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]

  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Convert Sunday (0) to be last (6)
  }

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    if (disabledDays.some(d => d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate())) return true
    return false
  }

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    if (!isDateDisabled(date)) {
      onDateSelect(date)
    }
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days: JSX.Element[] = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-12 w-12"></div>
      )
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const disabled = isDateDisabled(date)
      const selected = isDateSelected(date)
      const today = isToday(date)
      // Collect all highlights for this day
      const highlights = highlightedDays.filter(hd => hd.date.getFullYear() === date.getFullYear() && hd.date.getMonth() === date.getMonth() && hd.date.getDate() === date.getDate())
      // Tooltip state
      const [showTooltip, setShowTooltip] = useState(false)
      // Range highlight
      let inRange = false;
      if (rangeStart && rangeEnd) {
        const d = date.setHours(0,0,0,0);
        const s = rangeStart.setHours(0,0,0,0);
        const e = rangeEnd.setHours(0,0,0,0);
        inRange = d >= Math.min(s, e) && d <= Math.max(s, e);
      }
      days.push(
        <div className="relative flex flex-col items-center" key={day}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
        >
          <button
            type="button"
            onClick={() => handleDateClick(day)}
            disabled={disabled}
            className={`
              h-12 w-9 md:h-24 md:w-24 rounded-lg text-xs md:text-lg font-medium transition-all duration-200 relative flex flex-col items-center
              ${disabled 
                ? (disabledDays.some(d => d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate())
                    ? 'border-2 border-blue-400 bg-gray-200 text-blue-400 cursor-not-allowed'
                    : 'text-gray-300 cursor-not-allowed bg-gray-50')
                : highlights.length > 0
                  ? 'bg-green-100 text-green-900 hover:bg-green-200 hover:text-green-900'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:scale-105 cursor-pointer'
              }
              ${selected 
                ? 'ring-2 ring-blue-400 bg-blue-600 text-white hover:bg-blue-700 shadow-lg scale-105' 
                : ''
              }
              ${today && !selected 
                ? 'bg-blue-100 text-blue-600 font-bold ring-2 ring-blue-200 border-2 border-blue-400' 
                : ''
              }
              ${inRange && !selected && !(today && !selected) ? 'bg-blue-200/60' : ''}
            `}
          >
            <span className="mt-1">{day}</span>
            {selected && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
            {/* Show badge if there are highlights */}
            {highlights.length > 0 && highlights.some(h => h.isSelectedStudent) && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-500 rounded-full z-10"></span>
            )}
            {/* Eğer seçili öğrenci yoksa veya o gün başka izinler de varsa, badge göster */}
            {highlights.length > 0 && !highlights.some(h => h.isSelectedStudent) && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 z-10">
                {highlights.length}
              </span>
            )}
            {/* Tooltip for highlights */}
            {showTooltip && highlights.length > 0 && (
              <div className="absolute left-1/2 -translate-x-1/2 top-12 md:top-16 z-20 bg-white border border-gray-200 rounded-lg shadow-lg px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm text-gray-900 whitespace-nowrap">
                {highlights.map((h, idx) => (
                  <div key={idx}>{h.label}</div>
                ))}
              </div>
            )}
          </button>
        </div>
      )
    }

    return days
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 hover:scale-110"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 hover:scale-110"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {dayNames.map((day) => (
          <div
            key={day}
            className="h-12 flex items-center justify-center text-sm font-semibold text-gray-500 bg-gray-50 rounded-lg"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>İzinli Gün</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-100 rounded-full mr-2 ring-2 ring-blue-200"></div>
            <span>Bugün</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
            <span>Seçili</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Calendar 