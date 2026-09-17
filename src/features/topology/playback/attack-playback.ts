export type AttackNodeState = 'idle' | 'hit' | 'compromised';
export type AttackSegmentState = 'idle' | 'active' | 'complete';

export interface IAttackPlaybackStep {
    hitAtMs: number;
    segmentId: string;
    startAtMs: number;
    targetId: string;
    travelDurationMs: number;
}

export interface IAttackPlaybackState {
    activeSegmentId?: string;
    cycleIndex: number;
    nodeStates: Readonly<Record<string, AttackNodeState>>;
    segmentStates: Readonly<Record<string, AttackSegmentState>>;
}

export const ATTACK_HIT_FEEDBACK_MS = 780;
export const ATTACK_POST_COMPROMISE_PAUSE_MS = 180;
export const ATTACK_TRAVEL_SPEED = 1.2;
export const ATTACK_RESET_DELAY_MS = 5_000;

const ATTACK_PLAN = [
    { segmentId: 'attacker->react', targetId: 'react', travelDurationMs: 1_800 },
    { segmentId: 'react->dubbo', targetId: 'dubbo', travelDurationMs: 4_100 },
    { segmentId: 'dubbo->geoserver', targetId: 'geoserver', travelDurationMs: 3_400 },
    { segmentId: 'geoserver->postgres', targetId: 'postgres', travelDurationMs: 2_900 },
    { segmentId: 'dubbo->cacti', targetId: 'cacti', travelDurationMs: 4_200 },
    { segmentId: 'cacti->neo4j', targetId: 'neo4j', travelDurationMs: 3_400 },
] as const;

let sequenceCursorMs = 0;
export const ATTACK_PLAYBACK_STEPS: readonly IAttackPlaybackStep[] = ATTACK_PLAN.map((step) => {
    const startAtMs = sequenceCursorMs;
    const hitAtMs = startAtMs + step.travelDurationMs / ATTACK_TRAVEL_SPEED;
    sequenceCursorMs = hitAtMs + ATTACK_HIT_FEEDBACK_MS + ATTACK_POST_COMPROMISE_PAUSE_MS;
    return { ...step, startAtMs, hitAtMs };
});

const finalStep = ATTACK_PLAYBACK_STEPS.at(-1);
export const ATTACK_CYCLE_MS = (finalStep?.hitAtMs ?? 0) + ATTACK_HIT_FEEDBACK_MS + ATTACK_RESET_DELAY_MS;

const ATTACK_BOUNDARIES_MS = Array.from(new Set([...ATTACK_PLAYBACK_STEPS.flatMap(({ hitAtMs, startAtMs }) => [startAtMs, hitAtMs, hitAtMs + ATTACK_HIT_FEEDBACK_MS]), ATTACK_CYCLE_MS])).sort(
    (left, right) => left - right,
);

const getStaticPlaybackState = (): IAttackPlaybackState => ({
    cycleIndex: 0,
    segmentStates: Object.fromEntries(ATTACK_PLAYBACK_STEPS.map(({ segmentId }) => [segmentId, 'complete' as const])),
    nodeStates: Object.fromEntries(ATTACK_PLAYBACK_STEPS.map(({ targetId }) => [targetId, 'compromised' as const])),
});

export const getAttackPlaybackState = (totalElapsedMs: number, isReducedMotion = false): IAttackPlaybackState => {
    if (isReducedMotion) return getStaticPlaybackState();

    const safeElapsedMs = Math.max(0, totalElapsedMs);
    const cycleIndex = Math.floor(safeElapsedMs / ATTACK_CYCLE_MS);
    const elapsedMs = safeElapsedMs % ATTACK_CYCLE_MS;
    const segmentStates = Object.fromEntries(
        ATTACK_PLAYBACK_STEPS.map(({ hitAtMs, segmentId, startAtMs }) => {
            if (elapsedMs >= hitAtMs) return [segmentId, 'complete' as const];
            if (elapsedMs >= startAtMs) return [segmentId, 'active' as const];
            return [segmentId, 'idle' as const];
        }),
    );
    const nodeStates = Object.fromEntries(
        ATTACK_PLAYBACK_STEPS.map(({ hitAtMs, targetId }) => {
            if (elapsedMs < hitAtMs) return [targetId, 'idle' as const];
            if (elapsedMs < hitAtMs + ATTACK_HIT_FEEDBACK_MS) return [targetId, 'hit' as const];
            return [targetId, 'compromised' as const];
        }),
    );

    return {
        activeSegmentId: ATTACK_PLAYBACK_STEPS.find(({ segmentId }) => segmentStates[segmentId] === 'active')?.segmentId,
        cycleIndex,
        nodeStates,
        segmentStates,
    };
};

export const getAttackPlaybackStep = (segmentId: string) => ATTACK_PLAYBACK_STEPS.find((step) => step.segmentId === segmentId);

export const getAttackAnimationDurationMs = ({ hitAtMs, startAtMs }: Pick<IAttackPlaybackStep, 'hitAtMs' | 'startAtMs'>) => {
    const durationSeconds = Math.max(1.5, (hitAtMs - startAtMs) / 1_000);
    return Number(durationSeconds.toFixed(2)) * 1_000;
};

export const buildAttackDashedReveal = (visibleLength: number, totalLength: number) => {
    if (visibleLength <= 0) return `0 ${totalLength.toFixed(1)}`;

    const parts: string[] = [];
    let remaining = visibleLength;
    const dashLength = 4;
    const gapLength = 4;
    while (remaining > 0.05 && parts.length < 360) {
        const dashPart = Math.min(dashLength, remaining);
        parts.push(dashPart.toFixed(2));
        remaining -= dashPart;
        if (remaining <= 0.05) break;
        const gapPart = Math.min(gapLength, remaining);
        parts.push(gapPart.toFixed(2));
        remaining -= gapPart;
    }
    if (parts.length % 2 === 0) parts.push('0.01');
    parts.push(Math.max(totalLength - visibleLength + dashLength + gapLength, totalLength).toFixed(1));
    return parts.join(' ');
};

export const getNextAttackBoundaryDelay = (totalElapsedMs: number) => {
    const elapsedMs = Math.max(0, totalElapsedMs) % ATTACK_CYCLE_MS;
    const nextBoundaryMs = ATTACK_BOUNDARIES_MS.find((boundaryMs) => boundaryMs > elapsedMs) ?? ATTACK_CYCLE_MS;
    return Math.max(1, nextBoundaryMs - elapsedMs);
};
