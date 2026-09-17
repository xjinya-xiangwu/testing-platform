import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, Route, Routes } from 'react-router-dom';
import { getDemoJob } from '@/api/demo-job';
import Tasks from '@/pages/tasks/tasks';
import { getPendingReviewData, getPendingReviewSummary, getSettledReviewData, updateReviewTicket } from '@/api/review';
import { enqueueTask, getTaskCenterData, getTaskCreationData, terminateTask } from '@/api/tasks';
import { resetTaskDraftStore, useTaskDraftStore } from '@/stores/task-draft-store';
import { createReviewFixture, REVIEW_REPORTS } from '@/test/fixtures/review';
import { createTaskCenterFixture } from '@/test/fixtures/task-center';
import { renderRangePage } from '@/test/render-range-page';
import { LocaleLanguage, LocaleMessages } from '@/locale';
import { EN } from '@/locale/en';
import { ZH } from '@/locale/zh';
import type { IReviewData } from '@/api/review';
import type { ITaskCenterData, ITaskRecord } from '@/api/tasks';

const REVIEW_API_MOCKS = vi.hoisted(() => ({
    generateJobReport: vi.fn(),
    getJobReviewData: vi.fn(),
    getReportContent: vi.fn(),
    getReportDownload: vi.fn(),
}));

vi.mock('@/api/tasks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/tasks')>();
    return { ...actual, enqueueTask: vi.fn(), getTaskCenterData: vi.fn(), getTaskCreationData: vi.fn(), terminateTask: vi.fn() };
});

vi.mock('@/api/demo-job', () => ({
    getDemoJob: vi.fn(),
}));

vi.mock('@/api/review', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/review')>();
    return {
        ...actual,
        generateJobReport: REVIEW_API_MOCKS.generateJobReport,
        getJobReviewData: REVIEW_API_MOCKS.getJobReviewData,
        getPendingReviewData: vi.fn(),
        getPendingReviewSummary: vi.fn(),
        getReportContent: REVIEW_API_MOCKS.getReportContent,
        getReportDownload: REVIEW_API_MOCKS.getReportDownload,
        getSettledReviewData: vi.fn(),
        updateReviewTicket: vi.fn(),
    };
});

let taskData: ITaskCenterData;
let reviewData: IReviewData;

const renderTasks = (locale: LocaleMessages = ZH, lang: LocaleLanguage = 'zh-CN', initialPath = '/tasks') => {
    return renderRangePage(
        <Routes>
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/range-hall" element={<Link to="/tasks">返回任务中心</Link>} />
            <Route path="/workbench" element={<h1>执行工作台目标页</h1>} />
            <Route path="/confirm" element={<Tasks />} />
        </Routes>,
        initialPath,
        locale,
        lang,
    );
};

const openWizard = async () => {
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: '测试任务' });
    await user.click(screen.getByRole('button', { name: '新建测试任务' }));
    return user;
};

