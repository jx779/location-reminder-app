const BASE = 'http://192.168.219.161:5002/api/reminders';

export const API_ENDPOINTS = {
  REMINDERS: BASE,
  REMINDER_BY_ID: (id: string) => `${BASE}/${id}/location`,
};
