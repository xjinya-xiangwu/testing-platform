import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { createApiToken, getApiTokens, revokeApiToken } from '@/api/api-tokens';
import { getGatewayProviders, registerGatewayProvider, removeGatewayProvider, verifyGatewayProvider, type IGatewayProviderRegistration } from '@/api/gateway-providers';
import { getGatewaySessions } from '@/api/gateway-sessions';
import Gateway from '@/pages/gateway/gateway';
import { renderRangePage } from '@/test/render-range-page';
import { EN } from '@/locale/en';
import type { IGatewayProvider } from '@/features/gateway/domain/gateway-provider';

vi.mock('@/api/api-tokens', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/api-tokens')>();
    return { ...actual, createApiToken: vi.fn(), getApiTokens: vi.fn(), revokeApiToken: vi.fn() };
});

vi.mock('@/api/gateway-providers', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/gateway-providers')>();
    return { ...actual, getGatewayProviders: vi.fn(), registerGatewayProvider: vi.fn(), removeGatewayProvider: vi.fn(), verifyGatewayProvider: vi.fn() };
});

vi.mock('@/api/gateway-sessions', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/gateway-sessions')>();
    return { ...actual, getGatewaySessions: vi.fn() };
});

const ACTIVE_TOKEN = {
    credentialId: 'cred_active',
    name: '评测接入密钥',
    keyPrefix: 'sk-mock',
    purpose: 'evaluation' as const,
    status: 'ACTIVE' as const,
    expiresAt: '2027-08-18T03:00:00Z',
    createdAt: '2026-08-18T03:00:00Z',
};

const PROVIDER = (overrides: Partial<IGatewayProvider> = {}): IGatewayProvider => ({
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    harness: 'codex',
    health: 'healthy',
    id: 'ext-glm52',
    keyCredentialId: 'cred_active',
    kind: 'model',
    lastCheckedAt: '2026-08-05T16:20:00+08:00',
    lastErrorCode: null,
    metrics: { costCny: 1286, tasks: 46, tokensTotal: 32_400_000, trajectories: 41_000 },
    name: 'GLM-5.2',
    protocol: 'openai_chat',
    status: 'verified',
    verifiedAt: '2026-08-05T16:20:00+08:00',
    ...overrides,
});

const VERIFIED_REGISTRATION: IGatewayProviderRegistration = {
    provider: PROVIDER({ id: 'ext-new', name: 'RedBot-X', kind: 'agent', endpoint: 'https://agent.example.com/mcp', protocol: 'openai_responses' }),
    verification: { checkedAt: '2026-09-20T10:00:00Z', errorCode: null, failedStep: null, passed: true },
};

const FAILED_REGISTRATION: IGatewayProviderRegistration = {
    provider: PROVIDER({
        id: 'ext-new',
        name: 'RedBot-X',
        kind: 'agent',
        endpoint: 'https://agent.invalid/mcp',
        protocol: 'openai_responses',
        status: 'unverified',
        health: 'down',
        lastErrorCode: 'network_unreachable',
    }),
    verification: { checkedAt: '2026-09-20T10:00:00Z', errorCode: 'network_unreachable', failedStep: 'connectivity', passed: false },
};

const renderGateway = (isEnglish = false) =>
    renderRangePage(
        <Routes>
            <Route path="/gateway" element={<Gateway />} />
        </Routes>,
        '/gateway',
        isEnglish ? EN : undefined,
        isEnglish ? 'en-US' : undefined,
    );

