import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCachedAuthUser, fetchCachedAuthUser } from '@/components/login/auth-user-cache';
import { queryClient } from '@/provider/query-client';

describe('authenticated user cache', () => {
    beforeEach(() => {
        queryClient.clear();
    });

    it('reuses the authenticated user across repeated route loader executions', async () => {
        const user = { ssoUid: '0001234', username: '演练管理员' };
        const fetchUser = vi.fn().mockResolvedValue(user);

        await expect(fetchCachedAuthUser(fetchUser)).resolves.toEqual(user);
        await expect(fetchCachedAuthUser(fetchUser)).resolves.toEqual(user);

        expect(fetchUser).toHaveBeenCalledOnce();
    });

    it('requests the authenticated user again after the cache is cleared', async () => {
        const fetchUser = vi.fn().mockResolvedValue({ ssoUid: '0001234' });

        await fetchCachedAuthUser(fetchUser);
        clearCachedAuthUser();
        await fetchCachedAuthUser(fetchUser);

        expect(fetchUser).toHaveBeenCalledTimes(2);
    });

    it('does not retry a failed authenticated user request', async () => {
        const fetchUser = vi.fn().mockRejectedValue(new Error('network error'));

        await expect(fetchCachedAuthUser(fetchUser)).rejects.toThrow('network error');

        expect(fetchUser).toHaveBeenCalledOnce();
    });
});
