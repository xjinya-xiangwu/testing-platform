import { useEffect, useMemo, useState } from 'react';
import {
    createWorkbenchAttackPlaybackSchedule,
    getNextWorkbenchAttackBoundaryDelay,
    getWorkbenchAttackPlaybackState,
    type IWorkbenchAttackPathInput,
} from '@/pages/workbench/components/workbench-attack-playback';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const getPrefersReducedMotion = () => (typeof window === 'undefined' ? false : (window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false));

const useTopologyAttackPlayback = (paths: readonly IWorkbenchAttackPathInput[]) => {
    const pathSignature = paths.map(({ id, nodeIds }) => `${id}:${nodeIds.join('>')}`).join('|');
    const schedule = useMemo(() => createWorkbenchAttackPlaybackSchedule(paths), [pathSignature]);
    const [isReducedMotion, setIsReducedMotion] = useState(getPrefersReducedMotion);
    const [totalElapsedMs, setTotalElapsedMs] = useState(0);

    useEffect(() => {
        const mediaQuery = window.matchMedia?.(REDUCED_MOTION_QUERY);
        if (!mediaQuery) return undefined;
        const updatePreference = () => setIsReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener?.('change', updatePreference);
        return () => mediaQuery.removeEventListener?.('change', updatePreference);
    }, []);

    useEffect(() => {
        setTotalElapsedMs(0);
        if (isReducedMotion || schedule.paths.length === 0) return undefined;

        const startedAt = Date.now();
        let playbackTimer: number;
        const advancePlayback = () => {
            const elapsedMs = Date.now() - startedAt;
            setTotalElapsedMs(elapsedMs);
            playbackTimer = window.setTimeout(advancePlayback, getNextWorkbenchAttackBoundaryDelay(schedule, elapsedMs));
        };
        advancePlayback();
        return () => window.clearTimeout(playbackTimer);
    }, [isReducedMotion, schedule]);

    const staticElapsedMs = schedule.paths[0]?.attackEndAtMs ?? 0;
    return useMemo(() => getWorkbenchAttackPlaybackState(schedule, isReducedMotion ? staticElapsedMs : totalElapsedMs), [isReducedMotion, schedule, staticElapsedMs, totalElapsedMs]);
};

export default useTopologyAttackPlayback;
