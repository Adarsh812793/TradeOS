// NSE equity trading holidays that fall on weekdays, one list per year. Weekends are handled in market.hours.js.
// Dates are IST calendar dates ("YYYY-MM-DD").
//
// SOURCE: compiled on 2026-11-07 from third-party NSE calendars (Upstox and others), NOT from NSE's own circular,
// which could not be reached. VERIFY against https://www.nseindia.com/resources/exchange-communication-holidays
// before relying on it. 2026-01-15 is listed by some sources only (closure for the Maharashtra municipal elections).
//
// Each January, add the new year here. A year missing from this file is NOT treated as "no holidays" silently:
// market.hours.js logs a warning, and weekdays of that year count as open.
export const HOLIDAYS = {
  2026: {
    "2026-01-15": "Maharashtra municipal elections",
    "2026-01-26": "Republic Day",
    "2026-03-03": "Holi",
    "2026-03-26": "Shri Ram Navami",
    "2026-03-31": "Shri Mahavir Jayanti",
    "2026-04-03": "Good Friday",
    "2026-04-14": "Dr. Baba Saheb Ambedkar Jayanti",
    "2026-05-01": "Maharashtra Day",
    "2026-05-28": "Bakri Id",
    "2026-06-26": "Muharram",
    "2026-09-14": "Ganesh Chaturthi",
    "2026-10-02": "Mahatma Gandhi Jayanti",
    "2026-10-20": "Dussehra",
    "2026-11-10": "Diwali Balipratipada",
    "2026-11-24": "Prakash Gurpurb Sri Guru Nanak Dev",
    "2026-12-25": "Christmas",
  },
};
