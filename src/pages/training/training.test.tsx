import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import Training from '@/pages/training/training';
import { createTrainingTask, getTrainingTaskDetail, getTrainingTasks, terminateTrainingTask, TrainingTaskApiError } from '@/api/training-tasks';
import { renderRangePage } from '@/test/render-range-page';

vi.mock('@/api/training-tasks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/training-tasks')>();
    return {
        ...actual,
        createTrainingTask: vi.fn(),
        getTrainingTaskDetail: vi.fn(),
        getTrainingTasks: vi.fn(),
        terminateTrainingTask: vi.fn(),
    };
});

const TASKS = [
    {
        id: 'TRN-QUEUED',
        name: '排队任务',
        goal: '等待资源',
        priority: 2 as const,
        type: 1 as const,
        dataset: 0 as const,
        gpu: [{ model: 'H100', count: 8 }],
        progress: 0,
        step: 0,
        total: 30000,
        status: 0 as const,
        createdAt: '2026-08-20T03:30:00Z',
        updatedAt: '2026-08-20T03:30:00Z',
    },
    {
        id: 'TRN-RUNNING',
        name: '运行任务',
        goal: '训练中',
        priority: 1 as const,
        type: 1 as const,
        dataset: 1 as const,
        gpu: [{ model: 'H100', count: 8 }],
        progress: 42,
        step: 12600,
        total: 30000,
        status: 1 as const,
        featured: true,
        createdAt: '2026-08-20T03:30:00Z',
        updatedAt: '2026-08-20T03:30:00Z',
    },
    {
        id: 'TRN-EVALUATING',
        name: '评估任务',
        goal: '门禁评估中',
        priority: 1 as const,
        type: 1 as const,
        dataset: 2 as const,
        gpu: [{ model: 'H100', count: 4 }],
        progress: 100,
        step: 30000,
        total: 30000,
        status: 2 as const,
        createdAt: '2026-08-20T03:30:00Z',
        updatedAt: '2026-08-20T03:30:00Z',
    },
    {
        id: 'TRN-DONE',
        name: '完成任务',
        goal: '训练完成',
        priority: 2 as const,
        type: 0 as const,
        dataset: 3 as const,
        gpu: [{ model: 'H100', count: 4 }],
        progress: 100,
        step: 30000,
        total: 30000,
        status: 3 as const,
        createdAt: '2026-08-20T03:30:00Z',
        updatedAt: '2026-08-20T03:30:00Z',
    },
    {
        id: 'TRN-TERMINATED',
        name: '终止任务',
        goal: '已停止',
        priority: 2 as const,
        type: 2 as const,
        dataset: 3 as const,
        gpu: [{ model: 'H100', count: 4 }],
        progress: 20,
        step: 6000,
        total: 30000,
        status: 4 as const,
        createdAt: '2026-08-20T03:30:00Z',
        updatedAt: '2026-08-20T03:30:00Z',
    },
];

const renderTraining = (path = '/training') =>
    renderRangePage(
        <Routes>
            <Route path="/training" element={<Training />} />
            <Route path="/training-live" element={<Training />} />
        </Routes>,
        path,
    );

