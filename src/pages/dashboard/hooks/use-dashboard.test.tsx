import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '@/api/dashboard';
import { useDashboard } from '@/pages/dashboard/hooks/use-dashboard';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
}));

describe('useDashboard', () => {
    it('polls the lightweight overview endpoint once per second', () => {
        renderHook(() => useDashboard());

        expect(useQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                queryFn: getDashboardData,
                refetchInterval: 1000,
                refetchIntervalInBackground: false,
                retry: false,
                staleTime: 0,
            }),
        );
    });
});
