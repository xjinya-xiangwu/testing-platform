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

    it('renders the compact one-screen project data board', async () => {
        renderRangePage(<Dashboard />);

        expect(await screen.findByRole('main', { name: '项目数据看板' })).toBeInTheDocument();
        const overview = screen.getByRole('region', { name: '任务运行概览' });
        const panels = within(overview).getAllByRole('article');
        expect(panels).toHaveLength(2);
        expect(within(panels[0]).getByText('任务运行概览')).toBeInTheDocument();
        expect(within(panels[1]).getByText('资源就绪')).toBeInTheDocument();

        expect(screen.getByRole('region', { name: '我的任务与执行状态' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '当前任务观察' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '产生的数据集' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '报告与交付' })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '结果与结论摘要' })).not.toBeInTheDocument();

        expect(screen.getByRole('link', { name: '新建代码评测' })).toHaveAttribute('href', '/tasks?type=code');
        expect(screen.getByRole('link', { name: '新建靶场评测' })).toHaveAttribute('href', '/tasks?type=range');
        expect(screen.getByRole('link', { name: '打开工作台' })).toHaveAttribute('href', '/workbench?job=RUN-1024');
    });

    it('maps backend run status into the two compact metric groups', async () => {
        renderRangePage(<Dashboard />);

        const overview = screen.getByRole('region', { name: '任务运行概览' });
        await within(overview).findByText('排队 2 · 异常 1');
        expect(within(overview).getAllByRole('article')).toHaveLength(2);
        expect(within(overview).getByText('运行中')).toBeInTheDocument();
        expect(within(overview).getByText('7')).toBeInTheDocument();
        expect(within(overview).getByText('已完成')).toBeInTheDocument();
        expect(within(overview).getByText('3')).toBeInTheDocument();
        expect(within(overview).getByText('产生数据集')).toBeInTheDocument();
        expect(within(overview).getByText('待处理事项')).toBeInTheDocument();
        expect(within(overview).getByText('可用题集')).toBeInTheDocument();
        expect(within(overview).getByText('可用靶场')).toBeInTheDocument();
        expect(within(overview).getByText('可用算力')).toBeInTheDocument();
        expect(within(overview).getByText('已接入模型')).toBeInTheDocument();
    });

    it('integrates pending items into the compact task table', async () => {
        renderRangePage(<Dashboard />);

        const tasks = screen.getByRole('region', { name: '我的任务与执行状态' });
        expect(within(tasks).getAllByRole('row')).toHaveLength(5);
        expect(within(tasks).getByText('待处理')).toBeInTheDocument();
        expect(within(tasks).getByText('3 条低置信 Finding · 导出审批')).toBeInTheDocument();
        expect(within(tasks).getByText('Docker 镜像拉取超时')).toBeInTheDocument();
    });

    it('exposes quick view and download actions for datasets and reports', async () => {
        renderRangePage(<Dashboard />);

        const datasets = screen.getByRole('region', { name: '产生的数据集' });
        const reports = screen.getByRole('region', { name: '报告与交付' });

        expect(within(datasets).getAllByRole('link', { name: '下载' })).toHaveLength(2);
        expect(within(datasets).getAllByRole('link', { name: '查看' })).toHaveLength(2);
        expect(within(reports).getAllByRole('link', { name: '查看' })).toHaveLength(2);
        expect(within(reports).getAllByRole('link', { name: '下载' })).toHaveLength(1);
    });

    it('keeps data source failures visible instead of replacing them with demo numbers', async () => {
        vi.mocked(Http.get).mockRejectedValueOnce(new Error('network failed'));
        renderRangePage(<Dashboard />);

        expect(await screen.findByText(/数据源异常/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
    });
});
