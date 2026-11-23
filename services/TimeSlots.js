// H5 "TIME (CAIRO)": the interview times a company can offer.
// Plain JS with the built-in Intl time zones, so Cairo summer time is handled without a library.
const ZONE = "Africa/Cairo";
const HOURS = [10, 11, 13, 15];
const WEEKEND = [5, 6]; // Friday and Saturday in Egypt

function cairoParts(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: ZONE, hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    }).formatToParts(date);
    const get = type => Number(parts.find(p => p.type === type).value);
    return { year: get("year"), month: get("month") - 1, day: get("day"), hour: get("hour"), minute: get("minute") };
}

// Cairo wall-clock time → the real moment (a Date in UTC)
function cairoTime(year, month, day, hour) {
    const guess = Date.UTC(year, month, day, hour);
    const shown = cairoParts(new Date(guess));
    const shownAsUtc = Date.UTC(shown.year, shown.month, shown.day, shown.hour, shown.minute);
    return new Date(guess - (shownAsUtc - guess));
}

class TimeSlots {
    // The next `days` working days after today, each with the four interview hours
    static next(now = new Date(), days = 4) {
        const today = cairoParts(now);
        const slots = [];
        let offset = 1;
        let found = 0;
        while (found < days) {
            const noon = cairoTime(today.year, today.month, today.day + offset, 12);
            offset++;
            if (WEEKEND.includes(noon.getUTCDay())) continue;
            const day = cairoParts(noon);
            for (const hour of HOURS) slots.push(cairoTime(day.year, day.month, day.day, hour));
            found++;
        }
        return slots;
    }
}

module.exports = TimeSlots;
