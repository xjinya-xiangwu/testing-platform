import type { IGetUserRes } from '@/components/login/login-service';
import { QUERY_KEYS } from '@/api/query-keys';
import { queryClient } from '@/provider/query-client';

type AuthUserFetcher = () => Promise<IGetUserRes | null>;

export const fetchCachedAuthUser = (fetchUser: AuthUserFetcher) =>
    queryClient.fetchQuery({
        queryKey: QUERY_KEYS.auth.currentUser(),
        queryFn: fetchUser,
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
    });

export const clearCachedAuthUser = () => {
    queryClient.removeQueries({ queryKey: QUERY_KEYS.auth.currentUser(), exact: true });
};
