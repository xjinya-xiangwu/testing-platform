import { useQuery } from '@tanstack/react-query';
import { getGatewaySessions } from '@/api/gateway-sessions';
import { QUERY_KEYS } from '@/api/query-keys';
import type { IGatewaySessionFilter } from '@/features/gateway/domain/gateway-session';

export const useGatewaySessions = (filter: IGatewaySessionFilter) =>
    useQuery({
        queryKey: QUERY_KEYS.gatewaySessions.list(filter),
        queryFn: () => getGatewaySessions(filter),
        staleTime: 30 * 1000,
    });
