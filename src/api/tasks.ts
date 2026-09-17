import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';
import { createTaskCenterFixture } from '@/test/fixtures/task-center';

export type TaskStatus = 'queued' | 'running';
export type TaskListFilter = 'all' | 'completed' | TaskStatus;
export type TaskType = 'evaluation' | 'range';
export type TaskObjectSource = 'builtin' | 'external';
export type TaskConstraintKey = 'cost' | 'duration' | 'token' | 'tools';
export type TaskReviewStatus = 'APPROVED' | 'NOT_REQUIRED' | 'OVERRIDDEN' | 'PENDING' | 'REJECTED' | 'UNKNOWN';
export type TaskReportStatus = 'COMPLETED' | 'FAILED' | 'GENERATING' | 'NOT_REQUESTED' | 'UNKNOWN';

export interface ITaskConstraints {
    cost: number;
    duration: number;
    token: number;
    tools: number;
}

export interface ITaskDraftPayload {
    constraints: ITaskConstraints;
    environmentId: string;
    modelId: string;
    objectSource: TaskObjectSource;
    questionSetId: string;
    taskType: TaskType | null;
}

export interface ICreateJobRequest {
    agent_id: string;
    constraints: {
        max_duration_sec: number;
        max_steps: number;
        token_budget: number;
    };
    execution_mode: 'REAL';
    job_type: 'CODE_EVAL' | 'RANGE';
    name: string;
    range_id?: string;
    suite_id?: string;
}

interface IBackendListResponse<T> {
    list: T[];
    page?: {
        page: number;
        page_size: number;
        total: number;
    };
}

interface IBackendJobRow {
    agent_id: string;
    created_at: string;
    finished_at?: string;
    job_id: string;
    job_type: 'CODE_EVAL' | 'RANGE';
    name: string;
    progress: number;
    report?: { report_id?: string; status?: string };
    report_id?: string;
    report_status?: string;
    review_status?: string;
    resource?: { id?: string; name?: string };
    status: string;
}

interface IBackendRangeRow {
    can_quick_create_job: boolean;
    name: string;
    node_count: number;
    range_id: string;
    status: string;
}

interface IBackendSuiteRow {
    name: string;
    sample_count: number;
    status: string;
    suite_id: string;
}

export interface ITaskRecord {
    agent: string;
    type: TaskType;
    created: string;
    jobId: string;
    progress: number;
    sceneKey: string;
    status: TaskStatus;
    titleKey: string;
}

export interface ITaskListQuery {
    filter: TaskListFilter;
    keyword: string;
    page: number;
    pageSize: number;
}

export interface ITaskListPage {
    page: number;
    pageSize: number;
    total: number;
}

export interface ICompletedTask {
    agent: string;
    agentKey?: string;
    completedAt: string;
    config: ITaskDraftPayload;
    jobId: string;
    reportId?: string;
    reportStatus?: TaskReportStatus;
    reviewStatus: TaskReviewStatus;
    sceneKey: string;
    titleKey: string;
    type: TaskType;
}

export interface IQuestionSet {
    descriptionKey: string;
    id: string;
    nameKey: string;
    size: number;
    updated: string;
}

export interface ITaskEnvironment {
    descriptionKey: string;
    id: string;
    nameKey: string;
    status: 'available' | 'pending';
    subnet: string;
}

export interface ITaskObject {
    harness: 'claude_code' | 'codex';
    id: string;
    kind: 'agent' | 'model';
    name: string;
    protocol: 'anthropic_messages' | 'openai_chat' | 'openai_responses';
    verified: boolean;
}

export interface ITaskCenterData {
    active: readonly ITaskRecord[];
    builtinObjects: readonly ITaskObject[];
    completed: readonly ICompletedTask[];
    confirmation: { archived: number; pending: number; ready: number };
    environments: readonly ITaskEnvironment[];
    externalObjects: readonly ITaskObject[];
    page: ITaskListPage;
    questionSets: readonly IQuestionSet[];
    shouldPoll: boolean;
}

export type ITaskListData = Pick<ITaskCenterData, 'active' | 'completed' | 'page' | 'shouldPoll'>;
export type ITaskCreationData = Pick<ITaskCenterData, 'builtinObjects' | 'environments' | 'externalObjects' | 'questionSets'>;

export const TASK_LIST_PAGE_SIZE = 20;

const DEFAULT_RANGE_CONFIG: ITaskDraftPayload = {
    taskType: 'range',
    environmentId: 'rng_range5',
    questionSetId: 'suite_websec_v1',
    objectSource: 'builtin',
    modelId: 'mythos-attack-v2',
    constraints: { duration: 45, token: 20, tools: 60, cost: 200 },
};

