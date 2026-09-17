import { afterEach, describe, expect, it, vi } from 'vitest';
import Http from '@/utils/axios';
import { getLoginUrl, getSafeAvatarUrl, getSafeInternalPath, getSafeLoginUrl, getUser, loginOut } from '@/components/login/login-service';

const authUserCacheMocks = vi.hoisted(() => ({
    clearCachedAuthUser: vi.fn(),
}));

vi.mock('@/utils/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('@/components/login/auth-user-cache', () => authUserCacheMocks);

describe('backend-managed SSO session service', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        { input: '/tasks?page=1', expected: '/tasks?page=1' },
        { input: '/index.html#/dashboard', expected: '/dashboard' },
        { input: 'https://evil.example/tasks', expected: '/dashboard' },
        { input: '//evil.example/tasks', expected: '/dashboard' },
        { input: '/\\evil', expected: '/dashboard' },
        { input: '/%5Cevil.example', expected: '/dashboard' },
        { input: '/%255Cevil.example', expected: '/dashboard' },
        { input: '/%2F%2Fevil.example', expected: '/dashboard' },
        { input: '/%0d%0aevil.example', expected: '/dashboard' },
        { input: '/%250d%250aevil.example', expected: '/dashboard' },
        { input: '', expected: '/dashboard' },
    ])('normalizes safe internal return path $input', ({ input, expected }) => {
        expect(getSafeInternalPath(input)).toBe(expected);
    });

    it('requests a backend-generated login URL with an absolute safe return URL', async () => {
        const loginUrl = 'https://sso.dev.openxlab.org.cn/authentication?client_id=server-owned&state=server-owned';
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { login_url: loginUrl }, msg: '' });

        await expect(getLoginUrl('/tasks?page=1')).resolves.toBe(loginUrl);
        expect(Http.get).toHaveBeenCalledWith('/api/v1/auth/login', {
            params: { return_url: new URL('/tasks?page=1', window.location.origin).toString() },
            forbidCheckLogin: true,
            forbidMsg: true,
        });
    });

    it('rewrites the backend SSO callback to the current localhost origin while preserving its path and state', async () => {
        const backendCallback = 'https://cyberrange-dev.intern-ai.org.cn/api/v1/auth/callback?state=server-owned';
        const loginUrl = new URL('https://sso.dev.openxlab.org.cn/login');
        loginUrl.searchParams.set('clientId', 'server-owned');
        loginUrl.searchParams.set('redirect', backendCallback);
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { login_url: loginUrl.toString() }, msg: '' });

        const result = await getLoginUrl('/range');
        const resultUrl = new URL(result ?? 'https://invalid.example');
        const callbackUrl = new URL(resultUrl.searchParams.get('redirect') ?? 'https://invalid.example');

        expect(callbackUrl.origin).toBe(window.location.origin);
        expect(callbackUrl.pathname).toBe('/api/v1/auth/callback');
        expect(callbackUrl.searchParams.get('state')).toBe('server-owned');
        expect(Http.get).toHaveBeenCalledWith('/api/v1/auth/login', {
            params: { return_url: new URL('/range', window.location.origin).toString() },
            forbidCheckLogin: true,
            forbidMsg: true,
        });
    });

    it('keeps the backend SSO callback unchanged outside local development origins', () => {
        const backendCallback = 'https://cyberrange-dev.intern-ai.org.cn/api/v1/auth/callback?state=server-owned';
        const loginUrl = new URL('https://sso.dev.openxlab.org.cn/login');
        loginUrl.searchParams.set('redirect', backendCallback);

        expect(getSafeLoginUrl(loginUrl.toString(), 'https://cyberrange-dev.intern-ai.org.cn/dashboard')).toBe(loginUrl.toString());
    });

    it('does not rewrite an unexpected callback path on localhost', () => {
        const loginUrl = new URL('https://sso.dev.openxlab.org.cn/login');
        loginUrl.searchParams.set('redirect', 'https://cyberrange-dev.intern-ai.org.cn/not-an-auth-callback?state=server-owned');

        expect(getSafeLoginUrl(loginUrl.toString(), 'http://localhost:8080/dashboard')).toBe(loginUrl.toString());
    });

    it('does not rewrite a callback from an unexpected origin on localhost', () => {
        const loginUrl = new URL('https://sso.dev.openxlab.org.cn/login');
        loginUrl.searchParams.set('redirect', 'https://evil.example/api/v1/auth/callback?state=server-owned');

        expect(getSafeLoginUrl(loginUrl.toString(), 'http://localhost:8080/dashboard')).toBe(loginUrl.toString());
    });

    it('supports the IPv6 loopback origin used by local development', () => {
        const loginUrl = new URL('https://sso.dev.openxlab.org.cn/login');
        loginUrl.searchParams.set('redirect', 'https://cyberrange-dev.intern-ai.org.cn/api/v1/auth/callback?state=server-owned');

        const result = getSafeLoginUrl(loginUrl.toString(), 'http://[::1]:8080/dashboard');
        const resultUrl = new URL(result ?? 'https://invalid.example');
        const callbackUrl = new URL(resultUrl.searchParams.get('redirect') ?? 'https://invalid.example');

        expect(callbackUrl.origin).toBe('http://[::1]:8080');
    });

    it('replaces an external return URL before converting it to an absolute URL', async () => {
        const loginUrl = 'https://sso.dev.openxlab.org.cn/authentication?client_id=server-owned&state=server-owned';
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { login_url: loginUrl }, msg: '' });

        await getLoginUrl('https://evil.example/tasks');

        expect(Http.get).toHaveBeenCalledWith('/api/v1/auth/login', {
            params: { return_url: new URL('/dashboard', window.location.origin).toString() },
            forbidCheckLogin: true,
            forbidMsg: true,
        });
    });

    it('accepts a same-origin mock login URL returned by the backend', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { login_url: '/api/v1/auth/dev-login?state=server-owned' }, msg: '' });

        await expect(getLoginUrl('/dashboard')).resolves.toBe('/api/v1/auth/dev-login?state=server-owned');
    });

    it('rejects a login URL outside the platform and trusted SSO origins', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { login_url: 'https://evil.example/login' }, msg: '' });

        await expect(getLoginUrl('/dashboard')).resolves.toBeNull();
    });

    it('rejects a same-origin URL that is not the documented mock login endpoint', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { login_url: '/dashboard' }, msg: '' });

        await expect(getLoginUrl('/dashboard')).resolves.toBeNull();
    });

    it('loads and maps the current user from the HttpOnly session endpoint', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: {
                user_id: 'usr_01M09F3QAH2WJ5KDMB4XR8ZG7N',
                sso_uid: '0001234',
                display_name: '演练管理员',
                avatar_url: '',
                status: 'ACTIVE',
            },
            msg: '',
        });

        await expect(getUser()).resolves.toEqual({
            userId: 'usr_01M09F3QAH2WJ5KDMB4XR8ZG7N',
            ssoUid: '0001234',
            username: '演练管理员',
            nickname: '演练管理员',
            avatar: '',
            status: 'ACTIVE',
        });
        expect(Http.get).toHaveBeenCalledWith('/api/v1/auth/me', {
            forbidCheckLogin: true,
            forbidMsg: true,
        });
    });

    it('only accepts same-origin HTTP avatar URLs', () => {
        expect(getSafeAvatarUrl('/avatars/current-user.png')).toBe('/avatars/current-user.png');
        expect(getSafeAvatarUrl('https://evil.example/tracker.png')).toBe('');
        expect(getSafeAvatarUrl('javascript:alert(1)')).toBe('');
    });

    it('treats a missing session or malformed user response as logged out', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 9999, data: null, msg: '' });
        await expect(getUser()).resolves.toBeNull();

        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { user_id: 'usr-only' }, msg: '' });
        await expect(getUser()).resolves.toBeNull();
    });

    it('logs out through the session endpoint and returns a safe redirect', async () => {
        vi.mocked(Http.post).mockResolvedValue({ code: 0, data: { redirect_url: '/' }, msg: '' });

        await expect(loginOut()).resolves.toBe('/');
        expect(Http.post).toHaveBeenCalledWith('/api/v1/auth/logout', {
            forbidCheckLogin: true,
            forbidMsg: true,
        });
        expect(authUserCacheMocks.clearCachedAuthUser).toHaveBeenCalledOnce();
    });

    it('rejects an external logout redirect', async () => {
        vi.mocked(Http.post).mockResolvedValue({ code: 0, data: { redirect_url: 'https://evil.example' }, msg: '' });

        await expect(loginOut()).resolves.toBe('/');
    });
});
