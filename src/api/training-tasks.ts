import Http from '@/utils/axios';

export type TrainingPriority = 0 | 1 | 2;
export type TrainingType = 0 | 1 | 2 | 3;
export type TrainingDataset = 0 | 1 | 2 | 3;
export type TrainingBenchmark = 0 | 1 | 2 | 3;
export type TrainingSplit = 0 | 1 | 2;
export type TrainingDuration = 0 | 1 | 2 | 3;
export type TrainingStatus = 0 | 1 | 2 | 3 | 4;
export type TrainingFramework = 'rl' | 'sft';
export type TrainingAlgorithm = 'grpo' | 'ppo' | 'gspo';
export type TrainingBase = 'v2.2' | 'v2.1' | 'v2.0';

export interface ITrainingGpu {
    count: number;
    model: string;
}

export interface ITrainingTask {
    createdAt: string;
    dataset: TrainingDataset;
    featured?: boolean;
    goal: string;
    gpu: readonly ITrainingGpu[];
    id: string;
    name: string;
    priority: TrainingPriority;
    progress: number;
    status: TrainingStatus;
    step: number;
    total: number;
    type: TrainingType;
    updatedAt: string;
}

export interface ITrainingTaskDetail extends ITrainingTask {
    base: TrainingBase;
    benchmarks: readonly TrainingBenchmark[];
    duration: TrainingDuration;
    framework: TrainingFramework;
    hyperparameters: Readonly<Record<string, string>>;
    refreshAfterMs: number;
    rlAlgorithm?: TrainingAlgorithm;
    split: TrainingSplit;
}

export interface ITrainingTaskDraft {
    base: TrainingBase;
    benchmarks: readonly TrainingBenchmark[];
    dataset: TrainingDataset;
    duration: TrainingDuration;
    framework: TrainingFramework;
    goal: string;
    gpu: readonly ITrainingGpu[];
    hyperparameters: Readonly<Record<string, string>>;
    name: string;
    priority: TrainingPriority;
    rlAlgorithm?: TrainingAlgorithm;
    split: TrainingSplit;
    type: TrainingType;
}

export interface ITrainingTaskPage {
    list: readonly ITrainingTask[];
    page: { page: number; pageSize: number; total: number };
}

export interface ITrainingTaskQuery {
    keyword?: string;
    page?: number;
    pageSize?: number;
    status?: TrainingStatus;
    type?: TrainingType;
}

export interface ITrainingTaskMutationResult {
    createdAt?: string;
    id: string;
    progress: number;
    status: TrainingStatus;
    step: number;
    total: number;
    updatedAt?: string;
}

export class TrainingTaskApiError extends Error {
    readonly code?: number | string;

    constructor(code: number | string | undefined, message: string) {
        super(message);
        this.name = 'TrainingTaskApiError';
        this.code = code;
    }
}

