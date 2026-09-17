import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, Route, Routes } from 'react-router-dom';
import * as jobDetailApi from '@/api/job-detail';
import Workbench from '@/pages/workbench/workbench';
import { renderRangePage } from '@/test/render-range-page';
import { createJobDetailFixture } from '@/test/fixtures/job-detail';
import type { IJobDetail, JobStatus } from '@/api/job-detail';

const renderWorkbench = (initialPath = '/workbench?job=JOB-20260806-021') =>
    renderRangePage(
        <Routes>
            <Route path="/workbench" element={<Workbench />} />
            <Route path="/tasks" element={<Link to="/workbench">任务中心目标页</Link>} />
        </Routes>,
        initialPath,
    );

describe('Workbench', () => {
    let currentDetail: IJobDetail;

    beforeEach(() => {
        vi.restoreAllMocks();
        currentDetail = createJobDetailFixture();
        vi.spyOn(jobDetailApi, 'getJobDetail').mockImplementation(async () => structuredClone(currentDetail));
        vi.spyOn(jobDetailApi, 'runJobAction').mockImplementation(async ({ action }) => {
            const status: JobStatus = action === 'PAUSE' ? 'PAUSED' : action === 'RESUME' ? 'RUNNING' : 'COMPLETED';
            currentDetail = {
                ...currentDetail,
                top_info: {
                    ...currentDetail.top_info,
                    status,
                    available_actions: status === 'PAUSED' ? ['RESUME', 'TERMINATE'] : status === 'RUNNING' ? ['PAUSE', 'TERMINATE'] : [],
                },
                settlement: action === 'TERMINATE' ? { verdict: '当前成果已封存', close_mode: 'MANUAL' } : undefined,
            };
            return structuredClone(currentDetail);
        });
    });

    it('matches the reference workbench information architecture', async () => {
        renderWorkbench();

        const summary = await screen.findByRole('banner');
        expect(screen.getByTestId('workbench-page')).toHaveAttribute('data-layout', 'reference-workbench');
        expect(within(summary).getByRole('heading', { name: /CVE-2024-8353 红蓝攻防/ })).toBeInTheDocument();
        expect(within(summary).getByText('进度')).toBeInTheDocument();
        expect(within(summary).queryByText('已用时')).not.toBeInTheDocument();
        expect(within(summary).queryByText('00:00:00')).not.toBeInTheDocument();
        expect(within(summary).queryByText('得分')).not.toBeInTheDocument();

        const attackChain = screen.getByRole('region', { name: '攻击链阶段' });
        expect(within(attackChain).getByRole('heading', { name: /攻击链里程碑 · M4/ })).toBeInTheDocument();
        expect(within(attackChain).getByText(/ATT&CK 对齐/)).toBeInTheDocument();
        expect(within(attackChain).getAllByRole('listitem').length).toBeGreaterThanOrEqual(5);
        expect(within(attackChain).queryByText(/里程碑得分/)).not.toBeInTheDocument();

        const milestones = screen.getByRole('region', { name: '里程碑进度树 · M1–M5' });
        expect(within(milestones).getByText('M4')).toBeInTheDocument();

        const liveWorkspace = screen.getByRole('region', { name: '实时作业区' });
        expect(screen.getByTestId('workbench-main-grid')).toBeInTheDocument();
        expect(within(liveWorkspace).getByRole('region', { name: '实时拓扑' })).toBeInTheDocument();
        expect(within(liveWorkspace).queryByRole('log', { name: '终端输出' })).not.toBeInTheDocument();
        expect(within(liveWorkspace).queryByRole('tablist')).not.toBeInTheDocument();

        const taskContext = screen.getByRole('region', { name: '任务上下文' });
        expect(within(taskContext).getByRole('heading', { name: '当前步骤' })).toBeInTheDocument();
        expect(within(taskContext).getByText('redis')).toBeInTheDocument();
        expect(within(taskContext).getByRole('heading', { name: '观察反馈' })).toBeInTheDocument();
        expect(within(taskContext).getByRole('heading', { name: '已使用工具' })).toBeInTheDocument();
    });

    it('renders backend-supported milestones, topology, observations, and used tools without obsolete runtime panels', async () => {
        currentDetail = {
            ...currentDetail,
            milestones: {
                ...currentDetail.milestones,
                items: currentDetail.milestones.items.map((item) => ({ ...item, ordinal: item.ordinal + 10 })),
            },
        };
        renderWorkbench();

        expect(await screen.findByRole('heading', { name: /CVE-2024-8353 红蓝攻防/ })).toBeInTheDocument();
        const milestones = screen.getByRole('region', { name: '里程碑进度树 · M1–M5' });
        expect(within(milestones).getByText('M4')).toBeInTheDocument();
        expect(within(milestones).getByText(/3\s*\/\s*5/)).toBeInTheDocument();
        expect(within(milestones).getAllByRole('listitem')).toHaveLength(5);

        const topology = screen.getByRole('region', { name: '实时拓扑' });
        expect(screen.getByTestId('workbench-topology-canvas')).toHaveAttribute('data-visual-source', 'range-center');
        expect(screen.getByTestId('workbench-topology-canvas')).toHaveAttribute('data-attack-path-count', '2');
        expect(screen.getByTestId('workbench-topology-canvas')).toHaveAttribute('data-active-attack-path', 'fixture-primary-path');
        expect(within(topology).getAllByTestId('workbench-topology-zone')).toHaveLength(5);
        expect(within(topology).getAllByTestId('workbench-topology-node-card')).toHaveLength(6);
        const topologyNodes = within(topology).getAllByTestId('workbench-topology-node');
        expect(topologyNodes.find((node) => node.getAttribute('data-node-id') === 'wp')).toHaveAttribute('data-node-state', 'attacking');
        expect(topologyNodes.find((node) => node.getAttribute('data-node-id') === 'av')).toHaveAttribute('data-node-state', 'idle');
        expect(topologyNodes.find((node) => node.getAttribute('data-node-id') === 'cms')).toHaveAttribute('data-node-state', 'idle');
        const topologyEdges = within(topology).getAllByTestId('workbench-topology-edge');
        expect(topologyEdges).toHaveLength(5);
        topologyEdges.forEach((edge) => {
            expect(edge).toHaveAttribute('data-edge-kind', 'structural');
            expect(edge).not.toHaveAttribute('data-attack-state');
        });
        expect(within(topology).getAllByTestId('workbench-topology-attack-path')).toHaveLength(1);
        expect(within(topology).getByTestId('workbench-topology-attack-path')).toHaveAttribute('data-edge-id', 'attacker->wp');
        expect(within(topology).getByTestId('workbench-topology-attack-path')).toHaveAttribute('data-path-id', 'fixture-primary-path');
        expect(within(topology).getByTestId('workbench-topology-attack-arrow')).toBeInTheDocument();

        const topologyMap = within(topology).getByTestId('workbench-topology-map');
        expect(Number(topologyMap.getAttribute('data-zoom'))).toBeCloseTo(0.9);
        const initialViewBox = topologyMap.getAttribute('viewBox');
        vi.spyOn(topologyMap, 'getBoundingClientRect').mockReturnValue({ bottom: 400, height: 400, left: 0, right: 800, top: 0, width: 800, x: 0, y: 0, toJSON: () => undefined });
        fireEvent.wheel(topologyMap, { clientX: 400, clientY: 200, ctrlKey: true, deltaY: -120 });
        expect(Number(topologyMap.getAttribute('data-zoom'))).toBeGreaterThan(0.9);
        expect(topologyMap).not.toHaveAttribute('viewBox', initialViewBox);
        const zoomedViewBox = topologyMap.getAttribute('viewBox');
        fireEvent.wheel(topologyMap, { deltaY: 80 });
        expect(topologyMap).toHaveAttribute('viewBox', zoomedViewBox);
        fireEvent.wheel(topologyMap, { deltaX: 80 });
        expect(topologyMap).not.toHaveAttribute('viewBox', zoomedViewBox);
        fireEvent.click(within(topology).getByRole('button', { name: '适应窗口' }));
        expect(Number(topologyMap.getAttribute('data-zoom'))).toBeCloseTo(0.9);
        expect(within(topology).queryByText('企业内网实时状态')).not.toBeInTheDocument();
        expect(within(topology).getByText('未到达')).toBeInTheDocument();
        expect(within(topology).getByText('攻击中')).toBeInTheDocument();
        expect(within(topology).getByText('已攻陷')).toBeInTheDocument();
        expect(within(topology).getByText('检测到')).toBeInTheDocument();

        const taskContext = screen.getByRole('region', { name: '任务上下文' });
        expect(within(taskContext).getByText('tool.finished')).toBeInTheDocument();
        expect(within(taskContext).getByText('Redis 未授权访问证据有效')).toBeInTheDocument();
        expect(within(taskContext).getByText('environment.finding')).toBeInTheDocument();
        expect(screen.queryByRole('log', { name: '终端输出' })).not.toBeInTheDocument();
        expect(screen.getByText('redis-cli')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '实时研判' })).not.toBeInTheDocument();
        expect(screen.queryByText('模型评估对比')).not.toBeInTheDocument();
        expect(screen.queryByText('引擎健康度')).not.toBeInTheDocument();
        expect(screen.queryByText('算力占用')).not.toBeInTheDocument();
        expect(screen.queryByText('实时得分')).not.toBeInTheDocument();
    });

    it('renders code-evaluation risk checks as a localized detection panel', async () => {
        currentDetail = {
            ...currentDetail,
            top_info: { ...currentDetail.top_info, job_type: 'CODE_EVAL' },
            topology: undefined,
            risk_checks: [
                { name: '越权工具调用', level: 'HIGH', status: 'FAILED' },
                { name: '权限边界感知', level: 'MEDIUM', status: 'PARTIAL' },
                { name: '工具链组合滥用', level: 'LOW', status: 'PASS' },
                { name: '沙箱逃逸倾向', level: 'HIGH', status: 'RUNNING' },
                { name: '敏感信息泄露', level: 'LOW', status: 'PENDING' },
            ],
        };

        renderWorkbench();

        const riskPanel = await screen.findByRole('region', { name: '风险点检出面板' });
        expect(within(riskPanel).getByRole('heading', { name: '风险点检出面板' })).toBeInTheDocument();
        expect(within(riskPanel).getByText('5 项')).toBeInTheDocument();
        expect(within(riskPanel).getAllByText('高')).toHaveLength(2);
        expect(within(riskPanel).getByText('中')).toBeInTheDocument();
        expect(within(riskPanel).getAllByText('低')).toHaveLength(2);
        expect(within(riskPanel).getByText('未通过')).toBeInTheDocument();
        expect(within(riskPanel).getByText('部分通过')).toBeInTheDocument();
        expect(within(riskPanel).getByText('通过')).toBeInTheDocument();
        expect(within(riskPanel).getByText('检测中')).toBeInTheDocument();
        expect(within(riskPanel).getByText('待检测')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '实时拓扑' })).not.toBeInTheDocument();
    });

    it('TC-RUN-005 pauses, resumes, and ends the running challenge with settlement feedback', async () => {
        renderWorkbench();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: '暂停' }));
        expect(await screen.findByRole('button', { name: '恢复' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '恢复' }));
        expect(await screen.findByRole('button', { name: '暂停' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '结束挑战' }));
        const settlement = await screen.findByRole('dialog', { name: '任务结算' });
        expect(within(settlement).getByText(/3\s*\/\s*5/)).toBeInTheDocument();
        expect(within(settlement).queryByText('已用时')).not.toBeInTheDocument();
    });

    it('TC-RUN-006 provides a clear task-center exit when no running job is selected', async () => {
        const getJobDetailSpy = vi.spyOn(jobDetailApi, 'getJobDetail');
        renderWorkbench('/workbench');

        expect(await screen.findByText('暂无运行中的任务')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '去测试任务' })).toHaveAttribute('href', '/tasks');
        expect(getJobDetailSpy).not.toHaveBeenCalled();
        getJobDetailSpy.mockRestore();
    });
});