describe('Gateway', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getApiTokens).mockResolvedValue({ list: [ACTIVE_TOKEN], page: { page: 1, pageSize: 20, total: 1 } });
        vi.mocked(createApiToken).mockResolvedValue({ ...ACTIVE_TOKEN, credentialId: 'cred_created', name: 'CI 夜间回归', token: 'sk-mock-one-time-secret' });
        vi.mocked(revokeApiToken).mockResolvedValue({ credentialId: ACTIVE_TOKEN.credentialId, status: 'REVOKED', revokedAt: '2026-08-20T03:00:00Z' });
        vi.mocked(getGatewayProviders).mockResolvedValue({
            list: [
                PROVIDER(),
                PROVIDER({
                    id: 'ext-redbot',
                    name: 'RedBot-X',
                    kind: 'agent',
                    endpoint: 'https://agent.customer.lab/mcp',
                    protocol: 'openai_responses',
                    status: 'unverified',
                    health: 'unknown',
                    keyCredentialId: null,
                    verifiedAt: null,
                    lastCheckedAt: null,
                    metrics: { costCny: 0, tasks: 0, tokensTotal: 0, trajectories: 0 },
                }),
            ],
        });
        vi.mocked(getGatewaySessions).mockResolvedValue({
            list: [
                {
                    costCny: 412.6,
                    finishedAt: '2026-08-05T17:02:00+08:00',
                    id: 'SES-20260805-21',
                    kind: 'evaluation',
                    providerId: 'ext-glm52',
                    providerName: 'GLM-5.2',
                    result: 'completed',
                    resultSummary: '完成 · 综合 94.2',
                    startedAt: '2026-08-05T16:22:00+08:00',
                    steps: [{ at: '2026-08-05T16:22:00+08:00', kind: 'control', latencyMs: 210, seq: 1, summary: '会话建立 · 密钥鉴权通过' }],
                    taskId: 'JOB-20260805-07',
                    taskName: 'SCN-02 电网 · 漏利评测',
                    tokensTotal: 3_240_000,
                    turns: 88,
                },
            ],
        });
    });

    it('renders the provider registry as the default tab with health summary', async () => {
        renderGateway();

        expect(await screen.findByRole('heading', { name: '接入网关' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '模型 / Agent 注册表' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('table', { name: '模型 / Agent 注册表' })).toBeInTheDocument();
        expect(screen.getByText('GLM-5.2')).toBeInTheDocument();
        expect(screen.getByText('RedBot-X')).toBeInTheDocument();
        expect(screen.getByText('健康 · 1')).toBeInTheDocument();
        expect(screen.getByText('未校验 · 1')).toBeInTheDocument();
    });

    it('registers a provider and shows the embedded verification passing', async () => {
        vi.mocked(registerGatewayProvider).mockResolvedValue(VERIFIED_REGISTRATION);
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        await user.click(screen.getByRole('button', { name: '注册模型 / Agent' }));
        const dialog = screen.getByRole('dialog', { name: '注册模型 / Agent' });
        await user.type(within(dialog).getByLabelText('名称'), 'RedBot-X');
        await user.type(within(dialog).getByLabelText('Agent Endpoint'), 'https://agent.example.com/mcp');
        await user.selectOptions(within(dialog).getByLabelText('接入密钥'), 'cred_active');
        await user.click(within(dialog).getByRole('button', { name: '注册并校验' }));

        expect(registerGatewayProvider).toHaveBeenCalledWith({
            endpoint: 'https://agent.example.com/mcp',
            harness: 'codex',
            keyCredentialId: 'cred_active',
            kind: 'model',
            name: 'RedBot-X',
            protocol: 'openai_responses',
        });
        expect(await within(dialog).findByText(/校验通过 · RedBot-X 已写入注册表/)).toBeInTheDocument();
        expect(within(dialog).getAllByText('通过')).toHaveLength(5);

        await user.click(within(dialog).getByRole('button', { name: '完成' }));
        expect(screen.queryByRole('dialog', { name: '注册模型 / Agent' })).not.toBeInTheDocument();
    });

    it('renders the categorized failure with a remediation hint when verification fails', async () => {
        vi.mocked(registerGatewayProvider).mockResolvedValue(FAILED_REGISTRATION);
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        await user.click(screen.getByRole('button', { name: '注册模型 / Agent' }));
        const dialog = screen.getByRole('dialog', { name: '注册模型 / Agent' });
        await user.type(within(dialog).getByLabelText('名称'), 'RedBot-X');
        await user.type(within(dialog).getByLabelText('Agent Endpoint'), 'https://agent.invalid/mcp');
        await user.click(within(dialog).getByRole('button', { name: '注册并校验' }));

        expect(await within(dialog).findAllByText(/校验未通过 · 网络不可达/)).toHaveLength(2);
        expect(within(dialog).getByText('检查 Endpoint 地址与网络出口策略，然后重新校验。')).toBeInTheDocument();
        expect(within(dialog).getAllByText('未执行')).toHaveLength(3);
        expect(within(dialog).getByRole('button', { name: '返回修改' })).toBeInTheDocument();
    });

    it('blocks submission with field errors for invalid endpoints', async () => {
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        await user.click(screen.getByRole('button', { name: '注册模型 / Agent' }));
        const dialog = screen.getByRole('dialog', { name: '注册模型 / Agent' });
        await user.type(within(dialog).getByLabelText('名称'), 'RedBot-X');
        await user.type(within(dialog).getByLabelText('Agent Endpoint'), 'not-a-url');
        await user.click(within(dialog).getByRole('button', { name: '注册并校验' }));

        expect(await within(dialog).findByText('请输入有效的 HTTP 或 HTTPS Endpoint。')).toBeInTheDocument();
        expect(registerGatewayProvider).not.toHaveBeenCalled();
    });

    it('re-verifies a registered provider from the registry row', async () => {
        vi.mocked(verifyGatewayProvider).mockResolvedValue({ provider: PROVIDER(), verification: VERIFIED_REGISTRATION.verification });
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        const table = screen.getByRole('table', { name: '模型 / Agent 注册表' });
        await user.click(within(table).getAllByRole('button', { name: '重新校验' })[0]);

        const dialog = screen.getByRole('dialog', { name: '重新校验 · GLM-5.2' });
        await user.click(within(dialog).getByRole('button', { name: '开始校验' }));

        expect(verifyGatewayProvider).toHaveBeenCalledWith('ext-glm52');
        expect(await within(dialog).findByText(/校验通过 · GLM-5.2 已写入注册表/)).toBeInTheDocument();
    });

    it('removes a provider after confirmation', async () => {
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        const table = screen.getByRole('table', { name: '模型 / Agent 注册表' });
        await user.click(within(table).getAllByRole('button', { name: '移除GLM-5.2' })[0]);

        const confirmDialog = screen.getByRole('dialog', { name: '确认移除注册对象' });
        await user.click(within(confirmDialog).getByRole('button', { name: '确认移除' }));

        await waitFor(() => expect(removeGatewayProvider).toHaveBeenCalledWith('ext-glm52'));
    });

    it('creates a live API token with a purpose and shows its plaintext exactly once', async () => {
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        await user.click(screen.getByRole('tab', { name: 'API 密钥管理' }));
        await user.click(await screen.findByRole('button', { name: '创建接入密钥' }));
        const createDialog = screen.getByRole('dialog', { name: '创建接入密钥' });
        await user.type(within(createDialog).getByLabelText('密钥名称'), 'CI 夜间回归');
        await user.selectOptions(within(createDialog).getByLabelText('用途'), 'training');
        await user.click(within(createDialog).getByRole('button', { name: '创建' }));

        expect(createApiToken).toHaveBeenCalledWith({ name: 'CI 夜间回归', purpose: 'training' });
        expect(await screen.findByRole('dialog', { name: '密钥已创建' })).toHaveTextContent('sk-mock-one-time-secret');

        await user.click(screen.getByRole('button', { name: '我已保存' }));
        expect(screen.queryByText('sk-mock-one-time-secret')).not.toBeInTheDocument();
    });

    it('loads live tokens and revokes an active credential', async () => {
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        await user.click(screen.getByRole('tab', { name: 'API 密钥管理' }));
        const table = await screen.findByRole('table', { name: 'API 密钥列表' });
        expect(within(table).getByText('评测接入密钥')).toBeInTheDocument();
        expect(within(table).getByText('评测')).toBeInTheDocument();
        expect(within(table).getByText('sk-mock••••••••')).toBeInTheDocument();

        await user.click(within(table).getByRole('button', { name: '吊销评测接入密钥' }));
        const revokeDialog = screen.getByRole('dialog', { name: '确认吊销密钥' });
        await user.click(within(revokeDialog).getByRole('button', { name: '确认吊销' }));
        await waitFor(() => expect(revokeApiToken).toHaveBeenCalledWith('cred_active'));
    });

    it('filters sessions and opens a structured session detail dialog', async () => {
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        await user.click(screen.getByRole('tab', { name: '会话管理' }));
        const table = await screen.findByRole('table', { name: '接入 Agent 会话列表' });
        expect(within(table).getByText('SES-20260805-21')).toBeInTheDocument();

        await user.click(within(table).getByRole('button', { name: '详情' }));
        const dialog = screen.getByRole('dialog', { name: '会话详情' });
        expect(dialog).toHaveTextContent('交互轮次');
        expect(dialog).toHaveTextContent('动作轨迹');
        expect(dialog).toHaveTextContent('会话建立 · 密钥鉴权通过');
        expect(dialog).toHaveTextContent('210 ms');
    });

    it('generates integration snippets that reference the selected key prefix', async () => {
        renderGateway();
        const user = userEvent.setup();
        await screen.findByText('GLM-5.2');

        await user.click(screen.getByRole('tab', { name: '接入方式与文档' }));
        expect(await screen.findByText('选择密钥生成接入配置')).toBeInTheDocument();
        expect(screen.getByText(/下方配置以 sk-mock… 引用所选密钥「评测接入密钥」/)).toBeInTheDocument();
        expect(screen.getAllByText(/Bearer sk-mock…/).length).toBeGreaterThanOrEqual(2);
    });

    it('defines the complete English gateway corpus', async () => {
        renderGateway(true);

        expect(await screen.findByRole('heading', { name: 'Access Gateway' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Model / Agent Registry' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Register model / Agent' })).toBeInTheDocument();
    });
});
