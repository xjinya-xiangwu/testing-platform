import { describe, expect, it } from 'vitest';
import { createWorkbenchAttackPlaybackSchedule, getWorkbenchAttackPlaybackState } from '@/pages/workbench/components/workbench-attack-playback';

const RANGE3_PATHS = [
    { id: 'range3-data-path', nodeIds: ['attacker', 'react', 'dubbo', 'geoserver', 'postgres'] },
    { id: 'range3-monitoring-path', nodeIds: ['attacker', 'react', 'dubbo', 'cacti', 'neo4j'] },
] as const;

const TIMING = {
    cyclePauseMs: 500,
    hitFeedbackMs: 200,
    routePauseMs: 300,
    travelMs: 1_000,
};

describe('workbench attack-route playback', () => {
    it('plays both Range3 routes node by node and restarts from the first route', () => {
        const schedule = createWorkbenchAttackPlaybackSchedule(RANGE3_PATHS, TIMING);
        const secondRouteStart = schedule.paths[1].startAtMs;

        expect(getWorkbenchAttackPlaybackState(schedule, 0)).toMatchObject({
            activePathId: 'range3-data-path',
            activeSegment: { edgeId: 'attacker->react', pathId: 'range3-data-path' },
            cycleIndex: 0,
        });
        expect(getWorkbenchAttackPlaybackState(schedule, TIMING.travelMs)).toMatchObject({
            activePathId: 'range3-data-path',
            activeSegment: undefined,
            nodeStates: { react: 'hit' },
        });
        expect(getWorkbenchAttackPlaybackState(schedule, secondRouteStart)).toMatchObject({
            activePathId: 'range3-monitoring-path',
            activeSegment: { edgeId: 'attacker->react', pathId: 'range3-monitoring-path' },
            cycleIndex: 0,
        });
        expect(getWorkbenchAttackPlaybackState(schedule, schedule.cycleDurationMs)).toMatchObject({
            activePathId: 'range3-data-path',
            activeSegment: { edgeId: 'attacker->react', pathId: 'range3-data-path' },
            cycleIndex: 1,
        });
    });
});