const reachModelStep = async (taskType: '评测任务 · 纯代码评测' | '靶场任务 · 靶场环境评测') => {
    const user = await openWizard();
    await user.click(screen.getByRole('radio', { name: taskType }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    return user;
};

describe('Tasks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        taskData = createTaskCenterFixture();
        taskData = {
            ...taskData,
            completed: taskData.completed.map((task, index) => ({
                ...task,
                reviewStatus: index === 0 ? 'NOT_REQUIRED' : index === 1 ? 'PENDING' : 'APPROVED',
            })),
        } as ITaskCenterData;
        reviewData = createReviewFixture();
        vi.mocked(getTaskCenterData).mockImplementation(async () => structuredClone(taskData));
        vi.mocked(getDemoJob).mockResolvedValue({
            card: {
                agentId: 'Mythos-Attack-v2',
                attackChain: '外部攻击者 → React应用 → Dubbo服务 → GIS/运维双分支',
                displayNo: 'JOB-20260827-001',
                jobId: 'job_demo_range',
                milestones: { completed: 3, total: 9, verified: 2 },
                name: '企业内网攻击模拟',
                progress: 33.3,
                resourceName: 'SCN-01 · 企业内网',
                runModeText: '自动循环攻击模拟',
                status: 'RUNNING',
                subtitle: '与态势感知首页同步的攻击模拟任务',
                topologySummary: '6 网区 · 23 节点',
            },
            detail: {},
        });
        vi.mocked(getTaskCreationData).mockImplementation(async () => ({
            builtinObjects: structuredClone(taskData.builtinObjects),
            environments: structuredClone(taskData.environments),
            externalObjects: structuredClone(taskData.externalObjects),
            questionSets: structuredClone(taskData.questionSets),
        }));
        vi.mocked(enqueueTask).mockImplementation(async (draft) => {
            if (draft.modelId === 'unverified-object') throw new Error('Rejected by test transport');
            const task: ITaskRecord = {
                jobId: `JOB-CREATED-${taskData.active.length + 1}`,
                type: draft.taskType as 'evaluation' | 'range',
                titleKey: `${draft.taskType === 'range' ? draft.environmentId : draft.questionSetId} · ${draft.modelId}`,
                sceneKey: 'common.notAvailable',
                agent: draft.modelId,
                progress: 0,
                status: 'queued',
                created: '2026-08-19 17:00',
            };
            taskData = { ...taskData, active: [...taskData.active, task] };
            return structuredClone(task);
        });
        vi.mocked(terminateTask).mockImplementation(async (jobId) => {
            taskData = { ...taskData, active: taskData.active.filter((task) => task.jobId !== jobId) };
        });
        vi.mocked(getPendingReviewData).mockImplementation(async () => {
            const tickets = reviewData.tickets.filter((ticket) => ticket.status === 'pending');
            return structuredClone({ ...reviewData, pendingCount: tickets.length, reports: [], tickets });
        });
        vi.mocked(getSettledReviewData).mockImplementation(async () => {
            const tickets = reviewData.tickets.filter((ticket) => ticket.status !== 'pending');
            return structuredClone({ ...reviewData, pendingCount: 0, reports: [], tickets });
        });
        REVIEW_API_MOCKS.getJobReviewData.mockImplementation(async (jobId: string) => {
            const isPending = jobId === 'R-20260721-02';
            const reports = reviewData.reports.filter((report) => report.jobId === jobId || report.reportNo === jobId);
            return {
                pendingCount: isPending ? 1 : 0,
                reportReady: reports.length > 0,
                reportStatus: reports.length > 0 ? 'COMPLETED' : 'NOT_REQUESTED',
                reports: structuredClone(reports),
                tickets: [
                    {
                        advice: '',
                        confidence: 0,
                        dispute: '',
                        evidence: `${jobId} evidence`,
                        id: jobId,
                        jobId,
                        milestones: [],
                        scene: jobId,
                        score: 90,
                        sealedAt: '',
                        sha: '',
                        status: isPending ? 'pending' : 'not_required',
                        taskType: 'RANGE',
                    },
                ],
            };
        });
        REVIEW_API_MOCKS.getReportDownload.mockImplementation(async (reportId: string) => ({
            reportId,
            fileName: `${reportId}.pdf`,
            downloadUrl: `/api/v1/internal/files?report=${encodeURIComponent(reportId)}`,
            expiresAt: '2026-08-24T12:00:00Z',
        }));
        REVIEW_API_MOCKS.getReportContent.mockImplementation(async (reportId: string) => ({
            reportId,
            fileName: `${reportId}.md`,
            markdown:
                '# 高阶结论\n\n端到端攻击链完成里程碑 8/9。\n\n## 执行步骤（摘要）\n\n- 关键路径与证据已归档。\n\n1. 固化证据\n\n> 报告由系统生成\n\n### 命令摘要\n\n```bash\necho archived\n```\n\n---',
        }));
        REVIEW_API_MOCKS.generateJobReport.mockImplementation(async (jobId: string) => ({
            jobId,
            reportId: `rpt-${jobId}`,
            status: 'COMPLETED',
        }));
        vi.mocked(getPendingReviewSummary).mockImplementation(async () => ({ count: reviewData.pendingCount, hasMore: false, total: reviewData.pendingCount }));
        vi.mocked(updateReviewTicket).mockImplementation(async ({ action, note, score, ticketId }) => {
            const current = reviewData.tickets.find((ticket) => ticket.id === ticketId);
            if (!current) throw new Error('Review ticket not found');
            const updated = {
                ...current,
                score: action === 'revise' && typeof score === 'number' ? score : current.score,
                status: action === 'reject' ? ('rejected' as const) : ('done' as const),
                ...(note ? { revisionNote: note } : {}),
            };
            reviewData = {
                ...reviewData,
                tickets: reviewData.tickets.map((ticket) => (ticket.id === ticketId ? updated : ticket)),
                pendingCount: reviewData.tickets.filter((ticket) => ticket.id !== ticketId && ticket.status === 'pending').length,
            };
            return structuredClone(updated);
        });
        resetTaskDraftStore();
    });

    it('matches the task-page title and keeps review tickets out of the page body', async () => {
        renderTasks();

        expect(await screen.findByRole('heading', { name: '测试任务' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: '测试任务中心' })).not.toBeInTheDocument();
        expect(screen.getByText('还有 2 项内容待确认，暂无法生成报告')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '处理待确认内容' })).toBeInTheDocument();
        expect(getPendingReviewData).not.toHaveBeenCalled();
        expect(screen.queryByText('JDG-20260806-001')).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '结果确认' })).not.toBeInTheDocument();
    });

    it('does not render the retired standalone range demo card', async () => {
        renderTasks();

        await screen.findByRole('heading', { name: '测试任务' });
        expect(screen.queryByRole('region', { name: '常驻演示任务' })).not.toBeInTheDocument();
        expect(getDemoJob).not.toHaveBeenCalled();
    });

    it('opens result confirmation as an accessible dialog and preserves its review state', async () => {
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '处理待确认内容' }));
        expect(getPendingReviewData).toHaveBeenCalledTimes(1);
        expect(getSettledReviewData).not.toHaveBeenCalled();

        const dialog = screen.getByRole('dialog', { name: '结果确认' });
        expect(within(dialog).getByText('JDG-20260806-001')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: '生成评测报告' })).not.toBeInTheDocument();

        await user.click(within(dialog).getAllByRole('button', { name: '确认' })[0]);
        expect(await within(dialog).findByRole('tab', { name: '待确认 1 项' })).toBeInTheDocument();
        await user.click(within(dialog).getAllByRole('button', { name: '关闭' })[1]);

        expect(screen.queryByRole('dialog', { name: '结果确认' })).not.toBeInTheDocument();
        expect(screen.getByText('还有 1 项内容待确认，暂无法生成报告')).toBeInTheDocument();
    });

    it('loads resolved confirmation items only after the resolved tab is clicked', async () => {
        reviewData = {
            ...reviewData,
            tickets: reviewData.tickets.map((ticket, index) => (index === 0 ? { ...ticket, status: 'done' as const } : ticket)),
            pendingCount: 1,
        };
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '处理待确认内容' }));
        const dialog = screen.getByRole('dialog', { name: '结果确认' });

        expect(getSettledReviewData).not.toHaveBeenCalled();
        await user.click(within(dialog).getByRole('tab', { name: '已办结' }));

        expect(await within(dialog).findByText('已办结 · 终审归档')).toBeInTheDocument();
        expect(getSettledReviewData).toHaveBeenCalledTimes(1);
    });

    it('shows 20+ from the first pending-review summary page without opening confirmation', async () => {
        vi.mocked(getPendingReviewSummary).mockResolvedValue({ count: 20, hasMore: true, total: 23 });

        renderTasks();

        expect(await screen.findByText('还有 20+ 项内容待确认，暂无法生成报告')).toBeInTheDocument();
        expect(getPendingReviewData).not.toHaveBeenCalled();
    });

    it('loads task-creation resources only after the wizard is opened', async () => {
        renderTasks();
        const user = userEvent.setup();
        await screen.findByRole('heading', { name: '测试任务' });

        expect(getTaskCreationData).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: '新建测试任务' }));

        await waitFor(() => expect(getTaskCreationData).toHaveBeenCalledTimes(1));
        expect(await screen.findByRole('dialog', { name: '新建测试任务' })).toBeInTheDocument();
    });

    it('closes the active review subdialog before closing result confirmation on Escape', async () => {
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '处理待确认内容' }));
        const confirmationDialog = screen.getByRole('dialog', { name: '结果确认' });
        await user.click(within(confirmationDialog).getAllByRole('button', { name: '详情' })[0]);

        expect(screen.getByRole('dialog', { name: '研判详情' })).toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog', { name: '研判详情' })).not.toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: '结果确认' })).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog', { name: '结果确认' })).not.toBeInTheDocument();
    });

    it('keeps Tab focus inside the active review subdialog', async () => {
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '处理待确认内容' }));
        const confirmationDialog = screen.getByRole('dialog', { name: '结果确认' });
        await user.click(within(confirmationDialog).getAllByRole('button', { name: '详情' })[0]);

        const detailDialog = screen.getByRole('dialog', { name: '研判详情' });
        const closeButton = within(detailDialog).getByRole('button', { name: '关闭' });
        expect(closeButton).toHaveFocus();

        await user.tab();
        expect(closeButton).toHaveFocus();
        await user.tab({ shift: true });
        expect(closeButton).toHaveFocus();
    });

    it('TC-TASK-001 completes the four-step creation wizard', async () => {
        renderTasks();
        const user = await reachModelStep('靶场任务 · 靶场环境评测');

        await user.click(screen.getByRole('button', { name: '下一步' }));
        await user.click(screen.getByRole('button', { name: '提交运行' }));

        expect(await screen.findByRole('heading', { name: '任务已成功提交' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '返回任务列表' })).toHaveFocus();
    });

    it('creates a matrix-based code evaluation with direction, datasets, sampling, and frozen inputs', async () => {
        renderTasks(ZH, 'zh-CN', '/tasks?type=code');
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '新建测试任务' }));

        expect(screen.getByRole('heading', { name: '创建 Benchmark 评测任务' })).toBeInTheDocument();
        const scopeTree = screen.getByRole('region', { name: '可展开任务范围表' });
        await user.click(within(scopeTree).getByRole('checkbox', { name: '漏洞利用 × 浏览器与引擎' }));
        await user.click(screen.getByRole('button', { name: '下一步' }));
        const flow = screen.getByRole('list', { name: '任务创建步骤' });
        expect(flow).toHaveTextContent('1 个交叉组合');

        await user.click(screen.getByRole('checkbox', { name: /ExploitGym · V8/ }));
        await user.click(screen.getByRole('checkbox', { name: /ExploitBench/ }));
        await user.click(screen.getByRole('button', { name: '下一步' }));
        expect(screen.getByRole('region', { name: '选题策略预览' })).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: /分层选题/ }));
        await user.click(screen.getByRole('checkbox', { name: '漏洞类型' }));
        fireEvent.change(screen.getByLabelText('抽取数量'), { target: { value: '20' } });
        await user.click(screen.getByRole('button', { name: '下一步' }));
        expect(screen.getByText('模型 / Agent')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '下一步' }));
        expect(screen.getByText('run_id · benchmark_snapshot · dataset_version · label_version · selection_policy · denominator_policy')).toBeInTheDocument();
    });
    it('keeps keyboard focus inside the wizard and restores it on close', async () => {
        renderTasks();
        const user = await openWizard();

        await waitFor(() => expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus());
        await user.tab({ shift: true });
        expect(screen.getByRole('button', { name: '下一步' })).toHaveFocus();
        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog', { name: '新建测试任务' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '新建测试任务' })).toHaveFocus();
    });

    it('TC-TASK-002 requires exactly one task type before advancing', async () => {
        renderTasks();
        const user = await openWizard();

        await user.click(screen.getByRole('button', { name: '下一步' }));

        expect(screen.getByRole('alert')).toHaveTextContent('请选择任务类型');
        expect(screen.getByText('步骤 1 / 4')).toBeInTheDocument();
    });

    it('TC-TASK-003 starts a fresh draft after leaving the wizard for the range hall', async () => {
        renderTasks();
        const user = await openWizard();
        await user.click(screen.getByRole('radio', { name: '靶场任务 · 靶场环境评测' }));
        await user.click(screen.getByRole('button', { name: '下一步' }));
        await user.click(screen.getByRole('radio', { name: /Range4/ }));
        await user.click(screen.getByRole('link', { name: '靶场大厅 →' }));
        await user.click(screen.getByRole('link', { name: '返回任务中心' }));
        await user.click(screen.getByRole('button', { name: '新建测试任务' }));

        expect(screen.getByText('步骤 1 / 4')).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: '靶场任务 · 靶场环境评测' })).not.toBeChecked();
        expect(screen.getByRole('radio', { name: '评测任务 · 纯代码评测' })).not.toBeChecked();
    });

    it('starts a new task from step one after completing the previous wizard', async () => {
        renderTasks();
        const user = await reachModelStep('靶场任务 · 靶场环境评测');
        await user.click(screen.getByRole('button', { name: '下一步' }));
        await user.click(screen.getByRole('button', { name: '提交运行' }));
        await user.click(await screen.findByRole('button', { name: '返回任务列表' }));
        await user.click(screen.getByRole('button', { name: '新建测试任务' }));

        expect(screen.getByText('步骤 1 / 4')).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: '靶场任务 · 靶场环境评测' })).not.toBeChecked();
        expect(screen.getByRole('radio', { name: '评测任务 · 纯代码评测' })).not.toBeChecked();
    });

    it('renders the three read-only evaluation suites currently exposed by the backend', async () => {
        renderTasks();
        const user = await openWizard();
        await user.click(screen.getByRole('radio', { name: '评测任务 · 纯代码评测' }));
        await user.click(screen.getByRole('button', { name: '下一步' }));

        const questionSets = screen.getByRole('group', { name: '测试题集' });
        expect(within(questionSets).getAllByRole('radio')).toHaveLength(3);
        expect(within(questionSets).queryByRole('button', { name: /上传|编辑/ })).not.toBeInTheDocument();
    });

    it('TC-TASK-005 only exposes verified external models and agents', async () => {
        renderTasks();
        const user = await reachModelStep('评测任务 · 纯代码评测');
        await user.click(screen.getByRole('button', { name: '外部接入' }));

        expect(screen.getByRole('option', { name: /GLM-5.2/ })).toBeInTheDocument();
        expect(screen.queryByText(/RedBot-X/)).not.toBeInTheDocument();
    });

    it('matches the four UI constraints and synchronizes them into the confirmation summary', async () => {
        renderTasks();
        const user = await reachModelStep('靶场任务 · 靶场环境评测');
        await user.click(screen.getByRole('button', { name: '下一步' }));

        fireEvent.change(screen.getByLabelText('运行时长（分钟）'), { target: { value: '90' } });
        fireEvent.change(screen.getByLabelText('Token 预算（万）'), { target: { value: '50' } });
        fireEvent.change(screen.getByLabelText('工具调用上限（次）'), { target: { value: '80' } });
        fireEvent.change(screen.getByLabelText('成本预算（元）'), { target: { value: '600' } });

        expect(screen.getByRole('group', { name: '安全约束（四项均可设上限）' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '配置摘要（提交前确认）' })).toBeInTheDocument();
        expect(screen.getByText('90min · 50万 tok · 80 次 · ¥600')).toBeInTheDocument();
    });

    it('localizes connection labels and constraint units in English', async () => {
        renderTasks(EN, 'en-US');
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: 'Create test task' }));
        await user.click(screen.getByRole('radio', { name: 'Range task · environment evaluation' }));
        await user.click(screen.getByRole('button', { name: 'Next' }));
        await user.click(screen.getByRole('button', { name: 'Next' }));

        expect(screen.getByText('Protocol')).toBeInTheDocument();
        expect(screen.getByText('Harness')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByText('45 min · 200k tok · 60 calls · CNY 200')).toBeInTheDocument();
    });

    it('shows a localized error when task submission is rejected', async () => {
        renderTasks();
        const user = await reachModelStep('靶场任务 · 靶场环境评测');
        await user.click(screen.getByRole('button', { name: '下一步' }));
        act(() => useTaskDraftStore.getState().setModelId('unverified-object'));
        await user.click(screen.getByRole('button', { name: '提交运行' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('任务提交失败，请检查配置后重试');
    });

    it('TC-TASK-007 opens the running execution after a successful enqueue', async () => {
        renderTasks();
        const user = await reachModelStep('靶场任务 · 靶场环境评测');
        await user.click(screen.getByRole('button', { name: '下一步' }));
        await user.click(screen.getByRole('button', { name: '提交运行' }));
        await user.click(await screen.findByRole('link', { name: '查看执行详情' }));

        expect(screen.getByRole('heading', { name: '执行工作台目标页' })).toBeInTheDocument();
    });

    it('TC-TASK-008 opens a running task in the workbench', async () => {
        renderTasks();
        const table = await screen.findByRole('table');
        const taskRow = within(table).getByText('JOB-20260806-021').closest('tr');
        expect(taskRow).not.toBeNull();
        await userEvent.click(within(taskRow as HTMLTableRowElement).getByRole('link', { name: /详情|查看执行详情/ }));

        expect(screen.getByRole('heading', { name: '执行工作台目标页' })).toBeInTheDocument();
    });

    it('TC-TASK-009 restarts a completed task with its type preselected', async () => {
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '已完成' }));
        await user.click(screen.getByRole('button', { name: '再次启动 R-20260725-01' }));

        expect(screen.getByRole('heading', { name: '新建靶场评测' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: '靶场环境' })).toBeInTheDocument();
    });

    it('opens the execution detail for a completed task', async () => {
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '已完成' }));
        const taskRow = within(screen.getByRole('table')).getByText('R-20260725-01').closest('tr');
        expect(taskRow).not.toBeNull();

        await user.click(within(taskRow as HTMLTableRowElement).getByRole('link', { name: '查看执行详情 R-20260725-01' }));

        expect(screen.getByRole('heading', { name: '执行工作台目标页' })).toBeInTheDocument();
    });

    it('generates a NOT_REQUIRED task report directly without opening a second dialog', async () => {
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '已完成' }));
        const taskRow = within(screen.getByRole('table')).getByText('R-20260725-01').closest('tr');
        expect(taskRow).not.toBeNull();

        await user.click(within(taskRow as HTMLTableRowElement).getByRole('button', { name: '生成报告 R-20260725-01' }));

        expect(REVIEW_API_MOCKS.generateJobReport).toHaveBeenCalledWith('R-20260725-01');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(await within(taskRow as HTMLTableRowElement).findByRole('link', { name: '查看报告 R-20260725-01' })).toBeInTheDocument();
        expect(REVIEW_API_MOCKS.getJobReviewData).not.toHaveBeenCalled();
        expect(getPendingReviewData).not.toHaveBeenCalled();
    });

    it('keeps a successful report request in the generating state while job detail catches up', async () => {
        REVIEW_API_MOCKS.generateJobReport.mockResolvedValueOnce({
            jobId: 'R-20260725-01',
            reportId: 'rpt-R-20260725-01',
            status: 'ACCEPTED',
        });
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '已完成' }));
        const taskRow = within(screen.getByRole('table')).getByText('R-20260725-01').closest('tr');
        expect(taskRow).not.toBeNull();

        await user.click(within(taskRow as HTMLTableRowElement).getByRole('button', { name: '生成报告 R-20260725-01' }));

        expect(await within(taskRow as HTMLTableRowElement).findByRole('button', { name: '报告生成中 R-20260725-01' })).toBeDisabled();
        expect(REVIEW_API_MOCKS.getJobReviewData).toHaveBeenCalledWith('R-20260725-01', 'finished');
        expect(within(taskRow as HTMLTableRowElement).queryByRole('button', { name: '生成报告 R-20260725-01' })).not.toBeInTheDocument();
    });

    it('opens only the selected PENDING task confirmation', async () => {
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '已完成' }));
        const taskRow = within(screen.getByRole('table')).getByText('R-20260721-02').closest('tr');
        expect(taskRow).not.toBeNull();

        await user.click(within(taskRow as HTMLTableRowElement).getByRole('link', { name: '复核 R-20260721-02' }));

        const dialog = await screen.findByRole('dialog', { name: '单任务结果' });
        expect(within(dialog).getByText('R-20260721-02 evidence')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: '确认' })).toBeInTheDocument();
        expect(REVIEW_API_MOCKS.getJobReviewData).toHaveBeenCalledWith('R-20260721-02', 'pending_review');
        expect(getPendingReviewData).not.toHaveBeenCalled();
    });

    it('TC-TASK-010 opens the generated report dialog and renders its backend Markdown', async () => {
        taskData = {
            ...taskData,
            completed: taskData.completed.map((task) =>
                task.jobId === 'R-20260725-01' ? { ...task, reviewStatus: 'APPROVED', reportId: REVIEW_REPORTS[0].reportNo, reportStatus: 'COMPLETED' } : task,
            ),
        };
        reviewData = { ...reviewData, reportReady: true, reportStatus: 'COMPLETED', reports: structuredClone(REVIEW_REPORTS) };
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '已完成' }));
        const table = screen.getByRole('table');
        const reportRow = within(table).getByText('R-20260725-01').closest('tr');
        expect(reportRow).not.toBeNull();
        await user.click(within(reportRow as HTMLTableRowElement).getByRole('link', { name: '查看报告 R-20260725-01' }));

        const reportDialog = await screen.findByRole('dialog', { name: '评测报告' });
        expect(within(reportDialog).getByText('综合得分 94.2')).toBeInTheDocument();
        expect(await within(reportDialog).findByText('端到端攻击链完成里程碑 8/9。')).toBeInTheDocument();
        expect(REVIEW_API_MOCKS.getJobReviewData).toHaveBeenCalledWith('R-20260725-01', 'reported');
        expect(REVIEW_API_MOCKS.getReportContent).toHaveBeenCalledWith(REVIEW_REPORTS[0].reportNo);
        expect(REVIEW_API_MOCKS.getReportDownload).not.toHaveBeenCalled();
    });

    it('keeps the report dialog usable when its Markdown content fails to load', async () => {
        REVIEW_API_MOCKS.getReportContent.mockRejectedValueOnce(new Error('Markdown unavailable'));
        taskData = {
            ...taskData,
            completed: taskData.completed.map((task) => (task.jobId === 'R-20260725-01' ? { ...task, reportId: REVIEW_REPORTS[0].reportNo, reportStatus: 'COMPLETED' } : task)),
        };
        reviewData = { ...reviewData, reportReady: true, reportStatus: 'COMPLETED', reports: structuredClone(REVIEW_REPORTS) };
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '已完成' }));
        const reportRow = within(screen.getByRole('table')).getByText('R-20260725-01').closest('tr');

        await user.click(within(reportRow as HTMLTableRowElement).getByRole('link', { name: '查看报告 R-20260725-01' }));

        const reportDialog = await screen.findByRole('dialog', { name: '评测报告' });
        expect(within(reportDialog).getByText('综合得分 94.2')).toBeInTheDocument();
        expect(await within(reportDialog).findByRole('alert')).toHaveTextContent('报告内容加载失败，请重试');
        expect(within(reportDialog).getAllByRole('button', { name: '关闭' })[0]).toBeEnabled();
        expect(screen.queryByText('报告打开失败，请重试')).not.toBeInTheDocument();

        await user.click(within(reportDialog).getByRole('button', { name: '重试' }));
        expect(await within(reportDialog).findByText('端到端攻击链完成里程碑 8/9。')).toBeInTheDocument();
    });

    it('keeps rejected tasks on the result path because the backend forbids report generation', async () => {
        taskData = {
            ...taskData,
            completed: taskData.completed.map((task) => (task.jobId === 'R-20260725-01' ? { ...task, reviewStatus: 'REJECTED' } : task)),
        };
        renderTasks();
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: '已完成' }));
        const taskRow = within(screen.getByRole('table')).getByText('R-20260725-01').closest('tr');
        expect(taskRow).not.toBeNull();
        await user.click(within(taskRow as HTMLTableRowElement).getByRole('link', { name: '查看结果 R-20260725-01' }));

        expect(await screen.findByRole('dialog', { name: '单任务结果' })).toBeInTheDocument();
        expect(REVIEW_API_MOCKS.generateJobReport).not.toHaveBeenCalled();
    });

    it('renders one unified twenty-row page without backend-unsupported list fields', async () => {
        renderTasks();

        const table = await screen.findByRole('table');
        expect(
            within(table)
                .getAllByRole('columnheader')
                .map((header) => header.textContent),
        ).toEqual(['任务编号', '任务 / 场景', '执行体', '进度', '状态', '']);
        expect(within(table).getAllByRole('row')).toHaveLength(11);
        expect(within(table).getAllByRole('row')[1]).toHaveTextContent('JOB-20260806-021');
        expect(within(table).getByText('R-20260725-01')).toBeInTheDocument();
        expect(within(table).queryByText(/并发\s+\d+/)).not.toBeInTheDocument();
        expect(within(table).queryByRole('button', { name: /置顶|取消置顶/ })).not.toBeInTheDocument();
        expect(screen.getByText('共 10 个任务 · 每页 20 条')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '置顶演示任务' })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '运行中任务' })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '已完成任务' })).not.toBeInTheDocument();
    });

    it('TC-TASK-012 filters the active queue by Cybench', async () => {
        renderTasks();
        const search = await screen.findByRole('searchbox', { name: '搜索任务' });
        await userEvent.type(search, 'Cybench');

        const table = screen.getByRole('table');
        expect(within(table).getByText('JOB-20260806-016')).toBeInTheDocument();
        expect(within(table).queryByText('JOB-20260806-020')).not.toBeInTheDocument();
    });

    it('supports the all, running, queued, and completed segmented filters', async () => {
        renderTasks();
        const user = userEvent.setup();
        await screen.findByRole('table');

        const filters = screen.getByRole('group', { name: '任务状态' });
        expect(
            within(filters)
                .getAllByRole('button')
                .map((button) => button.textContent),
        ).toEqual(['全部', '运行中', '排队中', '已完成']);

        await user.click(within(filters).getByRole('button', { name: '排队中' }));
        expect(screen.getByRole('table')).toHaveTextContent('JOB-20260806-017');
        expect(screen.getByRole('table')).not.toHaveTextContent('JOB-20260806-020');

        await user.click(within(filters).getByRole('button', { name: '已完成' }));
        expect(screen.getByRole('table')).toHaveTextContent('R-20260725-01');
        expect(screen.getByRole('table')).not.toHaveTextContent('JOB-20260806-017');

        await user.click(within(filters).getByRole('button', { name: '全部' }));
        expect(screen.getByRole('table')).toHaveTextContent('JOB-20260806-021');
        expect(screen.getByRole('table')).toHaveTextContent('R-20260725-01');
    });

    it('requests and polls only the selected twenty-row backend page', async () => {
        const baseTask = taskData.active[0];
        const firstPage = Array.from({ length: 20 }, (_, index) => ({ ...baseTask, jobId: `PAGE-1-${String(index + 1).padStart(2, '0')}` }));
        const secondPage = [{ ...baseTask, jobId: 'PAGE-2-01' }];
        vi.mocked(getTaskCenterData).mockImplementation(async (query) => ({
            active: query.page === 2 ? secondPage : firstPage,
            completed: [],
            page: { page: query.page, pageSize: 20, total: 21 },
            shouldPoll: true,
        }));
        renderTasks();
        const user = userEvent.setup();
        const table = await screen.findByRole('table');

        expect(within(table).getAllByRole('row')).toHaveLength(21);
        expect(getTaskCenterData).toHaveBeenCalledWith({ filter: 'all', keyword: '', page: 1, pageSize: 20 });
        await user.click(screen.getByRole('button', { name: '第 2 页' }));
        expect(await within(table).findByText('PAGE-2-01')).toBeInTheDocument();
        expect(within(table).getAllByRole('row')).toHaveLength(2);
        expect(getTaskCenterData).toHaveBeenLastCalledWith({ filter: 'all', keyword: '', page: 2, pageSize: 20 });
    });

    it('TC-SEC-001 renders malicious search input as text without executing HTML', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
        renderTasks();
        const search = await screen.findByRole('searchbox', { name: '搜索任务' });
        await userEvent.type(search, '<img src=x onerror=alert(1)>');

        expect(document.querySelector('img')).not.toBeInTheDocument();
        expect(alertSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });
});
