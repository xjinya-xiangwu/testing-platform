import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '@/pages/dashboard/dashboard';
import DashboardCenterColumn from '@/pages/dashboard/components/dashboard-center-column';
import { createDashboardFallbackData } from '@/api/dashboard';
import { resetSimulationStore, useSimulationStore } from '@/stores/simulation-store';
import { renderRangePage } from '@/test/render-range-page';
import Http from '@/utils/axios';
import { LocaleMessages } from '@/locale';
import { ZH } from '@/locale/zh';

vi.mock('@/utils/axios', () => ({
    default: { get: vi.fn() },
}));

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

const translate = (key: string) => (ZH as LocaleMessages)[key] ?? key;

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: OVERVIEW_RESPONSE, msg: '' });
        resetSimulationStore();
    });

    afterEach(() => {
        useSimulationStore.getState().stopTimers();
        vi.unstubAllGlobals();
    });

    it('keeps the original situational-awareness stage while replacing its content with the PRD evaluation scope', async () => {
        renderRangePage(<Dashboard />);

        expect(await screen.findAllByTestId('dashboard-metric')).toHaveLength(5);
        expect(screen.getByRole('main', { name: '中心化评测服务态势感知' })).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: '系统运行状态' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Benchmark 就绪态势' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '中心化评测闭环' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '评测运行事件流' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '评测 Run 状态' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '接入与治理状态' })).toBeInTheDocument();

        ['项目与授权', 'Benchmark 就绪', '对象接入', '创建评测', 'Run 与取证', '结果与复核', '报告与交付'].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
        expect(screen.getByText('演示数据 · 非真实运行')).toBeInTheDocument();
        expect(screen.queryByText('今日训练')).not.toBeInTheDocument();
        expect(screen.queryByText('模型排行榜')).not.toBeInTheDocument();
    });

    it('shows the two evaluation task entries and maps backend Run status without changing PRD asset counts', async () => {
        renderRangePage(<Dashboard />);

        expect(screen.getByRole('link', { name: '代码评测' })).toHaveAttribute('href', '/tasks?type=code');
        expect(screen.getByRole('link', { name: '靶场评测' })).toHaveAttribute('href', '/tasks?type=range');

        const taskStatus = screen.getByRole('region', { name: '评测 Run 状态' });
        expect(await within(taskStatus).findByLabelText('总任务 12，完成进度 25.0%')).toBeInTheDocument();
        expect(within(taskStatus).getByText('运行中').closest('li')).toHaveTextContent('7');
        expect(within(taskStatus).getByText('排队中').closest('li')).toHaveTextContent('2');
        expect(within(taskStatus).getByText('已完成').closest('li')).toHaveTextContent('3');

        const metrics = await screen.findAllByTestId('dashboard-metric');
        expect(metrics.map((metric) => metric.textContent)).toEqual(
            expect.arrayContaining([expect.stringContaining('10+'), expect.stringContaining('100+'), expect.stringContaining('10,000+'), expect.stringContaining('7'), expect.stringContaining('3')]),
        );
    });

    it('advances the evaluation event stream without mutating KPI content', async () => {
        const callbacks = new Map<number, () => void>();
        vi.spyOn(window, 'setInterval').mockImplementation(((handler: TimerHandler, timeout?: number) => {
            if (typeof handler === 'function') callbacks.set(timeout ?? 0, handler as () => void);
            return (timeout ?? 0) as unknown as ReturnType<typeof window.setInterval>;
        }) as unknown as typeof window.setInterval);

        renderRangePage(<Dashboard />);
        const [firstMetric] = await screen.findAllByTestId('dashboard-metric');
        const initialMetric = firstMetric.textContent;
        const initialCursor = useSimulationStore.getState().eventCursor;

        act(() => callbacks.get(2000)?.());
        expect(firstMetric.textContent).toBe(initialMetric);
        expect(useSimulationStore.getState().eventCursor).toBe(initialCursor + 1);
        expect(screen.getAllByText('INFO').length).toBeGreaterThan(0);
        expect(screen.getAllByText('WARN').length).toBeGreaterThan(0);
        expect(screen.getAllByText('ERROR').length).toBeGreaterThan(0);
    });

    it('renders safely when the evaluation event feed is empty', () => {
        const data = createDashboardFallbackData();
        renderRangePage(
            <DashboardCenterColumn data={{ ...data, events: [] }} eventCursor={0} eventTimelineEnteredAt={Date.now()} eventTimelineSeed={1} eventTimelineStartCursor={0} translate={translate} />,
        );

        expect(screen.getByRole('region', { name: '评测运行事件流' })).toBeInTheDocument();
    });
});