const PRIORITIES = new Set([0, 1, 2]);
const TYPES = new Set([0, 1, 2, 3]);
const DATASETS = new Set([0, 1, 2, 3]);
const BENCHMARKS = new Set([0, 1, 2, 3]);
const SPLITS = new Set([0, 1, 2]);
const DURATIONS = new Set([0, 1, 2, 3]);
const STATUSES = new Set([0, 1, 2, 3, 4]);
const BASES = new Set(['v2.2', 'v2.1', 'v2.0']);
const FRAMEWORKS = new Set(['rl', 'sft']);
const ALGORITHMS = new Set(['grpo', 'ppo', 'gspo']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isIntegerIn = (value: unknown, values: Set<number>): value is number => typeof value === 'number' && Number.isInteger(value) && values.has(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const requireIdentifier = (value: string) => {
    const normalized = value.trim();
    if (!normalized || normalized.length > 128) throw new Error('trainingTaskId is invalid');
    return normalized;
};

const parseGpu = (value: unknown): ITrainingGpu => {
    if (!isRecord(value) || typeof value.model !== 'string' || !value.model.trim() || typeof value.count !== 'number' || !Number.isInteger(value.count) || value.count < 1 || value.count > 1024) {
        throw new Error('Invalid training task response');
    }
    return { model: value.model, count: value.count };
};

const parseTask = (value: unknown): ITrainingTask => {
    if (
        !isRecord(value) ||
        typeof value.id !== 'string' ||
        typeof value.name !== 'string' ||
        typeof value.goal !== 'string' ||
        !isIntegerIn(value.priority, PRIORITIES) ||
        !isIntegerIn(value.type, TYPES) ||
        !isIntegerIn(value.dataset, DATASETS) ||
        !Array.isArray(value.gpu) ||
        !isFiniteNumber(value.progress) ||
        !isFiniteNumber(value.step) ||
        !isFiniteNumber(value.total) ||
        !isIntegerIn(value.status, STATUSES) ||
        typeof value.created_at !== 'string' ||
        typeof value.updated_at !== 'string' ||
        (value.featured !== undefined && typeof value.featured !== 'boolean')
    ) {
        throw new Error('Invalid training task response');
    }

    return {
        id: value.id,
        name: value.name,
        goal: value.goal,
        priority: value.priority as TrainingPriority,
        type: value.type as TrainingType,
        dataset: value.dataset as TrainingDataset,
        gpu: value.gpu.map(parseGpu),
        progress: value.progress,
        step: value.step,
        total: value.total,
        status: value.status as TrainingStatus,
        createdAt: value.created_at,
        updatedAt: value.updated_at,
        ...(value.featured === true ? { featured: true } : {}),
    };
};

const parseStringRecord = (value: unknown): Readonly<Record<string, string>> => {
    if (!isRecord(value) || Object.values(value).some((item) => typeof item !== 'string')) throw new Error('Invalid training task response');
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item as string]));
};

const parseDetail = (value: unknown): ITrainingTaskDetail => {
    const task = parseTask(value);
    if (
        !isRecord(value) ||
        !Array.isArray(value.benchmarks) ||
        value.benchmarks.some((item) => !isIntegerIn(item, BENCHMARKS)) ||
        !isIntegerIn(value.split, SPLITS) ||
        typeof value.base !== 'string' ||
        !BASES.has(value.base) ||
        typeof value.framework !== 'string' ||
        !FRAMEWORKS.has(value.framework) ||
        !isIntegerIn(value.duration, DURATIONS) ||
        !isFiniteNumber(value.refresh_after_ms) ||
        (value.rl_algorithm !== undefined && (typeof value.rl_algorithm !== 'string' || !ALGORITHMS.has(value.rl_algorithm)))
    ) {
        throw new Error('Invalid training task response');
    }
    return {
        ...task,
        benchmarks: value.benchmarks as TrainingBenchmark[],
        split: value.split as TrainingSplit,
        base: value.base as TrainingBase,
        framework: value.framework as TrainingFramework,
        ...(typeof value.rl_algorithm === 'string' ? { rlAlgorithm: value.rl_algorithm as TrainingAlgorithm } : {}),
        duration: value.duration as TrainingDuration,
        hyperparameters: parseStringRecord(value.hyperparameters),
        refreshAfterMs: value.refresh_after_ms,
    };
};

const requireSuccess = <T>(response: { code?: number | string; data: T | null; msg?: string }, fallbackMessage: string): T => {
    if ((response.code === undefined || response.code === 0 || response.code === '0') && response.data !== null && response.data !== undefined) return response.data;
    throw new TrainingTaskApiError(response.code, response.msg || fallbackMessage);
};

