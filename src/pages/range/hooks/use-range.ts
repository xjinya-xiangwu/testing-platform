import { useQuery } from '@tanstack/react-query';
import { getRangeEnvironmentDetail, getRangeHallData } from '@/api/range';
import { QUERY_KEYS } from '@/api/query-keys';

export const useRangeHall = () => {
    return useQuery({
        queryKey: QUERY_KEYS.range.hall(),
        queryFn: getRangeHallData,
        staleTime: 5 * 60 * 1000,
    });
};

export const useRangeEnvironmentDetail = (envId: string) => {
    return useQuery({
        queryKey: QUERY_KEYS.range.detail(envId),
        queryFn: () => getRangeEnvironmentDetail(envId),
        staleTime: 5 * 60 * 1000,
    });
};
