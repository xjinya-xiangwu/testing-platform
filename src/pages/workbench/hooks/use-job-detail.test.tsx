import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { getJobDetail } from '@/api/job-detail';
import { useJobDetail } from '@/pages/workbench/hooks/use-job-detail';
import { PINNED_JOB_ID } from '@/config/demo-job';
import type { JobStatus } from '@/api/job-detail';

vi.mock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    useQuery: vi.fn(),
}));

vi.mock('@/api/job-detail', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/job-detail')>()),
    getJobDetail: vi.fn(),
}));

const createQueryState = (status?: JobStatus) =>
    ({
        state: {
            data: status
                ? {
                      top_info: { status },
                  }
                : undefined,
        },
    }) as never;

describe('useJobDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('polls active workbench states every three seconds and stops for paused or completed jobs', async () => {
        renderHook(() => useJobDetail('job_detail'));

        const options = vi.mocked(useQuery).mock.calls[0][0];
        expect(options.queryKey).toEqual(['jobs', 'detail', 'job_detail']);
        if (typeof options.queryFn !== 'function') throw new Error('Expected a job-detail query function');
        await options.queryFn({} as never);
        expect(getJobDetail).toHaveBeenCalledWith('job_detail');

        if (typeof options.refetchInterval !== 'function') throw new Error('Expected a job-detail polling function');
        expect(options.refetchInterval(createQueryState('INITIALIZING'))).toBe(3000);
        expect(options.refetchInterval(createQueryState('RUNNING'))).toBe(3000);
        expect(options.refetchInterval(createQueryState('PAUSED'))).toBe(false);
        expect(options.refetchInterval(createQueryState('COMPLETED'))).toBe(false);
        expect(options.refetchInterval(createQueryState())).toBe(false);
        expect(options.refetchIntervalInBackground).toBe(false);
    });

    it('keeps the cycling demo detail fresh on a longer interval', () => {
        renderHook(() => useJobDetail(PINNED_JOB_ID));

        const options = vi.mocked(useQuery).mock.calls[0][0];
        if (typeof options.refetchInterval !== 'function') throw new Error('Expected a job-detail polling function');
        expect(options.refetchInterval(createQueryState('RUNNING'))).toBe(30000);
        expect(options.refetchInterval(createQueryState())).toBe(30000);
        expect(options.refetchIntervalInBackground).toBe(false);
    });
});
