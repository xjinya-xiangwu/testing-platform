import { describe, expect, it, vi } from 'vitest';
import { createProtectedRouteLoader } from '@/routes/auth-loader';

describe('protected route loader with backend-managed session', () => {
    it('lets authenticated users enter protected routes', async () => {
        const login = vi.fn();
        const user = { ssoUid: '0001234', username: '演练管理员' };
        const loader = createProtectedRouteLoader({ fetchUser: vi.fn().mockResolvedValue(user), login });

        await expect(loader({ request: new Request('http://localhost:8080/tasks') })).resolves.toEqual(user);
        expect(login).not.toHaveBeenCalled();
    });

    it('starts backend SSO and preserves the current route when the session is missing', async () => {
        const login = vi.fn().mockResolvedValue(true);
        const loader = createProtectedRouteLoader({ fetchUser: vi.fn().mockResolvedValue(null), login });

        await expect(loader({ request: new Request('http://localhost:8080/tasks?page=1') })).resolves.toBeNull();
        expect(login).toHaveBeenCalledWith('/tasks?page=1');
    });

    it('starts backend SSO when session lookup fails', async () => {
        const login = vi.fn().mockResolvedValue(true);
        const loader = createProtectedRouteLoader({ fetchUser: vi.fn().mockRejectedValue(new Error('network error')), login });

        await expect(loader({ request: new Request('http://localhost:8080/dashboard') })).resolves.toBeNull();
        expect(login).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to the login fallback page when the backend cannot start SSO', async () => {
        const loader = createProtectedRouteLoader({ fetchUser: vi.fn().mockResolvedValue(null), login: vi.fn().mockResolvedValue(false) });

        const response = await loader({ request: new Request('http://localhost:8080/tasks') });

        expect((response as Response).status).toBe(302);
        expect((response as Response).headers.get('Location')).toBe('/login');
    });

    it('only cleans legacy callback parameters without exchanging code in the frontend', async () => {
        const login = vi.fn().mockResolvedValue(true);
        const replaceUrl = vi.fn();
        const loader = createProtectedRouteLoader({ fetchUser: vi.fn().mockResolvedValue(null), login, replaceUrl });

        await loader({ request: new Request('http://localhost:8080/?code=legacy-code&state=legacy-state&keep=1') });

        expect(replaceUrl).toHaveBeenCalledWith('/?keep=1');
        expect(login).toHaveBeenCalledWith('/?keep=1');
    });
});