const validateDraft = (draft: ITrainingTaskDraft) => {
    const name = draft.name.trim();
    if (!name || name.length > 128) throw new Error('Training task name is invalid');
    if (
        !PRIORITIES.has(draft.priority) ||
        !TYPES.has(draft.type) ||
        !DATASETS.has(draft.dataset) ||
        !SPLITS.has(draft.split) ||
        !BASES.has(draft.base) ||
        !FRAMEWORKS.has(draft.framework) ||
        !DURATIONS.has(draft.duration)
    ) {
        throw new Error('Training task configuration is invalid');
    }
    if (new Set(draft.benchmarks).size !== draft.benchmarks.length || draft.benchmarks.some((item) => !BENCHMARKS.has(item))) throw new Error('Training benchmarks are invalid');
    const gpuModels = draft.gpu.map((item) => item.model.trim().toLowerCase());
    if (
        !draft.gpu.length ||
        gpuModels.some((model) => !model) ||
        new Set(gpuModels).size !== gpuModels.length ||
        draft.gpu.some((item) => !Number.isInteger(item.count) || item.count < 1 || item.count > 1024)
    ) {
        throw new Error('Training GPU configuration is invalid');
    }
    if (draft.rlAlgorithm !== undefined && !ALGORITHMS.has(draft.rlAlgorithm)) throw new Error('Training algorithm is invalid');
};

const parseMutationResult = (value: unknown): ITrainingTaskMutationResult => {
    if (!isRecord(value) || typeof value.id !== 'string' || !isIntegerIn(value.status, STATUSES) || !isFiniteNumber(value.progress) || !isFiniteNumber(value.step) || !isFiniteNumber(value.total)) {
        throw new Error('Invalid training task response');
    }
    return {
        id: value.id,
        status: value.status as TrainingStatus,
        progress: value.progress,
        step: value.step,
        total: value.total,
        ...(typeof value.created_at === 'string' ? { createdAt: value.created_at } : {}),
        ...(typeof value.updated_at === 'string' ? { updatedAt: value.updated_at } : {}),
    };
};

export const getTrainingTasks = async ({ page = 1, pageSize = 10, status, type, keyword }: ITrainingTaskQuery = {}): Promise<ITrainingTaskPage> => {
    const params = {
        page,
        page_size: pageSize,
        ...(status === undefined ? {} : { status }),
        ...(type === undefined ? {} : { type }),
        ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
    };
    const response = await Http.get<typeof params, unknown>('/api/v1/training-tasks', { params, forbidMsg: true });
    const data = requireSuccess(response, 'Training task request failed');
    if (!isRecord(data) || !Array.isArray(data.list) || !isRecord(data.page) || !isFiniteNumber(data.page.page) || !isFiniteNumber(data.page.page_size) || !isFiniteNumber(data.page.total)) {
        throw new Error('Invalid training task response');
    }
    return { list: data.list.map(parseTask), page: { page: data.page.page, pageSize: data.page.page_size, total: data.page.total } };
};

export const createTrainingTask = async (draft: ITrainingTaskDraft): Promise<ITrainingTaskMutationResult> => {
    validateDraft(draft);
    const data = {
        name: draft.name.trim(),
        priority: draft.priority,
        type: draft.type,
        goal: draft.goal.trim(),
        dataset: draft.dataset,
        benchmarks: [...draft.benchmarks],
        split: draft.split,
        base: draft.base,
        framework: draft.framework,
        ...(draft.framework === 'rl' ? { rl_algorithm: draft.rlAlgorithm ?? 'grpo' } : {}),
        gpu: draft.gpu.map((item) => ({ model: item.model.trim(), count: item.count })),
        duration: draft.duration,
        hyperparameters: { ...draft.hyperparameters },
    };
    const response = await Http.post<typeof data, unknown>('/api/v1/training-tasks', { data, forbidMsg: true });
    return parseMutationResult(requireSuccess(response, 'Training task creation failed'));
};

export const getTrainingTaskDetail = async (taskId: string): Promise<ITrainingTaskDetail> => {
    const id = requireIdentifier(taskId);
    const response = await Http.get<never, unknown>(`/api/v1/training-tasks/${encodeURIComponent(id)}`, { forbidMsg: true });
    return parseDetail(requireSuccess(response, 'Training task detail request failed'));
};

export const terminateTrainingTask = async (taskId: string): Promise<ITrainingTaskMutationResult> => {
    const id = requireIdentifier(taskId);
    const response = await Http.post<Record<string, never>, unknown>(`/api/v1/training-tasks/${encodeURIComponent(id)}/terminate`, { data: {}, forbidMsg: true });
    return parseMutationResult(requireSuccess(response, 'Training task termination failed'));
};
