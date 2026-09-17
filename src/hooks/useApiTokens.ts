import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiToken, getApiTokens, revokeApiToken } from '@/api/api-tokens';
import { QUERY_KEYS } from '@/api/query-keys';

const DEFAULT_PAGE_SIZE = 20;

export const useApiTokens = (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    useQuery({
        queryKey: QUERY_KEYS.apiTokens.list(page, pageSize),
        queryFn: () => getApiTokens({ page, pageSize }),
        staleTime: 60 * 1000,
    });

export const useCreateApiToken = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createApiToken,
        onSuccess: async () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiTokens.all }),
    });
};

export const useRevokeApiToken = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: revokeApiToken,
        onSuccess: async () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiTokens.all }),
    });
};
