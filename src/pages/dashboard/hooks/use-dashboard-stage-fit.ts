import { RefObject, useLayoutEffect } from 'react';

export const DASHBOARD_STAGE_SIZE = {
    height: 1080,
    minScale: 0.1,
    minWidth: 1920,
} as const;

export interface IDashboardStageFit {
    scale: number;
    stageWidth: number;
}

export const getDashboardStageFit = (viewportWidth: number, viewportHeight: number): IDashboardStageFit => {
    const safeWidth = Math.max(viewportWidth, 1);
    const safeHeight = Math.max(viewportHeight, 1);
    const scale = Math.max(Math.min(safeWidth / DASHBOARD_STAGE_SIZE.minWidth, safeHeight / DASHBOARD_STAGE_SIZE.height), DASHBOARD_STAGE_SIZE.minScale);

    return {
        scale,
        stageWidth: Math.max(DASHBOARD_STAGE_SIZE.minWidth, safeWidth / scale),
    };
};

const applyDashboardStageFit = (container: HTMLElement, stage: HTMLElement) => {
    const bounds = container.getBoundingClientRect();
    const { scale, stageWidth } = getDashboardStageFit(bounds.width || container.clientWidth, bounds.height || container.clientHeight);

    stage.style.setProperty('--dashboard-stage-width', `${stageWidth.toFixed(2)}px`);
    stage.style.setProperty('--dashboard-fit-scale', scale.toFixed(4));
};

const useDashboardStageFit = (containerRef: RefObject<HTMLElement | null>, stageRef: RefObject<HTMLElement | null>) => {
    useLayoutEffect(() => {
        const container = containerRef.current;
        const stage = stageRef.current;
        if (!container || !stage) return undefined;

        const fitStage = () => applyDashboardStageFit(container, stage);
        const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fitStage);

        fitStage();
        resizeObserver?.observe(container);
        window.addEventListener('resize', fitStage);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', fitStage);
        };
    }, [containerRef, stageRef]);
};

export default useDashboardStageFit;