const DEFAULT_EVALUATION_CONFIG: ITaskDraftPayload = {
    ...DEFAULT_RANGE_CONFIG,
    taskType: 'evaluation',
    modelId: 'gpt-4o',
};

const OBJECTS: readonly ITaskObject[] = [
    { id: 'mythos-attack-v2', name: 'Mythos-Attack-v2', kind: 'agent', verified: true, protocol: 'openai_responses', harness: 'codex' },
    { id: 'pentestgpt', name: 'PentestGPT', kind: 'agent', verified: true, protocol: 'openai_responses', harness: 'codex' },
    { id: 'reconx', name: 'ReconX', kind: 'agent', verified: true, protocol: 'openai_responses', harness: 'codex' },
    { id: 'gpt-4o', name: 'GPT-4o', kind: 'model', verified: true, protocol: 'openai_chat', harness: 'codex' },
    { id: 'ext-glm52', name: 'GLM-5.2', kind: 'model', verified: true, protocol: 'openai_chat', harness: 'codex' },
    { id: 'ext-gpt54', name: 'GPT-5.4', kind: 'model', verified: true, protocol: 'openai_responses', harness: 'codex' },
    { id: 'ext-claude', name: 'Claude-Opus-4.7', kind: 'model', verified: true, protocol: 'anthropic_messages', harness: 'claude_code' },
    { id: 'ext-redbot', name: 'RedBot-X', kind: 'agent', verified: false, protocol: 'openai_responses', harness: 'codex' },
];

const isTaskType = (value: TaskType | null): value is TaskType => value === 'evaluation' || value === 'range';

const requireIdentifier = (value: string, field: string) => {
    const normalized = value.trim();
    if (!normalized || normalized.length > 256) throw new Error(`${field} is invalid`);
    return normalized;
};

export const createTaskIdempotencyKey = (): string => globalThis.crypto?.randomUUID?.() ?? `create-${Date.now()}`;

export const buildCreateJobRequest = (draft: ITaskDraftPayload): ICreateJobRequest => {
    if (!isTaskType(draft.taskType)) throw new Error('Task type is required');
    const resourceId = requireIdentifier(draft.taskType === 'range' ? draft.environmentId : draft.questionSetId, draft.taskType === 'range' ? 'environmentId' : 'questionSetId');
    const agentId = requireIdentifier(draft.modelId, 'agentId');
    const request: ICreateJobRequest = {
        name: `${resourceId} · ${agentId}`,
        job_type: draft.taskType === 'range' ? 'RANGE' : 'CODE_EVAL',
        agent_id: agentId,
        execution_mode: 'REAL',
        constraints: {
            max_duration_sec: draft.constraints.duration * 60,
            max_steps: draft.constraints.tools,
            token_budget: draft.constraints.token * 10_000,
        },
    };
    return draft.taskType === 'range' ? { ...request, range_id: resourceId } : { ...request, suite_id: resourceId };
};

const validateDraft = (draft: ITaskDraftPayload) => {
    if (!isTaskType(draft.taskType)) throw new Error('Task type is required');
    if (draft.taskType === 'range' && !draft.environmentId) {
        throw new Error('A valid range environment is required');
    }
    if (draft.taskType === 'evaluation' && !draft.questionSetId) {
        throw new Error('A valid question set is required');
    }

    if (!draft.modelId.trim()) throw new Error('An agent ID is required');

    const limits: Record<TaskConstraintKey, readonly [number, number]> = {
        duration: [10, 120],
        token: [5, 100],
        tools: [10, 200],
        cost: [20, 1000],
    };
    (Object.keys(limits) as TaskConstraintKey[]).forEach((key) => {
        const [minimum, maximum] = limits[key];
        const value = draft.constraints[key];
        if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`Invalid ${key} constraint`);
    });
};

const requireResponseData = <T>(data: T | null | undefined, resource: string): T => {
    if (!data) throw new Error(`${resource} response is empty`);
    return data;
};

const RESOURCE_PAGE_SIZE = 100;
const MAX_PAGES = 100;
const QUEUED_JOB_STATUSES = new Set(['CREATED', 'PROVISIONING', 'QUEUED']);
const TERMINAL_JOB_STATUSES = new Set(['CANCELED', 'CANCELLED', 'FAILED', 'SUCCEEDED', 'TERMINATED']);
const REVIEW_STATUSES = new Set<TaskReviewStatus>(['APPROVED', 'NOT_REQUIRED', 'OVERRIDDEN', 'PENDING', 'REJECTED']);
const REPORT_STATUSES = new Set<TaskReportStatus>(['COMPLETED', 'FAILED', 'GENERATING', 'NOT_REQUESTED']);

