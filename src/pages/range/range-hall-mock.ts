const RANGE_HALL_DESCRIPTION_KEYS: Readonly<Record<string, string>> = {
    rng_range3: 'range.hall.mockDescription.range3',
    rng_range4: 'range.hall.mockDescription.range4',
    rng_range5: 'range.hall.mockDescription.range5',
    rng_range6: 'range.hall.mockDescription.range6',
};

export const getRangeHallDescriptionKey = (rangeId: string) => RANGE_HALL_DESCRIPTION_KEYS[rangeId] ?? 'range.hall.mockDescription.default';
