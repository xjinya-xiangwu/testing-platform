import { useEffect, useMemo, useState } from 'react';
import { getAttackPlaybackState, getNextAttackBoundaryDelay } from '@/features/topology/playback/attack-playback';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const getPrefersReducedMotion = () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;

const useTopologyAttackPlayback = () => {
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
        if (isReducedMotion) return undefined;

        const startedAt = Date.now();
        let playbackTimer: number;
        const advancePlayback = () => {
            const elapsedMs = Date.now() - startedAt;
            setTotalElapsedMs(elapsedMs);
            playbackTimer = window.setTimeout(advancePlayback, getNextAttackBoundaryDelay(elapsedMs));
        };

        advancePlayback();
        return () => window.clearTimeout(playbackTimer);
    }, [isReducedMotion]);

    return useMemo(() => getAttackPlaybackState(totalElapsedMs, isReducedMotion), [isReducedMotion, totalElapsedMs]);
};

export default useTopologyAttackPlayback;
