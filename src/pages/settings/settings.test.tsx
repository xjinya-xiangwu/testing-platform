import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuditLogs } from '@/api/audit-logs';
import { getApiTokens } from '@/api/api-tokens';
import Settings from '@/pages/settings/settings';
import { InfoContext } from '@/provider/global-provider';
import { ZH } from '@/locale/zh';

vi.mock('@/api/api-tokens', () => ({
    getApiTokens: vi.fn(),
}));

vi.mock('@/api/audit-logs', () => ({
    getAuditLogs: vi.fn(),
}));

const USER = {
    userId: 'usr_01M09F3QAH2WJ5KDMB4XR8ZG7N',
    ssoUid: '0001234',
    username: '演练管理员',
    nickname: '演练管理员',
    avatar: '',
    status: 'ACTIVE',
};

const TOKEN_PAGE = {
    list: [
        {
            credentialId: 'cred_01M9G4T7XR2Z',
            name: 'CLI 接入凭证',
            keyPrefix: 'sk-mock',
            status: 'ACTIVE' as const,
            expiresAt: '2027-08-18T03:00:00Z',
            createdAt: '2026-08-18T03:00:00Z',
        },
    ],
    page: { page: 1, pageSize: 20, total: 1 },
};

const AUDIT_LOG_LIST = {
    list: [
        {
            id: '1024',
            summary: '创建接入密钥「CI流水线·夜间回归」',
            result: 'success' as const,
            createdAt: '2026-08-05T10:02:00Z',
        },
        {
            id: '1023',
            summary: 'SSO 登录',
            result: 'failure' as const,
            createdAt: '2026-08-05T00:57:00Z',
        },
    ],
    page: { page: 1, pageSize: 10, total: 2 },
};

interface RenderSettingsOptions {
    loginOut?: ReturnType<typeof vi.fn>;
    routeUser?: typeof USER;
    userInfo?: Partial<typeof USER>;
}

const renderSettings = ({ loginOut = vi.fn(), routeUser = USER, userInfo = {} }: RenderSettingsOptions = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(
        [
            {
                id: 'authenticated-root',
                element: <Outlet context={routeUser} />,
                children: [{ path: '/settings', element: <Settings /> }],
            },
        ],
        { initialEntries: ['/settings'] },
    );

    return {
        loginOut,
        ...render(
            <InfoContext.Provider
                value={{
                    lang: 'zh-CN',
                    locale: ZH,
                    setLocale: () => undefined,
                    isLogin: true,
                    userInfo,
                    initUser: () => undefined,
                    loginOut,
                }}
            >
                <QueryClientProvider client={queryClient}>
                    <RouterProvider router={router} />
                </QueryClientProvider>
            </InfoContext.Provider>,
        ),
    };
};

