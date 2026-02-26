import React, { useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import {
  X,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface TripScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDates: string[]) => void;
  vehicleName: string;
  orderCount: number;
  existingBookings: Array<{
    date: string;
    type: 'Trip' | 'Maintenance';
    tripNumber?: string;
    status?: string;
  }>;
}

export const TripScheduleModal: React.FC<TripScheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  vehicleName,
  orderCount,
  existingBookings,
}) => {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date('2026-02-27'));

  if (!isOpen) return null;

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendar: (Date | null)[] = [];
    
    // Add empty cells for days before the first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(new Date(year, month, day));
    }
    
    return calendar;
  };

  const calendar = generateCalendar();

  const getBookingForDate = (date: Date | null) => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    return existingBookings.find(b => b.date === dateStr);
  };

  const isDateSelected = (date: Date | null) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return selectedDates.includes(dateStr);
  };

  const toggleDateSelection = (date: Date | null) => {
    if (!date) return;
    
    const today = new Date('2026-02-27');
    if (date < today) return; // Can't select past dates
    
    const dateStr = date.toISOString().split('T')[0];
    
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  const getDateColor = (date: Date | null, booking: any, isSelected: boolean) => {
    if (!date) return '';
    
    const today = new Date('2026-02-27');
    const isPast = date < today;
    
    if (isPast) return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    
    // If selected and has a trip booking (conflict), use orange
    if (isSelected && booking && booking.type === 'Trip') {
      return 'bg-orange-600 text-white font-semibold shadow-lg border-2 border-orange-700';
    }
    
    // If selected with no conflict, use blue
    if (isSelected) return 'bg-blue-600 text-white font-semibold shadow-lg border-2 border-blue-700';
    
    if (booking) {
      if (booking.type === 'Trip') return 'bg-orange-100 text-orange-800 border-2 border-orange-300';
      if (booking.type === 'Maintenance') return 'bg-red-100 text-red-800 border-2 border-red-300';
    }
    
    return 'bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300 cursor-pointer';
  };

  const hasConflicts = selectedDates.some(dateStr => {
    return existingBookings.some(b => b.date === dateStr && b.type === 'Trip');
  });

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Schedule Delivery Trip
              </h2>
              {hasConflicts && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Conflict Warning
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Select date(s) for trip with {orderCount} orders using {vehicleName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Legend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 border-2 border-blue-700 rounded flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-600">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-600 border-2 border-orange-700 rounded flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-600">Conflict</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 border-2 border-orange-300 rounded" />
                <span className="text-gray-600">Existing Trip</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 border-2 border-red-300 rounded" />
                <span className="text-gray-600">Maintenance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white border-2 border-gray-200 rounded" />
                <span className="text-gray-600">Available</span>
              </div>
            </div>
            {selectedDates.length > 0 && (
              <Badge variant="warning" className="text-sm">
                {selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'} selected
              </Badge>
            )}
          </div>

          {/* Conflict Warning */}
          {hasConflicts && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-900">Schedule Conflict Detected</p>
                  <p className="text-sm text-orange-700 mt-1">
                    One or more selected dates already have trips scheduled. This may cause resource conflicts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            {/* Calendar Header */}
            <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b-2 border-gray-300">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h3 className="text-lg font-bold text-gray-900">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4 bg-gray-50">
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-bold text-gray-700 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendar.map((date, index) => {
                  const booking = getBookingForDate(date);
                  const isSelected = isDateSelected(date);
                  const colorClass = getDateColor(date, booking, isSelected);
                  const isPast = date && date < new Date('2026-02-27');
                  
                  return (
                    <div
                      key={index}
                      onClick={() => !isPast && toggleDateSelection(date)}
                      className={`min-h-[90px] p-2 rounded-lg transition-all ${colorClass}`}
                    >
                      {date && (
                        <>
                          <p className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : ''}`}>
                            {date.getDate()}
                          </p>
                          {isSelected && (
                            <div className="flex items-center justify-center mt-2">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                          )}
                          {booking && booking.type !== 'Available' && !isSelected && (
                            <div className="text-xs mt-1">
                              {booking.type === 'Trip' ? (
                                <>
                                  <div className="flex items-center gap-1 mb-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="font-medium">Trip</span>
                                  </div>
                                  <p className="truncate font-medium">{booking.tripNumber}</p>
                                </>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Wrench className="w-3 h-3" />
                                  <span className="font-medium">Maint.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Dates Summary */}
          {selectedDates.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Selected Dates</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDates.map(dateStr => {
                  const date = new Date(dateStr);
                  const booking = existingBookings.find(b => b.date === dateStr);
                  const hasConflict = booking && booking.type === 'Trip';
                  
                  return (
                    <div
                      key={dateStr}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                        hasConflict 
                          ? 'bg-orange-200 text-orange-900 border border-orange-400' 
                          : 'bg-blue-200 text-blue-900'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {hasConflict && (
                        <AlertTriangle className="w-4 h-4 text-orange-700" />
                      )}
                      <button
                        onClick={() => toggleDateSelection(date)}
                        className="ml-1 hover:bg-white/30 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm(selectedDates);
              onClose();
            }}
            disabled={selectedDates.length === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Schedule Trip ({selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'})
          </Button>
        </div>
      </div>
    </div>
  );
};
