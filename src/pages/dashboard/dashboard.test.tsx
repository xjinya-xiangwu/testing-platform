import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '@/pages/dashboard/dashboard';
import { resetSimulationStore, useSimulationStore } from '@/stores/simulation-store';
import { renderRangePage } from '@/test/render-range-page';
import Http from '@/utils/axios';

vi.mock('@/utils/axios', () => ({
    default: { get: vi.fn() },
}));

const OVERVIEW_RESPONSE = {
    evaluation_status: { total: 12, running: 7, queued: 2, completed_today: 3 },
    generated_at: '2026-09-16T03:00:00Z',
};

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: OVERVIEW_RESPONSE, msg: '' });
        resetSimulationStore();
    });

    afterEach(() => useSimulationStore.getState().stopTimers());

    it('shows the code-evaluation progress view without the situational awareness background or auxiliary panels', async () => {
        renderRangePage(<Dashboard />);

        expect(screen.getByRole('main', { name: '代码评测任务进度' })).toBeInTheDocument();
        expect(await screen.findAllByTestId('dashboard-metric')).toHaveLength(5);
        expect(screen.getByRole('region', { name: '当前代码评测任务进度' })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '中心化评测闭环' })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Benchmark 就绪态势' })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '评测运行事件流' })).not.toBeInTheDocument();
    });

    it('uses the requested static asset totals and the live task status values', async () => {
        renderRangePage(<Dashboard />);

        const metrics = await screen.findAllByTestId('dashboard-metric');
        expect(metrics.map((metric) => metric.textContent)).toEqual(
            expect.arrayContaining([expect.stringContaining('10+'), expect.stringContaining('100+'), expect.stringContaining('10,000+'), expect.stringContaining('7'), expect.stringContaining('3')]),
        );

        const progress = screen.getByRole('region', { name: '当前代码评测任务进度' });
        expect(within(progress).getByText('任务总数').parentElement).toHaveTextContent('12');
        expect(within(progress).getByText('运行中').parentElement).toHaveTextContent('7');
        expect(within(progress).getByText('排队中').parentElement).toHaveTextContent('2');
        expect(within(progress).getByText('已完成任务').parentElement).toHaveTextContent('3');
        expect(within(progress).getByLabelText('总任务 12，完成进度 25.0%')).toBeInTheDocument();
    });
});
