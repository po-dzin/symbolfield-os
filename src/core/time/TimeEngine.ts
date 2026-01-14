/**
 * TimeEngine.js
 * Manages the temporal dimension of SymbolField.
 * 
 * Responsibilities:
 * - Current Anchor Date (What "Today" or "Focused Day" is)
 * - Time View Scale (Day / Week / Month / Year)
 * - Formatting and Ranges
 */

export const TIME_SCALES = {
    NOW: 'now',     // Realtime / Session
    DAY: 'day',     // Standard journal view
    WEEK: 'week',   // Planning view
    MONTH: 'month', // Strategic view
    YEAR: 'year'    // Horizon view
} as const;

type TimeScale = typeof TIME_SCALES[keyof typeof TIME_SCALES];

class TimeEngine {
    private anchorDate: Date;
    private scale: TimeScale;

    constructor() {
        this.anchorDate = new Date();
        this.scale = TIME_SCALES.DAY;
    }

    // --- Actions ---

    setAnchorDate(date: Date) {
        // Clone to avoid reference mutations
        const newDate = new Date(date);
        if (isNaN(newDate.getTime())) return;

        this.anchorDate = newDate;
        // Emit event if needed, or stores will poll
    }

    setScale(scale: TimeScale) {
        if (!Object.values(TIME_SCALES).includes(scale)) return;
        this.scale = scale;
    }

    jumpToToday() {
        this.setAnchorDate(new Date());
    }

    navigate(delta: number) {
        // Delta is +1 or -1 units of current scale
        const d = new Date(this.anchorDate);

        switch (this.scale) {
            case TIME_SCALES.DAY:
                d.setDate(d.getDate() + delta);
                break;
            case TIME_SCALES.WEEK:
                d.setDate(d.getDate() + (delta * 7));
                break;
            case TIME_SCALES.MONTH:
                d.setMonth(d.getMonth() + delta);
                break;
            case TIME_SCALES.YEAR:
                d.setFullYear(d.getFullYear() + delta);
                break;
        }

        this.setAnchorDate(d);
    }

    // --- Queries ---

    getAnchorDisplay() {
        // Simple formatter, can be replaced by Intl later
        return this.anchorDate.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    getAnchorDate() {
        return this.anchorDate;
    }

    getScale() {
        return this.scale;
    }

    getRange() {
        const start = new Date(this.anchorDate);
        const end = new Date(this.anchorDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (this.scale === TIME_SCALES.WEEK) {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Mon start
            start.setDate(diff);
            end.setDate(start.getDate() + 6);
        }
        // ... Implement other scales as needed

        return { start, end };
    }
}

export const timeEngine = new TimeEngine();
