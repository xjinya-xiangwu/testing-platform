import { beforeEach, describe, expect, it, vi } from 'vitest';
import Http from '@/utils/axios';
import { createTrainingTask, getTrainingTaskDetail, getTrainingTasks, terminateTrainingTask, TrainingTaskApiError } from '@/api/training-tasks';

vi.mock('@/utils/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

const BACKEND_TASK = {
    id: 'TRN-2026-0820-YKT0BC',
    name: '工控协议智能体 RL 强化训练',
    goal: '提升工控场景策略规划能力',
    priority: 2,
    type: 1,
    dataset: 2,
    gpu: [{ model: 'H100', count: 8 }],
    progress: 76,
    step: 45600,
    total: 60000,
    status: 1,
    featured: true,
    created_at: '2026-04-25T12:00:00Z',
    updated_at: '2026-04-25T12:00:00Z',
};

describe('training task API facade', () => {
    beforeEach(() => vi.clearAllMocks());

    it('loads and validates a filtered training-task page', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: { list: [BACKEND_TASK], page: { page: 2, page_size: 10, total: 16 } },
            msg: '',
        });

        const result = await getTrainingTasks({ keyword: '工控', page: 2, pageSize: 10, status: 1, type: 1 });

        expect(Http.get).toHaveBeenCalledWith('/api/v1/training-tasks', {
            params: { keyword: '工控', page: 2, page_size: 10, status: 1, type: 1 },
            forbidMsg: true,
        });
        expect(result).toEqual({
            list: [
                {
                    id: BACKEND_TASK.id,
                    name: BACKEND_TASK.name,
                    goal: BACKEND_TASK.goal,
                    priority: 2,
                    type: 1,
                    dataset: 2,
                    gpu: [{ model: 'H100', count: 8 }],
                    progress: 76,
                    step: 45600,
                    total: 60000,
                    status: 1,
                    featured: true,
                    createdAt: BACKEND_TASK.created_at,
                    updatedAt: BACKEND_TASK.updated_at,
                },
            ],
            page: { page: 2, pageSize: 10, total: 16 },
        });
    });

    it('serializes the six-step draft using the documented contract', async () => {
        vi.mocked(Http.post).mockResolvedValue({
            code: 0,
            data: { id: 'TRN-2026-0820-A1B2C3', status: 0, progress: 0, step: 0, total: 30000, created_at: '2026-08-20T03:30:00Z' },
            msg: '',
        });

        await createTrainingTask({
            name: '渗透链智能体 RL 训练',
            priority: 1,
            type: 1,
            goal: '提升利用链规划能力',
            dataset: 0,
            benchmarks: [0, 1],
            split: 0,
            base: 'v2.2',
            framework: 'rl',
            rlAlgorithm: 'grpo',
            gpu: [{ model: 'H100', count: 8 }],
            duration: 1,
            hyperparameters: { learning_rate: '1e-6', batch_size: '32' },
        });

        expect(Http.post).toHaveBeenCalledWith('/api/v1/training-tasks', {
            data: {
                name: '渗透链智能体 RL 训练',
                priority: 1,
                type: 1,
                goal: '提升利用链规划能力',
                dataset: 0,
                benchmarks: [0, 1],
                split: 0,
                base: 'v2.2',
                framework: 'rl',
                rl_algorithm: 'grpo',
                gpu: [{ model: 'H100', count: 8 }],
                duration: 1,
                hyperparameters: { learning_rate: '1e-6', batch_size: '32' },
            },
            forbidMsg: true,
        });
    });

    it('loads detail polling metadata and terminates opaque task IDs safely', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: {
                ...BACKEND_TASK,
                benchmarks: [0, 1],
                split: 0,
                base: 'v2.2',
                framework: 'rl',
                rl_algorithm: 'grpo',
                duration: 1,
                hyperparameters: { learning_rate: '1e-6' },
                refresh_after_ms: 3000,
            },
            msg: '',
        });
        vi.mocked(Http.post).mockResolvedValue({ code: 0, data: { id: 'TRN/unsafe', status: 4, progress: 76, step: 45600, total: 60000, updated_at: 'now' }, msg: '' });

        const detail = await getTrainingTaskDetail('TRN/unsafe');
        await terminateTrainingTask('TRN/unsafe');

        expect(detail.refreshAfterMs).toBe(3000);
        expect(detail.rlAlgorithm).toBe('grpo');
        expect(Http.get).toHaveBeenCalledWith('/api/v1/training-tasks/TRN%2Funsafe', { forbidMsg: true });
        expect(Http.post).toHaveBeenCalledWith('/api/v1/training-tasks/TRN%2Funsafe/terminate', { data: {}, forbidMsg: true });
    });

    it('surfaces the backend message for an unavailable terminate action', async () => {
        vi.mocked(Http.post).mockResolvedValue({ code: 'NOT_FOUND', data: null, msg: '任务不存在或当前任务不可终止' });

        await expect(terminateTrainingTask(BACKEND_TASK.id)).rejects.toEqual(
            expect.objectContaining<Partial<TrainingTaskApiError>>({ code: 'NOT_FOUND', message: '任务不存在或当前任务不可终止', name: 'TrainingTaskApiError' }),
        );
    });

    it('uses the documented GRPO default when an RL draft omits the algorithm', async () => {
        vi.mocked(Http.post).mockResolvedValue({ code: 0, data: { id: 'TRN-DEFAULT', status: 0, progress: 0, step: 0, total: 12000 }, msg: '' });

        await createTrainingTask({
            name: '默认算法任务',
            priority: 2,
            type: 1,
            goal: '',
            dataset: 0,
            benchmarks: [],
            split: 0,
            base: 'v2.2',
            framework: 'rl',
            gpu: [{ model: 'H100', count: 1 }],
            duration: 0,
            hyperparameters: {},
        });

        expect(Http.post).toHaveBeenCalledWith('/api/v1/training-tasks', expect.objectContaining({ data: expect.objectContaining({ rl_algorithm: 'grpo' }) }));
    });

    it('rejects malformed task rows instead of rendering untrusted values', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { list: [{ id: 'only-id' }], page: { page: 1, page_size: 20, total: 1 } }, msg: '' });

        await expect(getTrainingTasks()).rejects.toThrow('Invalid training task response');
    });
});
