import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useLogin from '@/hooks/useLogin';
import { getUser, goLogin, loginOut } from '@/components/login/login-service';
import { fetchCachedAuthUser } from '@/components/login/auth-user-cache';

vi.mock('@/components/login/login-service', () => ({
    getUser: vi.fn(),
    goLogin: vi.fn(),
    loginOut: vi.fn(),
}));

vi.mock('@/components/login/auth-user-cache', () => ({
    fetchCachedAuthUser: vi.fn((fetchUser: () => Promise<unknown>) => fetchUser()),
}));

describe('useLogin SSO session state', () => {
    it('hydrates the current user from the existing authenticated user endpoint', async () => {
        vi.mocked(getUser).mockResolvedValue({ ssoUid: '0001234', username: '演练管理员' });
        const { result } = renderHook(() => useLogin());

        await act(async () => {
            await result.current.initUser(true);
        });

        expect(result.current.isLogin).toBe(true);
        expect(result.current.userInfo).toEqual({ ssoUid: '0001234', username: '演练管理员' });
        expect(fetchCachedAuthUser).toHaveBeenCalledWith(getUser);
    });

    it('starts SSO when user hydration fails and redirect is allowed', async () => {
        vi.mocked(getUser).mockResolvedValue(null);
        const { result } = renderHook(() => useLogin());

        await act(async () => {
            await result.current.initUser(false);
        });

        expect(goLogin).toHaveBeenCalledWith('/dashboard');
    });

    it('clears local user state and returns to the application root after logout', async () => {
        vi.mocked(getUser).mockResolvedValue({ ssoUid: '0001234', username: '演练管理员' });
        vi.mocked(loginOut).mockResolvedValue('/');
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        const { result } = renderHook(() => useLogin());

        await act(async () => {
            await result.current.initUser(true);
            await result.current.doLoginOut();
        });

        expect(result.current.isLogin).toBe(false);
        expect(result.current.userInfo).toEqual({});
        expect(open).toHaveBeenCalledWith('/', '_self');
        open.mockRestore();
    });
});
