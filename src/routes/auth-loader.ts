import { LoaderFunctionArgs, redirect } from 'react-router-dom';
import { IGetUserRes, getSafeInternalPath, getUser, goLogin } from '@/components/login/login-service';
import { fetchCachedAuthUser } from '@/components/login/auth-user-cache';
import { DEMO_USER, IS_DEMO_MODE } from '@/config/demo-mode';

interface ProtectedRouteLoaderDependencies {
    fetchUser?: () => Promise<IGetUserRes | null>;
    login?: (returnUrl: string) => Promise<boolean> | boolean;
    replaceUrl?: (url: string) => void;
}

const LEGACY_CALLBACK_QUERY_KEYS = ['code', 'clientId', 'client_id', 'state', 'checked', 'lang'] as const;
const LEGACY_CALLBACK_PATHS = new Set(['/', '/index.html']);

const getRequestReturnUrl = (url: URL) => {
    const params = new URLSearchParams(url.search);
    if (LEGACY_CALLBACK_PATHS.has(url.pathname)) LEGACY_CALLBACK_QUERY_KEYS.forEach((key) => params.delete(key));
    const search = params.size ? `?${params.toString()}` : '';
    return getSafeInternalPath(`${url.pathname}${search}${url.hash}`);
};

const getCachedUser = () => fetchCachedAuthUser(getUser);

export const createProtectedRouteLoader = ({ fetchUser = getCachedUser, login = goLogin, replaceUrl = (url) => window.history.replaceState(null, '', url) }: ProtectedRouteLoaderDependencies = {}) => {
    return async ({ request }: Pick<LoaderFunctionArgs, 'request'>) => {
        if (IS_DEMO_MODE) return { ...DEMO_USER };
        const url = new URL(request.url);
        const returnUrl = getRequestReturnUrl(url);
        const currentUrl = `${url.pathname}${url.search}${url.hash}`;
        if (returnUrl !== currentUrl) replaceUrl(returnUrl);

        const user = await fetchUser().catch(() => null);
        if (user?.ssoUid) return user;

        const isRedirectStarted = await Promise.resolve(login(returnUrl)).catch(() => false);
        return isRedirectStarted ? null : redirect('/login');
    };
};

export const protectedRouteLoader = createProtectedRouteLoader();
