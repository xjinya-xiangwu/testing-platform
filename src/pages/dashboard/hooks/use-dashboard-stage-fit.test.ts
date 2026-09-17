import { describe, expect, it } from 'vitest';
import { DASHBOARD_STAGE_SIZE, getDashboardStageFit } from '@/pages/dashboard/hooks/use-dashboard-stage-fit';

describe('dashboard stage fit', () => {
    it('keeps the authored 1920 by 1080 stage at native scale', () => {
        expect(getDashboardStageFit(1920, 1080)).toEqual({ scale: 1, stageWidth: 1920 });
    });

    it('scales the authored stage down to fit a narrower application viewport', () => {
        const fit = getDashboardStageFit(1280, 720);

        expect(fit.scale).toBeCloseTo(2 / 3);
        expect(fit.stageWidth).toBe(1920);
    });

    it('expands the center above the 1280-wide threshold at 720px height', () => {
        const fit = getDashboardStageFit(1600, 720);

        expect(fit.scale).toBeCloseTo(2 / 3);
        expect(fit.stageWidth).toBeCloseTo(2400);
    });

    it('retains the design minimum scale for extremely small containers', () => {
        const fit = getDashboardStageFit(100, 50);

        expect(fit.scale).toBe(DASHBOARD_STAGE_SIZE.minScale);
        expect(fit.stageWidth).toBe(DASHBOARD_STAGE_SIZE.minWidth);
    });
});
