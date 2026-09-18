import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '@/pages/dashboard/dashboard';
import { renderRangePage } from '@/test/render-range-page';
import Http from '@/utils/axios';

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

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: OVERVIEW_RESPONSE, msg: '' });
    });

    it('renders the P0 and P1 project data board modules', async () => {
        renderRangePage(<Dashboard />);

        expect(await screen.findByRole('main', { name: '项目数据看板' })).toBeInTheDocument();
        expect(screen.getByText('实际使用视角')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '核心状态指标' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '我的任务与执行状态' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '需要处理' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '资源可用性' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '当前任务观察' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '结果与结论摘要' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '报告与交付' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '数据与回流' })).toBeInTheDocument();

        expect(screen.getByRole('link', { name: '新建代码评测' })).toHaveAttribute('href', '/tasks?type=code');
        expect(screen.getByRole('link', { name: '新建靶场评测' })).toHaveAttribute('href', '/tasks?type=range');
        expect(screen.getByRole('link', { name: '打开工作台' })).toHaveAttribute('href', '/workbench?job=RUN-1024');
        expect(screen.getByText('RUN-1019 环境启动失败')).toBeInTheDocument();
        expect(screen.getByText('3 条低置信 Finding')).toBeInTheDocument();
    });

    it('maps the task overview into the four user-facing KPIs', async () => {
        renderRangePage(<Dashboard />);

        const kpis = screen.getByRole('region', { name: '核心状态指标' });
        await within(kpis).findByText('排队 2 · 异常 1 · 平均耗时 18m');
        expect(within(kpis).getAllByRole('article')).toHaveLength(4);
        expect(within(kpis).getByText('运行中任务')).toBeInTheDocument();
        expect(within(kpis).getByText('7')).toBeInTheDocument();
        expect(within(kpis).getByText('今日完成')).toBeInTheDocument();
        expect(within(kpis).getByText('3')).toBeInTheDocument();
        expect(within(kpis).getByText('等待我处理')).toBeInTheDocument();
        expect(within(kpis).getByText('资源可用')).toBeInTheDocument();
        expect(within(kpis).getByText('排队 2 · 异常 1 · 平均耗时 18m')).toBeInTheDocument();
    });

    it('keeps data source failures visible instead of replacing them with demo numbers', async () => {
        vi.mocked(Http.get).mockRejectedValueOnce(new Error('network failed'));
        renderRangePage(<Dashboard />);

        expect(await screen.findByText(/数据源异常/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
    });
});
