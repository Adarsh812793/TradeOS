//Just a helper function that calculates expiry for access token

/* 1. Calculate the Next FYERS Token Expiry */
export function getNextFyersExpiry(from = new Date()) {
    const indiaTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).format(from);

    const [hour, minute, second] = indiaTime.split(":").map(Number);

    // Use the next 6:30 AM IST as the expiry boundary.
    const expiry = new Date(from);
    const minutesSinceMidnight = hour * 60 + minute;

    const minutesUntilExpiry =
        minutesSinceMidnight < 390 ||
        (minutesSinceMidnight === 390 && second === 0)
            ? 390 - minutesSinceMidnight
            : 24 * 60 - minutesSinceMidnight + 390;

    expiry.setTime(
        from.getTime() +
        (minutesUntilExpiry * 60 - second) * 1000
    );

    return expiry;
}
