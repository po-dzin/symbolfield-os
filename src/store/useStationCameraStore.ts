import { create } from 'zustand';

type State = {
  pan: { x: number; y: number };
  zoom: number;
  setPan: (p: { x: number; y: number }) => void;
  setZoom: (z: number) => void;
};

export const useStationCameraStore = create<State>((set) => ({
  pan: { x: 0, y: 0 },
  zoom: 1,
  setPan: (pan) => set({ pan }),
  setZoom: (zoom) => set({ zoom }),
}));
