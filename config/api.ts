const BASE = "http://172.29.224.1:5000/api/reminders";

export const API_ENDPOINTS = {
  REMINDERS: BASE,
  REMINDER_BY_ID: (id: string): string => `${BASE}/${id}`,
} as const;