import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCreateJobRequest, enqueueTask, getTaskCenterData, getTaskCreationData, terminateTask } from '@/api/tasks';
import Http from '@/utils/axios';

vi.mock('@/utils/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

const getMock = vi.mocked(Http.get);
const postMock = vi.mocked(Http.post);

const DRAFT = {
    constraints: { cost: 200, duration: 45, token: 20, tools: 60 },
    environmentId: 'rng_range5',
    modelId: 'external-agent-id',
    objectSource: 'external' as const,
    questionSetId: 'suite_websec_v1',
    taskType: 'range' as const,
};

describe('task API facade', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads only the requested twenty-row task page and exposes whether that page needs polling', async () => {
        getMock.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
            const requestKey = `${url}?${new URLSearchParams(config?.params as Record<string, string>).toString()}`;
            const responses: Record<string, unknown> = {
                '/api/v1/jobs?page=2&page_size=20': {
                    list: [
                        {
                            job_id: 'job-running',
                            name: 'Range5 run',
                            job_type: 'RANGE',
                            agent_id: 'codex',
                            resource: { id: 'rng_range5', name: 'Range5' },
                            status: 'RUNNING',
                            progress: 41.7,
                            created_at: '2026-08-18T09:31:00Z',
                        },
                        {
                            job_id: 'job-finished',
                            name: 'WebSec evaluation',
                            job_type: 'CODE_EVAL',
                            agent_id: 'claude_code',
                            resource: { id: 'suite_websec_v1', name: 'Web Security' },
                            status: 'SUCCEEDED',
                            progress: 100,
                            review_status: 'NOT_REQUIRED',
                            report: { report_id: 'rpt-finished', status: 'completed' },
                            created_at: '2026-08-18T08:00:00Z',
                            finished_at: '2026-08-18T08:30:00Z',
                        },
                        {
                            job_id: 'job-finished-range',
                            name: 'Finished range',
                            job_type: 'RANGE',
                            agent_id: 'codex',
                            resource: { id: 'rng_range5', name: 'Range5' },
                            status: 'TERMINATED',
                            progress: 80,
                            created_at: '2026-08-18T07:00:00Z',
                        },
                        {
                            job_id: 'job-queued',
                            name: 'Queued evaluation',
                            job_type: 'CODE_EVAL',
                            agent_id: 'external-agent-id',
                            resource: { id: 'suite_websec_v1', name: '' },
                            status: 'CREATED',
                            progress: 0,
                            created_at: '2026-08-18T09:32:00Z',
                        },
                    ],
                    page: { page: 2, page_size: 20, total: 41 },
                },
                '/api/v1/ranges?page=1&page_size=100': {
                    list: [
                        {
                            range_id: 'rng_range5',
                            name: 'Range5',
                            status: 'ACTIVE',
                            node_count: 26,
                            can_quick_create_job: true,
                        },
                        {
                            range_id: 'rng-busy',
                            name: 'Busy range',
                            status: 'ACTIVE',
                            node_count: 10,
                            can_quick_create_job: false,
                        },
                    ],
                },
                '/api/v1/code-suites?page=1&page_size=100': {
                    list: [{ suite_id: 'suite_websec_v1', name: 'Web Security', sample_count: 24, status: 'ACTIVE' }],
                },
            };
            return { data: responses[requestKey] } as never;
        });

        const data = await getTaskCenterData({ filter: 'all', keyword: '', page: 2, pageSize: 20 });

        expect(getMock).toHaveBeenCalledTimes(1);
        expect(getMock).toHaveBeenCalledWith('/api/v1/jobs', { params: { page: 2, page_size: 20 }, forbidMsg: true });
        expect(data.page).toEqual({ page: 2, pageSize: 20, total: 41 });
        expect(data.shouldPoll).toBe(true);
        expect(data.active).toContainEqual(expect.objectContaining({ jobId: 'job-running', sceneKey: 'Range5', agent: 'codex', progress: 41.7, status: 'running' }));
        expect(data.active).toContainEqual(expect.objectContaining({ jobId: 'job-queued', sceneKey: 'common.notAvailable', status: 'queued' }));
        expect(data.completed).toContainEqual(
            expect.objectContaining({
                jobId: 'job-finished',
                titleKey: 'WebSec evaluation',
                type: 'evaluation',
                agent: 'claude_code',
                reviewStatus: 'NOT_REQUIRED',
                reportId: 'rpt-finished',
                reportStatus: 'COMPLETED',
            }),
        );
        expect(data.completed).toContainEqual(expect.objectContaining({ jobId: 'job-finished-range', type: 'range', completedAt: '2026-08-18T07:00:00Z' }));
    });

    it('does not poll paused or terminal pages, but does poll while a report is generating', async () => {
        const createJob = (status: string, reportStatus?: string) => ({
            job_id: `job-${status.toLowerCase()}`,
            name: status,
            job_type: 'RANGE',
            agent_id: 'codex',
            resource: { id: 'rng_range5', name: 'Range5' },
            status,
            progress: 0,
            ...(reportStatus ? { report: { status: reportStatus } } : {}),
            created_at: '2026-08-18T09:31:00Z',
        });
        getMock
            .mockResolvedValueOnce({ data: { list: [createJob('PAUSED'), createJob('TERMINATED')], page: { page: 1, page_size: 20, total: 2 } } } as never)
            .mockResolvedValueOnce({ data: { list: [createJob('SUCCEEDED', 'GENERATING')], page: { page: 1, page_size: 20, total: 1 } } } as never);

        await expect(getTaskCenterData({ filter: 'all', keyword: '', page: 1, pageSize: 20 })).resolves.toMatchObject({ shouldPoll: false });
        await expect(getTaskCenterData({ filter: 'all', keyword: '', page: 1, pageSize: 20 })).resolves.toMatchObject({ shouldPoll: true });
    });

    it('loads creation resources independently of the paginated task page', async () => {
        getMock.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
            const requestKey = `${url}?${new URLSearchParams(config?.params as Record<string, string>).toString()}`;
            const responses: Record<string, unknown> = {
                '/api/v1/ranges?page=1&page_size=100': {
                    list: [
                        { range_id: 'rng_range5', name: 'Range5', status: 'ACTIVE', node_count: 26, can_quick_create_job: true },
                        { range_id: 'rng-busy', name: 'Busy range', status: 'ACTIVE', node_count: 10, can_quick_create_job: false },
                    ],
                },
                '/api/v1/code-suites?page=1&page_size=100': {
                    list: [{ suite_id: 'suite_websec_v1', name: 'Web Security', sample_count: 24, status: 'ACTIVE' }],
                },
            };
            return { data: responses[requestKey] } as never;
        });

        const creationData = await getTaskCreationData();

        expect(getMock).toHaveBeenCalledWith('/api/v1/ranges', { params: { page: 1, page_size: 100 }, forbidMsg: true });
        expect(getMock).toHaveBeenCalledWith('/api/v1/code-suites', { params: { page: 1, page_size: 100 }, forbidMsg: true });
        expect(creationData.environments).toContainEqual(expect.objectContaining({ id: 'rng_range5', nameKey: 'Range5', subnet: '26 nodes', status: 'available' }));
        expect(creationData.environments).toContainEqual(expect.objectContaining({ id: 'rng-busy', status: 'pending' }));
        expect(creationData.questionSets).toEqual([expect.objectContaining({ id: 'suite_websec_v1', nameKey: 'Web Security', size: 24 })]);
    });

    it('rejects an empty response instead of falling back to mock data', async () => {
        getMock.mockResolvedValue({ data: null } as never);

        await expect(getTaskCenterData({ filter: 'all', keyword: '', page: 1, pageSize: 20 })).rejects.toThrow('Jobs response is empty');
    });

    it('creates a RANGE job through POST /api/v1/jobs and accepts an opaque agent_id', async () => {
        postMock.mockResolvedValue({ data: { job_id: 'job-created', status: 'CREATED', created_at: '2026-08-19T10:00:00Z' } } as never);

        const task = await enqueueTask(DRAFT, 'task-create-001');

        expect(postMock).toHaveBeenCalledWith('/api/v1/jobs', {
            data: {
                name: 'rng_range5 · external-agent-id',
                job_type: 'RANGE',
                agent_id: 'external-agent-id',
                range_id: 'rng_range5',
                execution_mode: 'REAL',
                constraints: { max_duration_sec: 2700, max_steps: 60, token_budget: 200000 },
            },
            forbidMsg: true,
            headers: { 'Idempotency-Key': 'task-create-001' },
        });
        expect(task).toEqual({
            jobId: 'job-created',
            titleKey: 'rng_range5 · external-agent-id',
            sceneKey: 'common.notAvailable',
            agent: 'external-agent-id',
            progress: 0,
            status: 'queued',
            created: '2026-08-19T10:00:00Z',
        });
    });

    it('creates a CODE_EVAL request with suite_id and without range_id', () => {
        const request = buildCreateJobRequest({ ...DRAFT, taskType: 'evaluation' });

        expect(request).toEqual({
            name: 'suite_websec_v1 · external-agent-id',
            job_type: 'CODE_EVAL',
            agent_id: 'external-agent-id',
            suite_id: 'suite_websec_v1',
            execution_mode: 'REAL',
            constraints: { max_duration_sec: 2700, max_steps: 60, token_budget: 200000 },
        });
        expect(request).not.toHaveProperty('range_id');
    });

    it('normalizes opaque agent and resource IDs before building the request', () => {
        expect(buildCreateJobRequest({ ...DRAFT, environmentId: '  rng_range5  ', modelId: '  external-agent-id  ' })).toMatchObject({
            name: 'rng_range5 · external-agent-id',
            agent_id: 'external-agent-id',
            range_id: 'rng_range5',
        });
        expect(buildCreateJobRequest({ ...DRAFT, taskType: 'evaluation', questionSetId: '  suite_websec_v1  ' })).toMatchObject({ suite_id: 'suite_websec_v1' });
    });

    it('terminates queued and running jobs through the same TERMINATE action', async () => {
        postMock.mockResolvedValue({ data: { job_id: 'job/queued', status: 'TERMINATED', updated_at: '2026-08-19T10:00:00Z' } } as never);

        await terminateTask('job/queued');

        expect(postMock).toHaveBeenCalledWith('/api/v1/jobs/job%2Fqueued/actions', {
            data: { action: 'TERMINATE' },
            forbidMsg: true,
        });
    });

    it('rejects empty create and terminate responses', async () => {
        postMock.mockResolvedValue({ data: null } as never);

        await expect(enqueueTask(DRAFT)).rejects.toThrow('Task creation response is empty');
        await expect(terminateTask('job-1')).rejects.toThrow('Task termination response is empty');
    });

    it('validates required real API identifiers and constraint boundaries before posting', async () => {
        await expect(enqueueTask({ ...DRAFT, taskType: null })).rejects.toThrow('Task type is required');
        await expect(enqueueTask({ ...DRAFT, environmentId: '' })).rejects.toThrow('A valid range environment is required');
        await expect(enqueueTask({ ...DRAFT, taskType: 'evaluation', questionSetId: '' })).rejects.toThrow('A valid question set is required');
        await expect(enqueueTask({ ...DRAFT, modelId: '  ' })).rejects.toThrow('An agent ID is required');
        await expect(enqueueTask({ ...DRAFT, constraints: { ...DRAFT.constraints, duration: 9 } })).rejects.toThrow('Invalid duration constraint');
        await expect(enqueueTask({ ...DRAFT, constraints: { ...DRAFT.constraints, token: 101 } })).rejects.toThrow('Invalid token constraint');
        await expect(enqueueTask({ ...DRAFT, constraints: { ...DRAFT.constraints, tools: 201 } })).rejects.toThrow('Invalid tools constraint');
        await expect(enqueueTask({ ...DRAFT, constraints: { ...DRAFT.constraints, cost: 20.5 } })).rejects.toThrow('Invalid cost constraint');
        await expect(terminateTask('   ')).rejects.toThrow('jobId');
        expect(postMock).not.toHaveBeenCalled();
    });
});
