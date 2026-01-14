/**
 * useTimeStore.ts
 * React binding for TimeEngine.
 */

import { create } from 'zustand';
import { timeEngine } from '../core/time/TimeEngine';

type TimeScale = 'now' | 'day' | 'week' | 'month' | 'year';

interface TimeStoreState {
    anchorDate: Date;
    scale: TimeScale;
    display: string;
    setAnchorDate: (date: Date) => void;
    setScale: (scale: TimeScale) => void;
    navigate: (delta: number) => void;
    jumpToToday: () => void;
}

export const useTimeStore = create<TimeStoreState>((set) => {

    return {
        anchorDate: timeEngine.getAnchorDate() as Date,
        scale: timeEngine.getScale() as TimeScale,
        display: timeEngine.getAnchorDisplay() as string,

        setAnchorDate: (date: Date) => {
            timeEngine.setAnchorDate(date);
            set({
                anchorDate: timeEngine.getAnchorDate() as Date,
                display: timeEngine.getAnchorDisplay() as string
            });
        },
        setScale: (scale: TimeScale) => {
            timeEngine.setScale(scale);
            set({ scale: timeEngine.getScale() as TimeScale });
        },
        navigate: (delta: number) => {
            timeEngine.navigate(delta);
            set({
                anchorDate: timeEngine.getAnchorDate() as Date,
                display: timeEngine.getAnchorDisplay() as string
            });
        },
        jumpToToday: () => {
            timeEngine.jumpToToday();
            set({
                anchorDate: timeEngine.getAnchorDate() as Date,
                display: timeEngine.getAnchorDisplay() as string
            });
        }
    };
});
