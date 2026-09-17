import { create } from 'zustand';

interface ISimulationState {
    eventCursor: number;
    timerIds: readonly number[];
    registerTimer: (timerId: number) => void;
    stopTimers: () => void;
    tick: () => void;
}

const INITIAL_STATE = {
    eventCursor: 0,
    timerIds: [] as readonly number[],
};

export const useSimulationStore = create<ISimulationState>((set, get) => ({
    ...INITIAL_STATE,
    registerTimer: (timerId) => {
        set((state) => ({ timerIds: [...state.timerIds, timerId] }));
    },
    stopTimers: () => {
        get().timerIds.forEach((timerId) => window.clearInterval(timerId));
        set({ timerIds: [] });
    },
    tick: () => {
        set((state) => ({
            eventCursor: state.eventCursor + 1,
        }));
    },
}));

export const resetSimulationStore = () => {
    useSimulationStore.getState().stopTimers();
    useSimulationStore.setState({ ...INITIAL_STATE, timerIds: [] });
};
