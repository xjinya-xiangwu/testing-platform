export type WorkbenchAttackNodeState = 'compromised' | 'hit' | 'idle';
export type WorkbenchAttackSegmentState = 'active' | 'complete' | 'idle';

export interface IWorkbenchAttackPathInput {
    id: string;
    nodeIds: readonly string[];
}

export interface IWorkbenchAttackPlaybackTiming {
    cyclePauseMs: number;
    hitFeedbackMs: number;
    routePauseMs: number;
    travelMs: number;
}

export interface IWorkbenchAttackPlaybackSegment {
    durationMs: number;
    edgeId: string;
    hitAtMs: number;
    id: string;
    pathId: string;
    sourceId: string;
    startAtMs: number;
    targetId: string;
}

interface IWorkbenchAttackPlaybackPath extends IWorkbenchAttackPathInput {
    attackEndAtMs: number;
    endAtMs: number;
    segments: readonly IWorkbenchAttackPlaybackSegment[];
    startAtMs: number;
}

export interface IWorkbenchAttackPlaybackSchedule {
    boundariesMs: readonly number[];
    cycleDurationMs: number;
    paths: readonly IWorkbenchAttackPlaybackPath[];
    timing: IWorkbenchAttackPlaybackTiming;
}

export interface IWorkbenchAttackPlaybackState {
    activePathId?: string;
    activeSegment?: IWorkbenchAttackPlaybackSegment;
    cycleIndex: number;
    nodeStates: Readonly<Record<string, WorkbenchAttackNodeState>>;
    segmentStates: Readonly<Record<string, WorkbenchAttackSegmentState>>;
}

export const DEFAULT_WORKBENCH_ATTACK_TIMING: IWorkbenchAttackPlaybackTiming = {
    cyclePauseMs: 2_000,
    hitFeedbackMs: 600,
    routePauseMs: 900,
    travelMs: 1_600,
};

const uniqueSortedNumbers = (values: readonly number[]) => [...new Set(values)].sort((left, right) => left - right);

export const getWorkbenchAttackSegmentId = (pathId: string, segmentIndex: number, sourceId: string, targetId: string) => `${pathId}:${segmentIndex}:${sourceId}->${targetId}`;

export const createWorkbenchAttackPlaybackSchedule = (
    paths: readonly IWorkbenchAttackPathInput[],
    timing: IWorkbenchAttackPlaybackTiming = DEFAULT_WORKBENCH_ATTACK_TIMING,
): IWorkbenchAttackPlaybackSchedule => {
    const playablePaths = paths.filter(({ nodeIds }) => nodeIds.length >= 2);
    let cursorMs = 0;
    const scheduledPaths = playablePaths.map<IWorkbenchAttackPlaybackPath>((path, pathIndex) => {
        const startAtMs = cursorMs;
        const segments = path.nodeIds.slice(0, -1).map<IWorkbenchAttackPlaybackSegment>((sourceId, segmentIndex) => {
            const targetId = path.nodeIds[segmentIndex + 1];
            const segmentStartAtMs = cursorMs;
            const hitAtMs = segmentStartAtMs + timing.travelMs;
            cursorMs = hitAtMs + timing.hitFeedbackMs;
            return {
                durationMs: timing.travelMs,
                edgeId: `${sourceId}->${targetId}`,
                hitAtMs,
                id: getWorkbenchAttackSegmentId(path.id, segmentIndex, sourceId, targetId),
                pathId: path.id,
                sourceId,
                startAtMs: segmentStartAtMs,
                targetId,
            };
        });
        const attackEndAtMs = cursorMs;
        cursorMs += pathIndex === playablePaths.length - 1 ? timing.cyclePauseMs : timing.routePauseMs;
        return { ...path, attackEndAtMs, endAtMs: cursorMs, segments, startAtMs };
    });
    const cycleDurationMs = Math.max(1, cursorMs);
    const boundariesMs = uniqueSortedNumbers([
        ...scheduledPaths.flatMap(({ startAtMs, segments }) => [startAtMs, ...segments.flatMap(({ hitAtMs }) => [hitAtMs, hitAtMs + timing.hitFeedbackMs])]),
        cycleDurationMs,
    ]).filter((boundaryMs) => boundaryMs > 0);

    return { boundariesMs, cycleDurationMs, paths: scheduledPaths, timing };
};

export const getWorkbenchAttackPlaybackState = (schedule: IWorkbenchAttackPlaybackSchedule, totalElapsedMs: number): IWorkbenchAttackPlaybackState => {
    if (schedule.paths.length === 0) return { cycleIndex: 0, nodeStates: {}, segmentStates: {} };

    const safeElapsedMs = Math.max(0, totalElapsedMs);
    const cycleIndex = Math.floor(safeElapsedMs / schedule.cycleDurationMs);
    const elapsedMs = safeElapsedMs % schedule.cycleDurationMs;
    const activePath = schedule.paths.find(({ startAtMs, endAtMs }) => elapsedMs >= startAtMs && elapsedMs < endAtMs) ?? schedule.paths[0];
    const segmentStates = Object.fromEntries(
        activePath.segments.map((segment) => {
            if (elapsedMs < segment.startAtMs) return [segment.id, 'idle' as const];
            if (elapsedMs < segment.hitAtMs) return [segment.id, 'active' as const];
            return [segment.id, 'complete' as const];
        }),
    );
    const nodeStates = Object.fromEntries(
        activePath.segments.map((segment) => {
            if (elapsedMs < segment.hitAtMs) return [segment.targetId, 'idle' as const];
            if (elapsedMs < segment.hitAtMs + schedule.timing.hitFeedbackMs) return [segment.targetId, 'hit' as const];
            return [segment.targetId, 'compromised' as const];
        }),
    );

    return {
        activePathId: activePath.id,
        activeSegment: activePath.segments.find(({ id }) => segmentStates[id] === 'active'),
        cycleIndex,
        nodeStates,
        segmentStates,
    };
};

export const getNextWorkbenchAttackBoundaryDelay = (schedule: IWorkbenchAttackPlaybackSchedule, totalElapsedMs: number) => {
    const elapsedMs = Math.max(0, totalElapsedMs) % schedule.cycleDurationMs;
    const nextBoundaryMs = schedule.boundariesMs.find((boundaryMs) => boundaryMs > elapsedMs) ?? schedule.cycleDurationMs;
    return Math.max(1, nextBoundaryMs - elapsedMs);
};
