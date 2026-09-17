import { describe, expect, it } from 'vitest';
import { applyWorkbenchTopologyWheel, getDefaultWorkbenchTopologyViewport, getWorkbenchTopologyZoom } from '@/pages/workbench/components/workbench-topology-viewport';

const CONTENT_SIZE = { height: 360, width: 1820 };

describe('workbench topology viewport', () => {
    it('fits the full topology with balanced breathing room by default', () => {
        const viewport = getDefaultWorkbenchTopologyViewport(CONTENT_SIZE);

        expect(viewport.x).toBeLessThan(0);
        expect(viewport.y).toBeLessThan(0);
        expect(viewport.x + viewport.width).toBeGreaterThan(CONTENT_SIZE.width);
        expect(viewport.y + viewport.height).toBeGreaterThan(CONTENT_SIZE.height);
        expect(Math.abs(-viewport.x - (viewport.x + viewport.width - CONTENT_SIZE.width))).toBeLessThan(0.1);
        expect(getWorkbenchTopologyZoom(viewport, CONTENT_SIZE)).toBeCloseTo(0.9);
    });

    it('zooms around the trackpad anchor and pans without changing scale', () => {
        const initial = getDefaultWorkbenchTopologyViewport(CONTENT_SIZE);
        const anchor = { x: initial.x + initial.width / 2, y: initial.y + initial.height / 2 };
        const zoomed = applyWorkbenchTopologyWheel(initial, CONTENT_SIZE, {
            anchor,
            containerHeight: 400,
            containerWidth: 800,
            deltaX: 0,
            deltaY: -120,
            isZoomGesture: true,
        });

        expect(zoomed.width).toBeLessThan(initial.width);
        expect(zoomed.height).toBeLessThan(initial.height);
        expect(zoomed.x + zoomed.width / 2).toBeCloseTo(anchor.x);
        expect(zoomed.y + zoomed.height / 2).toBeCloseTo(anchor.y);

        const panned = applyWorkbenchTopologyWheel(zoomed, CONTENT_SIZE, {
            anchor,
            containerHeight: 400,
            containerWidth: 800,
            deltaX: 40,
            deltaY: 24,
            isZoomGesture: false,
        });
        expect(panned.width).toBe(zoomed.width);
        expect(panned.height).toBe(zoomed.height);
        expect(panned.x).toBeGreaterThan(zoomed.x);
        expect(panned.y).toBeGreaterThan(zoomed.y);

        const bounded = applyWorkbenchTopologyWheel(panned, CONTENT_SIZE, {
            anchor,
            containerHeight: 400,
            containerWidth: 800,
            deltaX: 100_000,
            deltaY: 100_000,
            isZoomGesture: false,
        });
        expect(bounded.x).toBeLessThan(CONTENT_SIZE.width);
        expect(bounded.x + bounded.width).toBeGreaterThan(0);
        expect(bounded.y).toBeLessThan(CONTENT_SIZE.height);
        expect(bounded.y + bounded.height).toBeGreaterThan(0);
    });
});
