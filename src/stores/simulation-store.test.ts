import { beforeEach, describe, expect, it } from 'vitest';
import { resetSimulationStore, useSimulationStore } from '@/stores/simulation-store';

describe('simulation store', () => {
    beforeEach(() => {
        resetSimulationStore();
    });

    it('does not synthesize backend-owned dashboard metrics', () => {
        expect(useSimulationStore.getState()).not.toHaveProperty('metricOffsets');
    });

    it('advances the deterministic event stream', () => {
        const before = useSimulationStore.getState();

        before.tick();

        const after = useSimulationStore.getState();
        expect(after.eventCursor).toBe(before.eventCursor + 1);
    });

    it('registers and clears page-owned timers', () => {
        const timerId = window.setInterval(() => undefined, 1000);

        useSimulationStore.getState().registerTimer(timerId);
        expect(useSimulationStore.getState().timerIds).toEqual([timerId]);

        useSimulationStore.getState().stopTimers();
        expect(useSimulationStore.getState().timerIds).toEqual([]);
    });
});
