import { describe, it, expect } from "vitest";

import { getMarketStatus, isMarketOpen, getTradingDay } from "../src/modules/market/market.hours.js";

// Every instant is written in UTC ("Z"); IST = UTC + 5:30. Mon 9 Nov 2026 9:15 IST = 03:45 UTC.
// Calendar used: Sat 7 Nov, Sun 8 Nov, Mon 9 Nov (open), Tue 10 Nov (Diwali Balipratipada, holiday), Wed 11 Nov (open).
const at = (iso) => new Date(iso);

describe("market hours (IST)", () => {

    describe("opening and closing times", () => {
        it("is closed one second before 9:15 and open at exactly 9:15", () => {
            expect(isMarketOpen(at("2026-11-09T03:44:59Z"))).toBe(false);
            expect(isMarketOpen(at("2026-11-09T03:45:00Z"))).toBe(true);
        });

        it("is open at 3:29:59 PM and closed at exactly 3:30 PM", () => {
            expect(isMarketOpen(at("2026-11-09T09:59:59Z"))).toBe(true); // 15:29:59 IST
            expect(isMarketOpen(at("2026-11-09T10:00:00Z"))).toBe(false); // 15:30:00 IST
        });

        it("reports why it is closed", () => {
            expect(getMarketStatus(at("2026-11-09T03:00:00Z")).reason).toBe("before_open");
            expect(getMarketStatus(at("2026-11-09T04:00:00Z")).reason).toBe("open");
            expect(getMarketStatus(at("2026-11-09T11:00:00Z")).reason).toBe("after_close");
        });
    });

    describe("weekends and holidays", () => {
        it("is closed all day Saturday and Sunday", () => {
            expect(getMarketStatus(at("2026-11-07T06:00:00Z")).reason).toBe("weekend"); // Sat 11:30 IST
            expect(getMarketStatus(at("2026-11-08T06:00:00Z")).reason).toBe("weekend"); // Sun 11:30 IST
        });

        it("is closed on an exchange holiday and names it", () => {
            const status = getMarketStatus(at("2026-11-10T06:00:00Z")); // Tue 10 Nov 11:30 IST
            expect(status.isOpen).toBe(false);
            expect(status.reason).toBe("holiday");
            expect(status.holidayName).toBe("Diwali Balipratipada");
        });

        it("is open again the day after a holiday", () => {
            expect(isMarketOpen(at("2026-11-11T06:00:00Z"))).toBe(true);
        });
    });

    describe("time zones", () => {
        it("uses the IST date, not the UTC date (Sunday evening UTC is already Monday in India)", () => {
            const instant = at("2026-11-08T19:00:00Z"); // Sun 19:00 UTC = Mon 00:30 IST
            expect(getTradingDay(instant)).toBe("2026-11-09");
            expect(getMarketStatus(instant).reason).toBe("before_open");
        });

        it("keeps the IST date late in the evening (Friday 22:00 IST is still Friday)", () => {
            expect(getTradingDay(at("2026-11-06T16:30:00Z"))).toBe("2026-11-06"); // Fri 22:00 IST
        });

        it("gives the same answer whatever timezone the server runs in", () => {
            const original = process.env.TZ;
            try {
                for (const zone of ["UTC", "Asia/Kolkata", "America/Los_Angeles"]) {
                    process.env.TZ = zone;
                    expect(isMarketOpen(at("2026-11-09T04:00:00Z"))).toBe(true);
                    expect(isMarketOpen(at("2026-11-09T11:00:00Z"))).toBe(false);
                }
            } finally {
                process.env.TZ = original;
            }
        });
    });

    describe("next opening", () => {
        it("on Saturday, the next opening is Monday 9:15 IST", () => {
            expect(getMarketStatus(at("2026-11-07T06:00:00Z")).nextOpenAt).toBe("2026-11-09T03:45:00.000Z");
        });

        it("before the opening bell, it is the same day", () => {
            expect(getMarketStatus(at("2026-11-09T02:00:00Z")).nextOpenAt).toBe("2026-11-09T03:45:00.000Z");
        });

        it("after Monday's close it skips the Tuesday holiday and opens Wednesday", () => {
            expect(getMarketStatus(at("2026-11-09T11:00:00Z")).nextOpenAt).toBe("2026-11-11T03:45:00.000Z");
        });

        it("has no next opening while the market is open", () => {
            expect(getMarketStatus(at("2026-11-09T04:00:00Z")).nextOpenAt).toBeNull();
        });
    });

    describe("development override", () => {
        it("is always open when the override is on, even on a Saturday night", () => {
            const status = getMarketStatus(at("2026-11-07T20:00:00Z"), { alwaysOpen: true });
            expect(status.isOpen).toBe(true);
            expect(status.reason).toBe("override");
        });

        it("is off unless asked for", () => {
            expect(isMarketOpen(at("2026-11-07T20:00:00Z"))).toBe(false);
        });
    });

    describe("a year with no holiday list", () => {
        it("treats weekdays as open (and warns once) instead of crashing", () => {
            expect(isMarketOpen(at("2031-03-03T06:00:00Z"))).toBe(true); // Monday 3 Mar 2031 11:30 IST
        });
    });
});
