import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { createApiToken, getApiTokens, revokeApiToken } from '@/api/api-tokens';
import Gateway from '@/pages/gateway/gateway';
import { renderRangePage } from '@/test/render-range-page';
import { EN } from '@/locale/en';

vi.mock('@/api/api-tokens', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/api-tokens')>();
    return { ...actual, createApiToken: vi.fn(), getApiTokens: vi.fn(), revokeApiToken: vi.fn() };
});

const ACTIVE_TOKEN = {
    credentialId: 'cred_active',
    name: '评测接入密钥',
    keyPrefix: 'sk-mock',
    status: 'ACTIVE' as const,
    expiresAt: '2027-08-18T03:00:00Z',
    createdAt: '2026-08-18T03:00:00Z',
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
    });

    it('renders the external Agent dashboard as the default tab', async () => {
        renderGateway();

        expect(await screen.findByRole('heading', { name: '接入网关' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '外部模型 / Agent' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('累计执行任务')).toBeInTheDocument();
        expect(screen.getByText('135')).toBeInTheDocument();
        expect(screen.getByRole('table', { name: '外部模型 / Agent 列表' })).toBeInTheDocument();
        expect(screen.getByText('RedBot-X（客户侧 Agent）')).toBeInTheDocument();
    });

    it('creates a live API token and shows its plaintext exactly once', async () => {
        renderGateway();
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: '创建接入密钥' }));
        const createDialog = screen.getByRole('dialog', { name: '创建接入密钥' });
        await user.clear(within(createDialog).getByLabelText('密钥名称'));
        await user.type(within(createDialog).getByLabelText('密钥名称'), 'CI 夜间回归');
        await user.click(within(createDialog).getByRole('button', { name: '创建' }));

        expect(await screen.findByRole('dialog', { name: '密钥已创建' })).toHaveTextContent('sk-mock-one-time-secret');
        expect(createApiToken).toHaveBeenCalledWith('CI 夜间回归');

        await user.click(screen.getByRole('button', { name: '我已保存' }));
        expect(screen.queryByText('sk-mock-one-time-secret')).not.toBeInTheDocument();
    });

    it('loads live tokens and revokes an active credential', async () => {
        renderGateway();
        const user = userEvent.setup();

        await user.click(screen.getByRole('tab', { name: 'API 密钥管理' }));
        const table = await screen.findByRole('table', { name: 'API 密钥列表' });
        expect(within(table).getByText('评测接入密钥')).toBeInTheDocument();
        expect(within(table).getByText('sk-mock••••••••')).toBeInTheDocument();

        await user.click(within(table).getByRole('button', { name: '吊销评测接入密钥' }));
        await waitFor(() => expect(revokeApiToken).toHaveBeenCalledWith('cred_active'));
    });

    it('renders static access docs and the API center', async () => {
        renderGateway();
        const user = userEvent.setup();

        await user.click(screen.getByRole('tab', { name: '接入方式与文档' }));
        expect(screen.getByRole('heading', { name: 'REST API' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'MCP' })).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: '接口中心' }));
        expect(screen.getByText('openai_responses / openai_chat / anthropic_messages')).toBeInTheDocument();
        expect(screen.getByText(/决策 VM 与工具执行 VM/)).toBeInTheDocument();
    });

    it('runs the mock verification flow and exposes the verified Agent', async () => {
        renderGateway();
        const user = userEvent.setup();

        await user.click(screen.getByRole('tab', { name: '接入 Agent 校验' }));
        await user.click(screen.getByRole('button', { name: '开始校验' }));

        expect(await screen.findByText(/校验通过.*已写入外部模型/)).toBeInTheDocument();
        expect(screen.getAllByText('校验通过').length).toBeGreaterThanOrEqual(5);
    });

    it('opens an accessible mock session detail dialog', async () => {
        renderGateway();
        const user = userEvent.setup();

        await user.click(screen.getByRole('tab', { name: '会话管理' }));
        await user.click(screen.getAllByRole('button', { name: '详情' })[0]);

        const dialog = screen.getByRole('dialog', { name: '会话详情' });
        expect(dialog).toHaveTextContent('SES-20260805-21');
        expect(dialog).toHaveTextContent('交互轮次');
        expect(dialog).toHaveTextContent('88');
    });

    it('defines the complete English gateway corpus', async () => {
        renderGateway(true);

        expect(await screen.findByRole('heading', { name: 'Access Gateway' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'External Models / Agents' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create access key' })).toBeInTheDocument();
    });
});
