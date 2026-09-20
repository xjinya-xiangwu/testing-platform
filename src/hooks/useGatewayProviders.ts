import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGatewayProviders, registerGatewayProvider, removeGatewayProvider, verifyGatewayProvider } from '@/api/gateway-providers';
import { QUERY_KEYS } from '@/api/query-keys';
import type { IGatewayProviderInput } from '@/features/gateway/domain/gateway-provider';

const REGISTRY_STALE_TIME = 30 * 1000;

// Registry mutations feed the gateway sessions view and the task wizard's external
// candidate pool, so all three caches refresh together.
const refreshGatewayConsumers = (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.gatewayProviders.all });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.gatewaySessions.all });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.creation() });
};

export const useGatewayProviders = () =>
    useQuery({
        queryKey: QUERY_KEYS.gatewayProviders.list(),
        queryFn: getGatewayProviders,
        staleTime: REGISTRY_STALE_TIME,
    });

export const useRegisterGatewayProvider = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: IGatewayProviderInput) => registerGatewayProvider(input),
        onSuccess: () => refreshGatewayConsumers(queryClient),
    });
};

export const useVerifyGatewayProvider = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (providerId: string) => verifyGatewayProvider(providerId),
        onSuccess: () => refreshGatewayConsumers(queryClient),
    });
};

export const useRemoveGatewayProvider = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (providerId: string) => removeGatewayProvider(providerId),
        onSuccess: () => refreshGatewayConsumers(queryClient),
    });
};
