import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/utils/axios';

type RequestInterceptor = (config: { headers: Record<string, string>; forbidCheckLogin?: boolean }) => { headers: Record<string, string> };
type ResponseErrorInterceptor = (error: {
    response: { status: number; data: unknown };
    request: { responseURL: string };
    config: { forbidCheckLogin?: boolean; forbidMsg?: boolean };
    message: string;
}) => Promise<unknown>;

const axiosMocks = vi.hoisted(() => ({
    create: vi.fn(),
    requestInterceptor: undefined as RequestInterceptor | undefined,
    responseErrorInterceptor: undefined as ResponseErrorInterceptor | undefined,
}));
const loginMocks = vi.hoisted(() => ({
    goLogin: vi.fn().mockResolvedValue(true),
}));
const authUserCacheMocks = vi.hoisted(() => ({
    clearCachedAuthUser: vi.fn(),
}));

vi.mock('axios', () => {
    const instance = Object.assign(vi.fn(), {
        interceptors: {
            request: {
                use: vi.fn((interceptor: RequestInterceptor) => {
                    axiosMocks.requestInterceptor = interceptor;
                }),
            },
            response: {
                use: vi.fn((_: unknown, interceptor: ResponseErrorInterceptor) => {
                    axiosMocks.responseErrorInterceptor = interceptor;
                }),
            },
        },
    });
    axiosMocks.create.mockReturnValue(instance);
    return { default: { create: axiosMocks.create } };
});

vi.mock('antd', () => ({
    message: { error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@easycode/client-detector', () => ({
    detector: { sendError2: vi.fn() },
}));
vi.mock('@/components/login/login-service', () => ({
    goLogin: loginMocks.goLogin,
}));
vi.mock('@/components/login/auth-user-cache', () => authUserCacheMocks);

describe('HttpOnly session axios contract', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('enables credentials and sends requests without a JavaScript token or Authorization header', () => {
        expect(axiosMocks.create).toHaveBeenCalledWith({ withCredentials: true });

        const config = { headers: {} };
        const interceptedConfig = axiosMocks.requestInterceptor?.(config);

        expect(interceptedConfig).toBe(config);
        expect(config.headers).not.toHaveProperty('Authorization');
        expect(loginMocks.goLogin).not.toHaveBeenCalled();
    });

    it('does not redirect when an authentication endpoint opts out of 401 handling', async () => {
        vi.useFakeTimers();
        await axiosMocks.responseErrorInterceptor?.({
            response: { status: 401, data: null },
            request: { responseURL: '/api/v1/auth/me' },
            config: { forbidCheckLogin: true, forbidMsg: true },
            message: 'Unauthorized',
        });
        await vi.runAllTimersAsync();

        expect(loginMocks.goLogin).not.toHaveBeenCalled();
    });

    it('coalesces concurrent business 401 responses into one login redirect', async () => {
        vi.useFakeTimers();
        const unauthorizedError = {
            response: { status: 401, data: null },
            request: { responseURL: '/v1/tasks' },
            config: { forbidMsg: true },
            message: 'Unauthorized',
        };

        await Promise.all([axiosMocks.responseErrorInterceptor?.(unauthorizedError), axiosMocks.responseErrorInterceptor?.(unauthorizedError)]);
        expect(authUserCacheMocks.clearCachedAuthUser).toHaveBeenCalledOnce();
        await vi.runAllTimersAsync();

        expect(loginMocks.goLogin).toHaveBeenCalledOnce();
    });

    it('preserves the backend error code and message for post-action feedback', async () => {
        const result = await axiosMocks.responseErrorInterceptor?.({
            response: { status: 404, data: { code: 'NOT_FOUND', message: '任务不存在或当前任务不可终止', request_id: 'req-1' } },
            request: { responseURL: '/api/v1/training-tasks/TRN-1/terminate' },
            config: { forbidMsg: true },
            message: 'Request failed with status code 404',
        });

        expect(result).toEqual({ code: 'NOT_FOUND', data: null, msg: '任务不存在或当前任务不可终止', requestId: 'req-1' });
    });
});