describe('Settings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getApiTokens).mockResolvedValue(TOKEN_PAGE);
        vi.mocked(getAuditLogs).mockResolvedValue(AUDIT_LOG_LIST);
    });

    it('renders the real SSO profile fields and API token list without prototype-only data', async () => {
        renderSettings();

        expect(await screen.findByRole('heading', { name: '用户设置' })).toBeInTheDocument();
        expect(screen.getByText('演练管理员')).toBeInTheDocument();
        expect(screen.getByText('usr_01M09F3QAH2WJ5KDMB4XR8ZG7N')).toBeInTheDocument();
        expect(screen.getByText('0001234')).toBeInTheDocument();
        expect(await screen.findByText('CLI 接入凭证')).toBeInTheDocument();
        expect(screen.getByText(/sk-mock/)).toBeInTheDocument();
        expect(await screen.findByText('创建接入密钥「CI流水线·夜间回归」')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '操作记录列表' })).toBeInTheDocument();
        expect(screen.getByText('创建接入密钥「CI流水线·夜间回归」').closest('tr')?.querySelector('time')).toHaveAttribute('datetime', '2026-08-05T10:02:00Z');
        expect(screen.getByText('SSO 登录')).toBeInTheDocument();
        expect(screen.getByText('成功')).toBeInTheDocument();
        expect(screen.getByText('失败')).toBeInTheDocument();
        expect(screen.queryByText('创建接入密钥')).not.toBeInTheDocument();
        expect(screen.queryByText('接口暂未提供，当前页面不展示模拟记录。')).not.toBeInTheDocument();
        expect(screen.queryByText('安全研究组')).not.toBeInTheDocument();
        expect(screen.queryByText('2026-01-08')).not.toBeInTheDocument();
    });

    it('logs the current user out through the shared SSO session action', async () => {
        const loginOut = vi.fn();
        renderSettings({ loginOut });

        await userEvent.click(await screen.findByRole('button', { name: '退出登录' }));

        expect(loginOut).toHaveBeenCalledOnce();
    });

    it('shows a retryable API token error state', async () => {
        vi.mocked(getApiTokens).mockRejectedValueOnce(new Error('request failed')).mockResolvedValueOnce(TOKEN_PAGE);
        renderSettings();

        expect(await screen.findByRole('alert')).toHaveTextContent('API 密钥加载失败');
        await userEvent.click(screen.getByRole('button', { name: '重试' }));

        expect(await screen.findByText('CLI 接入凭证')).toBeInTheDocument();
        expect(getApiTokens).toHaveBeenCalledTimes(2);
    });

    it('renders expired and revoked token states from the backend enum', async () => {
        vi.mocked(getApiTokens).mockResolvedValue({
            list: [
                { ...TOKEN_PAGE.list[0], credentialId: 'expired', name: '过期凭证', status: 'EXPIRED' },
                { ...TOKEN_PAGE.list[0], credentialId: 'revoked', name: '吊销凭证', status: 'REVOKED', revokedAt: '2026-08-18T05:00:00Z' },
            ],
            page: { page: 1, pageSize: 20, total: 2 },
        });
        renderSettings();

        expect(await screen.findByText('已过期')).toBeInTheDocument();
        expect(screen.getByText('已吊销')).toBeInTheDocument();
    });

    it('renders an honest empty state when the current user has no API tokens', async () => {
        vi.mocked(getApiTokens).mockResolvedValue({ list: [], page: { page: 1, pageSize: 20, total: 0 } });
        renderSettings();

        expect(await screen.findByText('暂无 API 密钥')).toBeInTheDocument();
    });

    it('renders an honest empty state when the current user has no audit logs', async () => {
        vi.mocked(getAuditLogs).mockResolvedValue({ list: [], page: { page: 1, pageSize: 10, total: 0 } });
        renderSettings();

        expect(await screen.findByText('暂无操作记录')).toBeInTheDocument();
    });

    it('shows a retryable audit error state', async () => {
        vi.mocked(getAuditLogs).mockRejectedValueOnce(new Error('request failed')).mockResolvedValueOnce(AUDIT_LOG_LIST);
        renderSettings();

        expect(await screen.findByRole('alert', { name: '操作记录加载失败' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '重试加载操作记录' }));

        expect(await screen.findByText('创建接入密钥「CI流水线·夜间回归」')).toBeInTheDocument();
        expect(getAuditLogs).toHaveBeenCalledTimes(2);
    });

    it('refreshes the audit history only when the user asks', async () => {
        renderSettings();

        expect(await screen.findByText('创建接入密钥「CI流水线·夜间回归」')).toBeInTheDocument();
        expect(getAuditLogs).toHaveBeenCalledOnce();

        await userEvent.click(screen.getByRole('button', { name: '刷新操作记录' }));

        expect(getAuditLogs).toHaveBeenCalledTimes(2);
    });

    it('falls back to the shared user context and safely renders an available avatar', async () => {
        vi.mocked(getApiTokens).mockResolvedValue({
            list: [{ ...TOKEN_PAGE.list[0], createdAt: 'invalid-date' }],
            page: { page: 1, pageSize: 20, total: 1 },
        });
        renderSettings({
            routeUser: { ...USER, ssoUid: '' },
            userInfo: { nickname: 'operator', avatar: '/avatars/operator.png', status: 'DISABLED' },
        });

        const avatar = await screen.findByRole('img', { name: 'operator的头像' });
        expect(avatar).toHaveAttribute('src', '/avatars/operator.png');
        expect(avatar).toHaveAttribute('referrerpolicy', 'no-referrer');
        expect(screen.getAllByText('未知')).toHaveLength(2);
        expect(screen.getAllByText('—').length).toBeGreaterThan(1);
    });

    it('falls back to an account initial for an unapproved remote avatar', async () => {
        renderSettings({
            routeUser: { ...USER, ssoUid: '' },
            userInfo: { nickname: 'operator', avatar: 'https://evil.example/tracker.png', status: 'ACTIVE' },
        });

        expect(await screen.findByText('OP')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('shows the localized account fallback while the token query is pending', () => {
        vi.mocked(getApiTokens).mockImplementation(() => new Promise(() => undefined));
        renderSettings({ routeUser: { ...USER, ssoUid: '' }, userInfo: {} });

        expect(screen.getByText('演练用户')).toBeInTheDocument();
        expect(screen.getAllByText('正在加载数据…').length).toBeGreaterThan(0);
    });
});
