import { describe, expect, it } from 'vitest';
import { advanceTrainingTelemetry, createTrainingTelemetry } from '@/pages/training/training-telemetry';

describe('training telemetry demo data', () => {
    it('is deterministic per task and does not mutate the previous snapshot', () => {
        const first = createTrainingTelemetry('TRN-2026-0820-A1B2C3');
        const second = createTrainingTelemetry('TRN-2026-0820-A1B2C3');
        const advanced = advanceTrainingTelemetry(first);

        expect(first).toEqual(second);
        expect(advanced).not.toBe(first);
        expect(advanced.series).not.toBe(first.series);
        expect(first.series[0].values).toHaveLength(24);
        expect(advanced.logs).toHaveLength(first.logs.length + 1);
    });
});