const normalizeReviewStatus = (value?: string): TaskReviewStatus => {
    const status = value?.trim().toUpperCase() as TaskReviewStatus | undefined;
    return status && REVIEW_STATUSES.has(status) ? status : 'UNKNOWN';
};

const normalizeReportStatus = (value?: string): TaskReportStatus => {
    const status = value?.trim().toUpperCase() as TaskReportStatus | undefined;
    return status && REPORT_STATUSES.has(status) ? status : 'UNKNOWN';
};

const normalizeJobStatus = (value: string): string => value.trim().toUpperCase();

const getJobSceneKey = (job: IBackendJobRow): string => job.resource?.name?.trim() || 'common.notAvailable';

const isTaskPagePollable = (job: IBackendJobRow): boolean => {
    const jobStatus = normalizeJobStatus(job.status);
    const reportStatus = normalizeReportStatus(job.report?.status ?? job.report_status);
    const isJobTransitioning = !TERMINAL_JOB_STATUSES.has(jobStatus) && jobStatus !== 'PAUSED';
    return isJobTransitioning || reportStatus === 'GENERATING';
};

const getAllListPages = async <T>(path: string, params: Readonly<Record<string, string | number>>, resource: string): Promise<T[]> => {
    const requestPage = async (page: number) => {
        const response = await Http.get<Record<string, string | number>, IBackendListResponse<T>>(path, {
            params: { ...params, page, page_size: RESOURCE_PAGE_SIZE },
            forbidMsg: true,
        });
        return requireResponseData(response.data, resource);
    };

    const firstPage = await requestPage(1);
    const pageSize = firstPage.page?.page_size || RESOURCE_PAGE_SIZE;
    const pageCount = Math.ceil((firstPage.page?.total ?? firstPage.list.length) / pageSize);
    if (pageCount > MAX_PAGES) throw new Error(`${resource} pagination exceeds the supported limit`);
    if (pageCount <= 1) return [...firstPage.list];

    const remainingPages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => requestPage(index + 2)));
    return [...firstPage.list, ...remainingPages.flatMap((page) => page.list)];
};

const TASK_LIST_VIEWS: Readonly<Record<TaskListFilter, 'finished' | 'running' | undefined>> = {
    all: undefined,
    completed: 'finished',
    queued: 'running',
    running: 'running',
};

const validateTaskListQuery = (query: ITaskListQuery): ITaskListQuery => {
    if (!Number.isInteger(query.page) || query.page < 1) throw new Error('Invalid task page');
    if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) throw new Error('Invalid task page size');
    const keyword = query.keyword.trim();
    if (keyword.length > 256) throw new Error('Invalid task keyword');
    return { ...query, keyword };
};

