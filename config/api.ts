const BASE = 'http://10.0.2.2:5000/api/reminders'; // for Android emulator

export const API_ENDPOINTS = {
  REMINDERS: BASE,
  REMINDER_BY_ID: (id: string) => `${BASE}/${id}/location`,
};
