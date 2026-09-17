import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDashboardFallbackData, getDashboardData } from '@/api/dashboard';
import Http from '@/utils/axios';

vi.mock('@/utils/axios', () => ({ default: { get: vi.fn() } }));

const OVERVIEW_RESPONSE = {
    summary: {
        range_environment_total: 52847,
        online_instance_count: 18392,
        training_today_count: 3307,
        running_evaluation_count: 127,
        combat_drill_count: 8,
        attack_event_today_count: 14580,
    },
    evaluation_status: { total: 12, running: 7, queued: 2, completed_today: 3 },
    generated_at: '2026-09-16T03:00:00Z',
};

describe('dashboard API facade', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: OVERVIEW_RESPONSE, msg: '' });
    });

    it('keeps PRD-scoped presentation metrics and maps the backend-owned Run status', async () => {
        const data = await getDashboardData();

        expect(Http.get).toHaveBeenCalledWith('/api/v1/dashboard/overview', { forbidMsg: true });
        expect(data.metrics.map(({ id, value }) => [id, value])).toEqual([
            ['sandboxes', 2500],
            ['benchmarks', 5],
            ['subjects', 3],
            ['runs', 7],
            ['reviews', 3],
            ['reports', 2],
        ]);
        expect(data.taskRing).toEqual({ total: 12, running: 7, queued: 2, doneToday: 3, completionPercent: 25 });
    });

    it('derives a finite zero completion percentage when no Runs exist', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: { ...OVERVIEW_RESPONSE, evaluation_status: { total: 0, running: 0, queued: 0, completed_today: 0 } },
            msg: '',
        });

        const data = await getDashboardData();
        expect(data.taskRing.completionPercent).toBe(0);
        expect(data.metrics.find((metric) => metric.id === 'runs')?.value).toBe(0);
    });

    it('accepts an overview without the retired summary while preserving evaluation-scope metrics', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: { evaluation_status: { total: 4, running: 2, queued: 1, completed_today: 1 }, generated_at: OVERVIEW_RESPONSE.generated_at },
            msg: '',
        });

        const data = await getDashboardData();
        expect(data.metrics.map((metric) => metric.value)).toEqual([2500, 5, 3, 2, 3, 2]);
        expect(data.taskRing).toEqual({ total: 4, running: 2, queued: 1, doneToday: 1, completionPercent: 25 });
    });

    it('rejects malformed backend-owned status data', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: { evaluation_status: { total: -1, running: 0, queued: 0, completed_today: 0 }, generated_at: OVERVIEW_RESPONSE.generated_at },
            msg: '',
        });
        await expect(getDashboardData()).rejects.toThrow('Invalid dashboard overview response');
    });

    it('turns an empty business response into a query error', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 9999, data: null, msg: 'failed' });
        await expect(getDashboardData()).rejects.toThrow('Dashboard overview request failed');
    });

    it('returns fresh evaluation-scope DTOs for React Query consumers', () => {
        const first = createDashboardFallbackData();
        const second = createDashboardFallbackData();

        expect(first).toEqual(second);
        expect(first).not.toBe(second);
        expect(first.metrics).not.toBe(second.metrics);
        expect(first.events).not.toBe(second.events);
        expect(first.modelLeaderboards).toEqual([]);
        expect(first.capabilities).toEqual([]);
        expect(first.radar.dimensionKeys).toEqual([]);
    });
});
