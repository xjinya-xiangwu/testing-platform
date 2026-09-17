import { useQuery } from '@tanstack/react-query';
import { getDashboardTopology } from '@/api/topology';
import { QUERY_KEYS } from '@/api/query-keys';
import { getDashboardRange3View } from '@/features/topology/layout/dashboard-range3-layout';

export const useDashboardTopology = () => {
    return useQuery({
        queryKey: QUERY_KEYS.topology.range('range3'),
        queryFn: async ({ signal }) => getDashboardRange3View(await getDashboardTopology(signal)),
        staleTime: 60 * 1000,
    });
};
