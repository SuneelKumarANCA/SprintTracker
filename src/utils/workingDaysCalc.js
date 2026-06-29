/**
 * Calculate working days between two dates, excluding weekends and holidays.
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string[]} holidayDates - Array of ISO date strings
 * @returns {{ workingDays: number, weekends: number, holidays: number, totalDays: number }}
 */
export function calcWorkingDays(startDate, endDate, holidayDates = []) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const holSet = new Set(holidayDates.map(d => d.slice(0, 10)));
    let workingDays = 0, weekends = 0, holidays = 0, totalDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        totalDays++;
        const day = d.getDay();
        const iso = d.toISOString().slice(0, 10);
        if (day === 0 || day === 6) { weekends++; }
        else if (holSet.has(iso)) { holidays++; }
        else { workingDays++; }
    }
    return { workingDays, weekends, holidays, totalDays };
}