export const getTaskCenterData = async (input: ITaskListQuery): Promise<ITaskListData> => {
    if (IS_DEMO_MODE) {
        const fixture = createTaskCenterFixture();
        return { active: fixture.active, completed: fixture.completed, page: fixture.page, shouldPoll: false };
    }
    const query = validateTaskListQuery(input);
    const view = TASK_LIST_VIEWS[query.filter];
    const params = {
        page: query.page,
        page_size: query.pageSize,
        ...(view ? { view } : {}),
        ...(query.keyword ? { keyword: query.keyword } : {}),
    };
    const response = await Http.get<typeof params, IBackendListResponse<IBackendJobRow>>('/api/v1/jobs', { params, forbidMsg: true });
    const taskPage = requireResponseData(response.data, 'Jobs');
    const jobs = [...taskPage.list];
    const active = jobs
        .filter((job) => !TERMINAL_JOB_STATUSES.has(normalizeJobStatus(job.status)))
        .map<ITaskRecord>((job) => ({
            jobId: job.job_id,
            type: job.job_type === 'RANGE' ? 'range' : 'evaluation',
            titleKey: job.name,
            sceneKey: getJobSceneKey(job),
            agent: job.agent_id,
            progress: job.progress,
            status: QUEUED_JOB_STATUSES.has(normalizeJobStatus(job.status)) ? 'queued' : 'running',
            created: job.created_at,
        }));
    const completed = jobs
        .filter((job) => TERMINAL_JOB_STATUSES.has(normalizeJobStatus(job.status)))
        .map<ICompletedTask>((job) => {
            const taskType: TaskType = job.job_type === 'RANGE' ? 'range' : 'evaluation';
            const reportId = (job.report?.report_id ?? job.report_id)?.trim() || undefined;
            const normalizedReportStatus = normalizeReportStatus(job.report?.status ?? job.report_status);
            const reportStatus = normalizedReportStatus === 'UNKNOWN' && reportId ? 'COMPLETED' : normalizedReportStatus;
            return {
                jobId: job.job_id,
                titleKey: job.name,
                sceneKey: getJobSceneKey(job),
                type: taskType,
                agent: job.agent_id,
                completedAt: job.finished_at ?? job.created_at,
                reportId,
                reportStatus,
                reviewStatus: normalizeReviewStatus(job.review_status),
                config: {
                    ...(taskType === 'range' ? DEFAULT_RANGE_CONFIG : DEFAULT_EVALUATION_CONFIG),
                    taskType,
                    environmentId: taskType === 'range' ? job.resource?.id || DEFAULT_RANGE_CONFIG.environmentId : DEFAULT_RANGE_CONFIG.environmentId,
                    questionSetId: taskType === 'evaluation' ? job.resource?.id || DEFAULT_EVALUATION_CONFIG.questionSetId : DEFAULT_EVALUATION_CONFIG.questionSetId,
                    modelId: job.agent_id,
                },
            };
        });

    return {
        active,
        completed,
        page: {
            page: taskPage.page?.page ?? query.page,
            pageSize: taskPage.page?.page_size ?? query.pageSize,
            total: taskPage.page?.total ?? jobs.length,
        },
        shouldPoll: jobs.some(isTaskPagePollable),
    };
};

export const getTaskCreationData = async (): Promise<ITaskCreationData> => {
    if (IS_DEMO_MODE) {
        const fixture = createTaskCenterFixture();
        return { environments: fixture.environments, questionSets: fixture.questionSets, builtinObjects: fixture.builtinObjects, externalObjects: fixture.externalObjects };
    }
    const [ranges, suites] = await Promise.all([getAllListPages<IBackendRangeRow>('/api/v1/ranges', {}, 'Ranges'), getAllListPages<IBackendSuiteRow>('/api/v1/code-suites', {}, 'Code suites')]);

    return {
        environments: ranges.map((range) => ({
            id: range.range_id,
            nameKey: range.name,
            subnet: `${range.node_count} nodes`,
            status: range.status === 'ACTIVE' && range.can_quick_create_job ? 'available' : 'pending',
            descriptionKey: range.name,
        })),
        questionSets: suites.map((suite) => ({
            id: suite.suite_id,
            nameKey: suite.name,
            size: suite.sample_count,
            updated: '',
            descriptionKey: suite.name,
        })),
        builtinObjects: OBJECTS.filter((object) => !object.id.startsWith('ext-')).map((object) => ({ ...object })),
        externalObjects: OBJECTS.filter((object) => object.id.startsWith('ext-') && object.verified).map((object) => ({ ...object })),
    };
};

export const terminateTask = async (jobId: string): Promise<void> => {
    if (IS_DEMO_MODE) return;
    const normalizedJobId = requireIdentifier(jobId, 'jobId');
    const response = await Http.post<{ action: 'TERMINATE' }, { job_id: string; status: string }>(`/api/v1/jobs/${encodeURIComponent(normalizedJobId)}/actions`, {
        data: { action: 'TERMINATE' },
        forbidMsg: true,
    });
    if (!response.data) throw new Error('Task termination response is empty');
};

export const enqueueTask = async (draft: ITaskDraftPayload, operationKey = createTaskIdempotencyKey()): Promise<ITaskRecord> => {
    validateDraft(draft);
    const idempotencyKey = requireIdentifier(operationKey, 'idempotencyKey');
    const request = buildCreateJobRequest(draft);
    const response = await Http.post<ICreateJobRequest, { created_at: string; job_id: string; status: string }>('/api/v1/jobs', {
        data: request,
        forbidMsg: true,
        headers: { 'Idempotency-Key': idempotencyKey },
    });
    if (!response.data) throw new Error('Task creation response is empty');
    return {
        jobId: response.data.job_id,
        type: draft.taskType as TaskType,
        titleKey: request.name,
        sceneKey: 'common.notAvailable',
        agent: draft.modelId,
        progress: 0,
        status: response.data.status === 'CREATED' ? 'queued' : 'running',
        created: response.data.created_at,
    };
};
