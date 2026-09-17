import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '@/api/dashboard';
import { QUERY_KEYS } from '@/api/query-keys';

export const useDashboard = () => {
    return useQuery({
        queryKey: QUERY_KEYS.dashboard.snapshot(),
        queryFn: getDashboardData,
        refetchInterval: 1000,
        refetchIntervalInBackground: false,
        retry: false,
        staleTime: 0,
    });
};
