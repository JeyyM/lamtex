import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { CalendarEvent } from '@/src/types/executive';
import { Calendar, AlertCircle } from 'lucide-react';

interface OverviewCalendarProps {
  events: CalendarEvent[];
}

export function OverviewCalendar({ events }: OverviewCalendarProps) {
  const handleEventClick = (event: CalendarEvent) => {
    alert(`Details for ${event.title}:\n${event.details}\nDate: ${event.date}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          Overview Calendar (7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {events.map((event) => (
            <div 
              key={event.id} 
              className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
              onClick={() => handleEventClick(event)}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                  <span className="text-xs font-medium text-gray-500">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-bold text-gray-900">{new Date(event.date).getDate()}</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    {event.title}
                    {event.atRisk && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">{event.details}</p>
                </div>
              </div>
              <Badge variant={event.type === 'Incoming' ? 'success' : 'neutral'}>
                {event.type}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
