import { AUTH_DEV_LOGIN, AUTH_LOGIN, AUTH_LOGOUT, AUTH_ME } from '@/config/cgi';
import { clearCachedAuthUser } from '@/components/login/auth-user-cache';
import Http from '@/utils/axios';

export interface IGetUserRes {
    userId?: string;
    ssoUid?: string;
    avatar?: string;
    username?: string;
    nickname?: string;
    status?: string;
}

interface IBackendUser {
    user_id?: unknown;
    sso_uid?: unknown;
    display_name?: unknown;
    avatar_url?: unknown;
    status?: unknown;
}

interface ILoginResponse {
    login_url?: unknown;
}

interface ILogoutResponse {
    redirect_url?: unknown;
}

const DEFAULT_RETURN_URL = '/dashboard';
const TRUSTED_SSO_ORIGINS = new Set(['https://sso.dev.openxlab.org.cn', 'https://sso.staging.openxlab.org.cn', 'https://sso.openxlab.org.cn']);
const TRUSTED_AUTH_CALLBACK_ORIGINS = new Set(['https://cyberrange-dev.intern-ai.org.cn']);
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);
const AUTH_CALLBACK_PATHS = new Set(['/api/v1/auth/callback', '/v1/auth/callback']);

const hasControlCharacter = (value: string) =>
    [...value].some((character) => {
        const characterCode = character.charCodeAt(0);
        return characterCode <= 31 || characterCode === 127;
    });

const hasUnsafePathSyntax = (target: string) => target.startsWith('//') || target.includes('\\');

const hasEncodedUnsafePathSyntax = (target: string) => {
    let decodedTarget = target;
    for (let decodeCount = 0; decodeCount < 3; decodeCount += 1) {
        if (hasUnsafePathSyntax(decodedTarget) || hasControlCharacter(decodedTarget)) return true;
        try {
            const nextTarget = decodeURIComponent(decodedTarget);
            if (nextTarget === decodedTarget) return false;
            decodedTarget = nextTarget;
        } catch {
            return true;
        }
    }
    return hasUnsafePathSyntax(decodedTarget) || hasControlCharacter(decodedTarget);
};

export const getSafeInternalPath = (target = DEFAULT_RETURN_URL, fallback = DEFAULT_RETURN_URL): string => {
    if (!target || hasEncodedUnsafePathSyntax(target)) return fallback;

    if (target.startsWith('/index.html#/')) {
        const hashRoute = target.replace('/index.html#', '');
        return getSafeInternalPath(hashRoute, fallback);
    }

    if (!target.startsWith('/')) return fallback;
    return target;
};

export const getCurrentReturnUrl = () => getSafeInternalPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);

export const getSafeAvatarUrl = (candidate: unknown) => {
    if (typeof candidate !== 'string' || !candidate || hasControlCharacter(candidate)) return '';

    try {
        const avatarUrl = new URL(candidate, window.location.origin);
        const isHttpUrl = avatarUrl.protocol === 'http:' || avatarUrl.protocol === 'https:';
        if (!isHttpUrl || avatarUrl.origin !== window.location.origin || avatarUrl.username || avatarUrl.password) return '';
        return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : avatarUrl.toString();
    } catch {
        return '';
    }
};

const useCurrentOriginForLocalCallback = (loginUrl: URL, currentLocation: string) => {
    const currentUrl = new URL(currentLocation);
    if (!LOOPBACK_HOSTNAMES.has(currentUrl.hostname)) return loginUrl.toString();

    const callbackCandidate = loginUrl.searchParams.get('redirect');
    if (!callbackCandidate) return loginUrl.toString();

    try {
        const callbackUrl = new URL(callbackCandidate);
        const isHttpUrl = callbackUrl.protocol === 'http:' || callbackUrl.protocol === 'https:';
        const isTrustedCallbackOrigin = TRUSTED_AUTH_CALLBACK_ORIGINS.has(callbackUrl.origin) || LOOPBACK_HOSTNAMES.has(callbackUrl.hostname);
        if (!isHttpUrl || !isTrustedCallbackOrigin || callbackUrl.username || callbackUrl.password || !AUTH_CALLBACK_PATHS.has(callbackUrl.pathname)) return loginUrl.toString();

        const localCallbackUrl = new URL(`${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`, currentUrl.origin);
        const localLoginUrl = new URL(loginUrl.toString());
        localLoginUrl.searchParams.set('redirect', localCallbackUrl.toString());
        return localLoginUrl.toString();
    } catch {
        return loginUrl.toString();
    }
};

export const getSafeLoginUrl = (candidate: unknown, currentLocation = window.location.href) => {
    if (typeof candidate !== 'string' || !candidate || hasControlCharacter(candidate)) return null;

    try {
        const loginUrl = new URL(candidate, window.location.origin);
        if (loginUrl.username || loginUrl.password) return null;

        const isSameOriginMockLogin = loginUrl.origin === window.location.origin && (loginUrl.protocol === 'http:' || loginUrl.protocol === 'https:') && loginUrl.pathname === AUTH_DEV_LOGIN;
        const isTrustedSsoOrigin = loginUrl.protocol === 'https:' && TRUSTED_SSO_ORIGINS.has(loginUrl.origin);
        if (!isSameOriginMockLogin && !isTrustedSsoOrigin) return null;

        if (isSameOriginMockLogin && candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
        return useCurrentOriginForLocalCallback(loginUrl, currentLocation);
    } catch {
        return null;
    }
};

export const getLoginUrl = async (returnUrl = getCurrentReturnUrl()) => {
    const safeReturnUrl = getSafeInternalPath(returnUrl);
    const absoluteReturnUrl = new URL(safeReturnUrl, window.location.origin).toString();
    const response = await Http.get<{ return_url: string }, ILoginResponse>(AUTH_LOGIN, {
        params: { return_url: absoluteReturnUrl },
        forbidCheckLogin: true,
        forbidMsg: true,
    });
    if (response.code !== 0) return null;
    return getSafeLoginUrl(response.data?.login_url);
};

export const goLogin = async (returnUrl = getCurrentReturnUrl()) => {
    const loginUrl = await getLoginUrl(returnUrl).catch(() => null);
    if (!loginUrl) return false;

    // TODO: 后端 auth callback 恢复种 Cookie 后 302 跳转后，取消注释以恢复 SSO 整页跳转。
    window.location.assign(loginUrl);
    return true;
};

export const getUser = async (): Promise<IGetUserRes | null> => {
    const response = await Http.get<never, IBackendUser>(AUTH_ME, {
        forbidCheckLogin: true,
        forbidMsg: true,
    });
    const user = response.data;
    if (response.code !== 0 || typeof user?.user_id !== 'string' || typeof user.sso_uid !== 'string') return null;

    const displayName = typeof user.display_name === 'string' ? user.display_name : '';
    return {
        userId: user.user_id,
        ssoUid: user.sso_uid,
        username: displayName,
        nickname: displayName,
        avatar: getSafeAvatarUrl(user.avatar_url),
        status: typeof user.status === 'string' ? user.status : '',
    } satisfies IGetUserRes;
};

export const loginOut = async () => {
    const response = await Http.post<never, ILogoutResponse>(AUTH_LOGOUT, {
        forbidCheckLogin: true,
        forbidMsg: true,
    });
    if (response.code !== 0) return null;

    clearCachedAuthUser();
    const redirectUrl = typeof response.data?.redirect_url === 'string' ? response.data.redirect_url : '/';
    return getSafeInternalPath(redirectUrl, '/');
};
