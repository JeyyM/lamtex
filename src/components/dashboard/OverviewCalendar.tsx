import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { CalendarEvent } from '@/src/types/executive';
import { Calendar, AlertCircle, Package, Truck, ArrowRightLeft, X, MapPin, Clock, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface OverviewCalendarProps {
  events: CalendarEvent[];
}

export function OverviewCalendar({ events }: OverviewCalendarProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Get next 14 days starting from today
  const today = new Date('2026-02-25'); // Using the current date from context
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = event.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const getEventColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'Outgoing': return 'bg-blue-500';
      case 'Incoming': return 'bg-green-500';
      case 'Transfer': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'Outgoing': return Truck;
      case 'Incoming': return Package;
      case 'Transfer': return ArrowRightLeft;
      default: return Calendar;
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    return formatDate(date) === formatDate(today);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Operations Calendar (14 Days)
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Outgoing</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Incoming</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">Transfer</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const dateKey = formatDate(day);
              const dayEvents = eventsByDate[dateKey] || [];
              const hasRiskEvents = dayEvents.some(e => e.atRisk);
              
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-24 p-2 rounded-lg border transition-all",
                    isToday(day) ? "bg-red-50 border-red-300 ring-2 ring-red-200" : "bg-white border-gray-200",
                    dayEvents.length > 0 ? "hover:shadow-md cursor-pointer" : "opacity-60"
                  )}
                  onClick={() => dayEvents.length > 0 && setSelectedEvent(dayEvents[0])}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-xs font-semibold",
                        isToday(day) ? "text-red-700" : "text-gray-500"
                      )}>
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className={cn(
                        "text-sm font-bold",
                        isToday(day) ? "text-red-700" : "text-gray-900"
                      )}>
                        {day.getDate()}
                      </span>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      {dayEvents.slice(0, 3).map((event, eventIdx) => {
                        const EventIcon = getEventIcon(event.type);
                        return (
                          <div
                            key={eventIdx}
                            className={cn(
                              "text-xs p-1 rounded flex items-center gap-1",
                              getEventColor(event.type),
                              "text-white"
                            )}
                            title={event.title}
                          >
                            <EventIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate flex-1">{event.title.split(':')[1]?.trim() || event.title}</span>
                            {event.atRisk && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium text-center">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {React.createElement(getEventIcon(selectedEvent.type), { 
                  className: cn("w-5 h-5", {
                    'text-blue-600': selectedEvent.type === 'Outgoing',
                    'text-green-600': selectedEvent.type === 'Incoming',
                    'text-purple-600': selectedEvent.type === 'Transfer',
                  })
                })}
                <h2 className="text-lg font-bold text-gray-900">Event Details</h2>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Event Title */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {selectedEvent.title}
                  {selectedEvent.atRisk && (
                    <Badge variant="danger" className="ml-2">At Risk</Badge>
                  )}
                </h3>
              </div>

              {/* Event Type Badge */}
              <div className="flex items-center gap-2">
                <Badge 
                  variant={
                    selectedEvent.type === 'Outgoing' ? 'neutral' :
                    selectedEvent.type === 'Incoming' ? 'success' :
                    'default'
                  }
                  className="text-sm"
                >
                  {selectedEvent.type}
                </Badge>
                {selectedEvent.branch && (
                  <Badge variant="outline" className="text-sm">
                    {selectedEvent.branch}
                  </Badge>
                )}
              </div>

              {/* Date & Time */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Scheduled Date</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(selectedEvent.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Info className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Details</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedEvent.details}</p>
                </div>
              </div>

              {/* Risk Warning */}
              {selectedEvent.atRisk && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Risk Alert</p>
                    <p className="text-sm text-red-700 mt-1">
                      This event is flagged as at-risk. Please review and take necessary action.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => console.log('View full details:', selectedEvent)}
                >
                  View Full Details
                </Button>
                {selectedEvent.type === 'Outgoing' && (
                  <Button 
                    variant="default"
                    className="flex-1"
                    onClick={() => console.log('Notify logistics:', selectedEvent)}
                  >
                    Notify Logistics
                  </Button>
                )}
                {selectedEvent.type === 'Incoming' && (
                  <Button 
                    variant="default"
                    className="flex-1"
                    onClick={() => console.log('Notify warehouse:', selectedEvent)}
                  >
                    Notify Warehouse
                  </Button>
                )}
                {selectedEvent.type === 'Transfer' && (
                  <Button 
                    variant="default"
                    className="flex-1"
                    onClick={() => console.log('Track transfer:', selectedEvent)}
                  >
                    Track Transfer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
