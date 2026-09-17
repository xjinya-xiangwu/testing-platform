import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { getDemoJob } from '@/api/demo-job';
import { getTaskCenterData } from '@/api/tasks';
import { useDemoJob, useTaskCenter } from '@/pages/tasks/hooks/use-task-center';

vi.mock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    useQuery: vi.fn(),
}));

vi.mock('@/api/tasks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/tasks')>()),
    getTaskCenterData: vi.fn(),
}));

vi.mock('@/api/demo-job', () => ({
    getDemoJob: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useTaskCenter', () => {
    it('keys and fetches only the selected page, polling it while its data can still change', async () => {
        const query = { filter: 'all' as const, keyword: '', page: 2, pageSize: 20 };

        renderHook(() => useTaskCenter(query));

        const options = vi.mocked(useQuery).mock.calls[0][0];
        expect(options.queryKey).toEqual(['tasks', 'list', query]);
        if (typeof options.queryFn !== 'function') throw new Error('Expected a task-list query function');
        await options.queryFn({} as never);
        expect(getTaskCenterData).toHaveBeenCalledWith(query);
        if (typeof options.refetchInterval !== 'function') throw new Error('Expected a task-list polling function');
        expect(options.refetchInterval({ state: { data: { shouldPoll: true } } } as never)).toBe(5000);
        expect(options.refetchInterval({ state: { data: { shouldPoll: false } } } as never)).toBe(false);
        expect(options.refetchIntervalInBackground).toBe(false);
    });
});

describe('useDemoJob', () => {
    it('polls the standalone demo card every thirty seconds without retrying hidden failures', async () => {
        renderHook(() => useDemoJob());

        const options = vi.mocked(useQuery).mock.calls[0][0];
        expect(options.queryKey).toEqual(['tasks', 'demo']);
        expect(options.enabled).toBe(true);
        if (typeof options.queryFn !== 'function') throw new Error('Expected a demo-job query function');
        await options.queryFn({} as never);
        expect(getDemoJob).toHaveBeenCalledOnce();
        expect(options.refetchInterval).toBe(30000);
        expect(options.refetchIntervalInBackground).toBe(false);
        expect(options.retry).toBe(false);
    });

    it('does not request the demo card outside the task-list route', () => {
        renderHook(() => useDemoJob(false));

        const options = vi.mocked(useQuery).mock.calls[0][0];
        expect(options.enabled).toBe(false);
    });
});
