import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/provider/query-client';

const loginServiceMocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    goLogin: vi.fn(),
}));

vi.mock('@/components/login/login-service', () => ({
    getSafeInternalPath: (target: string) => target,
    getUser: loginServiceMocks.getUser,
    goLogin: loginServiceMocks.goLogin,
}));

import { protectedRouteLoader } from '@/routes/auth-loader';

describe('protected route loader authenticated user cache', () => {
    beforeEach(() => {
        queryClient.clear();
        vi.clearAllMocks();
    });

    it('loads the current user once across repeated internal route navigations', async () => {
        const user = { ssoUid: '0001234', username: '演练管理员' };
        loginServiceMocks.getUser.mockResolvedValue(user);

        await expect(protectedRouteLoader({ request: new Request('http://localhost:8080/tasks') })).resolves.toEqual(user);
        await expect(protectedRouteLoader({ request: new Request('http://localhost:8080/confirm?job=job-1') })).resolves.toEqual(user);

        expect(loginServiceMocks.getUser).toHaveBeenCalledOnce();
        expect(loginServiceMocks.goLogin).not.toHaveBeenCalled();
    });
});
