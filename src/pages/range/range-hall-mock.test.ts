import { describe, expect, it } from 'vitest';
import { getRangeHallDescriptionKey } from '@/pages/range/range-hall-mock';

describe('range hall description mock', () => {
    it.each([
        ['rng_range3', 'range.hall.mockDescription.range3'],
        ['rng_range4', 'range.hall.mockDescription.range4'],
        ['rng_range5', 'range.hall.mockDescription.range5'],
        ['rng_range6', 'range.hall.mockDescription.range6'],
    ] as const)('maps %s to its catalog description', (rangeId, descriptionKey) => {
        expect(getRangeHallDescriptionKey(rangeId)).toBe(descriptionKey);
    });

    it('falls back to a localized generic description for newly added backend ranges', () => {
        expect(getRangeHallDescriptionKey('rng_future')).toBe('range.hall.mockDescription.default');
    });
});
