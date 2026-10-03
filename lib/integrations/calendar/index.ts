// Calendar provider abstraction — clean interface for future integration.
// The MVP uses a DEMO / NOT CONNECTED implementation that creates appointments
// in the local data layer. A real provider (Google Calendar, Calendly, etc.)
// can be added by implementing the CalendarProvider interface.

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  attendee_name: string;
  attendee_email: string;
  notes: string | null;
}

export interface CalendarProvider {
  name: string;
  connected: boolean;
  createEvent(params: {
    title: string;
    date: string;
    time: string;
    attendee_name: string;
    attendee_email: string;
    notes?: string;
  }): Promise<{ success: boolean; event?: CalendarEvent; error?: string }>;
  listEvents(date_from?: string): Promise<CalendarEvent[]>;
}

// DEMO / NOT CONNECTED — no external calendar API is called.
class DemoCalendarProvider implements CalendarProvider {
  name = 'Demo Scheduling (NOT CONNECTED)';
  connected = false;

  async createEvent(params: {
    title: string;
    date: string;
    time: string;
    attendee_name: string;
    attendee_email: string;
    notes?: string;
  }): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    return {
      success: true,
      event: {
        id: `demo-cal-${Date.now()}`,
        title: params.title,
        date: params.date,
        time: params.time,
        duration_minutes: 30,
        attendee_name: params.attendee_name,
        attendee_email: params.attendee_email,
        notes: params.notes || null,
      },
    };
  }

  async listEvents(): Promise<CalendarEvent[]> {
    return [];
  }
}

export const calendarProvider: CalendarProvider = new DemoCalendarProvider();