describe('Training', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getTrainingTasks).mockResolvedValue({ list: TASKS, page: { page: 1, pageSize: 10, total: TASKS.length } });
        vi.mocked(getTrainingTaskDetail).mockResolvedValue({
            ...TASKS[1],
            benchmarks: [0, 1],
            split: 0,
            base: 'v2.2',
            framework: 'rl',
            rlAlgorithm: 'grpo',
            duration: 1,
            hyperparameters: { learning_rate: '1e-6' },
            refreshAfterMs: 0,
        });
        vi.mocked(createTrainingTask).mockResolvedValue({ id: 'TRN-CREATED', status: 0, progress: 0, step: 0, total: 30000, createdAt: '2026-08-20T03:30:00Z' });
        vi.mocked(terminateTrainingTask).mockResolvedValue({ id: 'TRN-RUNNING', status: 4, progress: 42, step: 12600, total: 30000, updatedAt: '2026-08-20T03:35:00Z' });
    });

    it('renders the real list states and keeps export actions disabled with a development tooltip', async () => {
        renderTraining();

        expect(await screen.findByRole('heading', { name: '训练任务' })).toBeInTheDocument();
        const statusTabs = within(screen.getByRole('group', { name: '训练任务状态筛选' })).getAllByRole('button');
        expect(statusTabs.map((tab) => tab.textContent)).toEqual(['全部', '运行中', '排队中', '评估中', '已完成', '已终止']);
        expect(screen.getByRole('button', { name: '取消排队 TRN-QUEUED' })).toBeEnabled();
        expect(screen.getByRole('button', { name: '终止 TRN-RUNNING' })).toBeEnabled();
        expect(screen.getByRole('button', { name: '终止 TRN-EVALUATING' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: '终止 TRN-TERMINATED' })).not.toBeInTheDocument();

        const exportData = screen.getByRole('button', { name: '导出数据集 TRN-DONE' });
        const exportModel = screen.getByRole('button', { name: '导出模型 TRN-DONE' });
        expect(exportData).toBeDisabled();
        expect(exportModel).toBeDisabled();
        expect(exportData.parentElement).toHaveAttribute('title', '该功能开发中');
        expect(exportModel.parentElement).toHaveAttribute('title', '该功能开发中');
        await userEvent.hover(exportData.parentElement as HTMLElement);
        expect(await screen.findByRole('tooltip')).toHaveTextContent('该功能开发中');
    });

    it('submits the documented six-step defaults and refreshes the task list', async () => {
        renderTraining();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: '新建训练任务' }));
        const dialog = screen.getByRole('dialog', { name: '新建训练任务' });
        for (let step = 1; step < 6; step += 1) await user.click(within(dialog).getByRole('button', { name: '下一步' }));
        await user.click(within(dialog).getByRole('button', { name: '确认提交' }));

        await waitFor(() => expect(createTrainingTask).toHaveBeenCalledOnce());
        expect(createTrainingTask).toHaveBeenCalledWith(expect.objectContaining({ name: expect.any(String), framework: 'rl', rlAlgorithm: 'grpo', gpu: [{ model: 'H100', count: 8 }] }));
        await waitFor(() => expect(getTrainingTasks).toHaveBeenCalledTimes(2));
    });

    it('keeps every wizard control editable across all six steps', async () => {
        renderTraining();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '新建训练任务' }));
        const dialog = screen.getByRole('dialog', { name: '新建训练任务' });

        await user.clear(within(dialog).getByLabelText('任务名称'));
        await user.type(within(dialog).getByLabelText('任务名称'), '回归训练任务');
        await user.click(within(dialog).getByLabelText('P0 紧急'));
        await user.click(within(dialog).getByLabelText('SFT 监督微调'));
        await user.click(within(dialog).getByLabelText('RL 强化学习'));
        await user.type(within(dialog).getByLabelText('训练目标'), '验证全部配置控件');
        await user.click(within(dialog).getByRole('button', { name: '下一步' }));

        await user.selectOptions(within(dialog).getByLabelText('训练数据集'), '2');
        await user.click(within(dialog).getByLabelText('CyberGym'));
        await user.click(within(dialog).getByLabelText('9 : 1'));
        await user.click(within(dialog).getByRole('button', { name: '下一步' }));

        await user.click(within(dialog).getByLabelText('自研 v2.1'));
        await user.click(within(dialog).getByLabelText('自研 SFT 框架'));
        await user.click(within(dialog).getByLabelText('自研 RL 框架'));
        await user.click(within(dialog).getByLabelText('PPO'));
        await user.click(within(dialog).getByRole('button', { name: '下一步' }));

        await user.click(within(dialog).getByLabelText('4×H100'));
        await user.click(within(dialog).getByLabelText('12 小时'));
        await user.click(within(dialog).getByRole('button', { name: '下一步' }));

        const parameterInputs = within(dialog).getAllByRole('textbox');
        await user.clear(parameterInputs[0]);
        await user.type(parameterInputs[0], '5e-7');
        await user.click(within(dialog).getByRole('button', { name: '上一步' }));
        await user.click(within(dialog).getByRole('button', { name: '下一步' }));
        await user.click(within(dialog).getByRole('button', { name: '下一步' }));
        await user.click(within(dialog).getByRole('button', { name: '确认提交' }));

        await waitFor(() =>
            expect(createTrainingTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: '回归训练任务',
                    priority: 0,
                    dataset: 2,
                    benchmarks: [0, 1],
                    split: 0,
                    base: 'v2.1',
                    framework: 'rl',
                    rlAlgorithm: 'ppo',
                    gpu: [{ model: 'H100', count: 4 }],
                    duration: 0,
                    hyperparameters: expect.objectContaining({ LR: '5e-7' }),
                }),
            ),
        );
    });

    it('applies server filters and exposes a localized retry state', async () => {
        vi.mocked(getTrainingTasks).mockRejectedValueOnce(new Error('Training task request failed'));
        renderTraining();
        const user = userEvent.setup();

        expect(await screen.findByRole('alert')).toHaveTextContent('训练任务加载失败，请重试。');
        await user.click(screen.getByRole('button', { name: '重试' }));
        expect(await screen.findByText('运行任务')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '运行中' }));
        await waitFor(() => expect(getTrainingTasks).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 1 })));
        await user.type(screen.getByPlaceholderText('搜索任务名称或目标'), '智能体');
        await waitFor(() => expect(getTrainingTasks).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: '智能体', page: 1, status: 1 })));
    });

    it('opens the live detail route and renders API progress with demo telemetry', async () => {
        renderTraining();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('link', { name: '实时监控 TRN-RUNNING' }));

        expect(await screen.findByRole('dialog', { name: '训练任务详情' })).toBeInTheDocument();
        expect(getTrainingTaskDetail).toHaveBeenCalledWith('TRN-RUNNING');
        expect(screen.getByText('训练效果')).toBeInTheDocument();
        expect(screen.getByText('GPU 集群监控')).toBeInTheDocument();
        expect(screen.getByText('终端日志流')).toBeInTheDocument();
    });

    it('shows the backend terminate error without hiding the action up front', async () => {
        vi.mocked(terminateTrainingTask).mockRejectedValueOnce(new TrainingTaskApiError('NOT_FOUND', 'private backend detail'));
        renderTraining();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: '终止 TRN-RUNNING' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('任务不存在、无权操作或当前任务不可终止。');
        expect(screen.queryByText('private backend detail')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '关闭' }));
        expect(screen.queryByText('任务不存在、无权操作或当前任务不可终止。')).not.toBeInTheDocument();
    });
});
