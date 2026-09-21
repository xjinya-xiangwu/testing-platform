import { beforeEach, describe, expect, it, vi } from 'vitest';
import Http from '@/utils/axios';
import { getGatewayProviders, getGatewayTaskObjects, registerGatewayProvider, verifyGatewayProvider } from '@/api/gateway-providers';

vi.mock('@/utils/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

const BACKEND_PROVIDER = {
    provider_id: 'ext-glm52',
    name: 'GLM-5.2',
    kind: 'model',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    protocol: 'openai_chat',
    harness: 'codex',
    key_credential_id: 'demo-cli',
    method: 'rest_api',
    status: 'verified',
    health: 'healthy',
    last_checked_at: '2026-08-05T16:20:00+08:00',
    last_error_code: null,
    verified_at: '2026-08-05T16:20:00+08:00',
    metrics: { tasks: 46, tokens_total: 32_400_000, trajectories: 41_000, cost_cny: 1286 },
};

const registrationPayload = (passed: boolean) => ({
    provider: { ...BACKEND_PROVIDER, status: passed ? 'verified' : 'unverified', health: passed ? 'healthy' : 'down', last_error_code: passed ? null : 'network_unreachable' },
    verification: passed
        ? { passed: true, failed_step: null, error_code: null, checked_at: '2026-09-20T10:00:00Z' }
        : { passed: false, failed_step: 'connectivity', error_code: 'network_unreachable', checked_at: '2026-09-20T10:00:00Z' },
});

const REGISTRATION_INPUT = {
    endpoint: 'https://agent.example.com/mcp',
    harness: 'codex' as const,
    keyCredentialId: 'cred_1',
    kind: 'agent' as const,
    method: 'rest_api' as const,
    name: 'RedBot-X',
    protocol: 'openai_responses' as const,
};

describe('gateway provider facade (live mode)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads and maps the provider registry', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { list: [BACKEND_PROVIDER] }, msg: '' });

        const result = await getGatewayProviders();

        expect(Http.get).toHaveBeenCalledWith('/api/v1/gateway/providers', { forbidMsg: true });
        expect(result.list).toEqual([
            {
                endpoint: 'https://open.bigmodel.cn/api/paas/v4',
                harness: 'codex',
                health: 'healthy',
                id: 'ext-glm52',
                keyCredentialId: 'demo-cli',
                kind: 'model',
                method: 'rest_api',
                lastCheckedAt: '2026-08-05T16:20:00+08:00',
                lastErrorCode: null,
                metrics: { costCny: 1286, tasks: 46, tokensTotal: 32_400_000, trajectories: 41_000 },
                name: 'GLM-5.2',
                protocol: 'openai_chat',
                status: 'verified',
                verifiedAt: '2026-08-05T16:20:00+08:00',
            },
        ]);
    });

    it('rejects malformed provider rows instead of rendering untrusted fields', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { list: [{ provider_id: 'only' }] }, msg: '' });

        await expect(getGatewayProviders()).rejects.toThrow('Invalid gateway provider response');
    });

    it('registers a provider and returns the embedded verification outcome', async () => {
        vi.mocked(Http.post).mockResolvedValue({ code: 0, data: registrationPayload(false), msg: '' });

        const result = await registerGatewayProvider(REGISTRATION_INPUT);

        expect(Http.post).toHaveBeenCalledWith('/api/v1/gateway/providers', {
            data: { endpoint: 'https://agent.example.com/mcp', harness: 'codex', key_credential_id: 'cred_1', kind: 'agent', method: 'rest_api', name: 'RedBot-X', protocol: 'openai_responses' },
            forbidMsg: true,
        });
        expect(result.verification).toMatchObject({ errorCode: 'network_unreachable', failedStep: 'connectivity', passed: false });
        expect(result.provider.status).toBe('unverified');
    });

    it('rejects invalid registration input before sending a request', async () => {
        await expect(registerGatewayProvider({ ...REGISTRATION_INPUT, name: '   ' })).rejects.toThrow('Provider name is invalid');
        await expect(registerGatewayProvider({ ...REGISTRATION_INPUT, endpoint: 'nope' })).rejects.toThrow('Provider endpoint is invalid');
        expect(Http.post).not.toHaveBeenCalled();
    });

    it('re-verifies a registered provider', async () => {
        vi.mocked(Http.post).mockResolvedValue({ code: 0, data: registrationPayload(true), msg: '' });

        const result = await verifyGatewayProvider('ext-glm52');

        expect(Http.post).toHaveBeenCalledWith('/api/v1/gateway/providers/ext-glm52/verify', { data: {}, forbidMsg: true });
        expect(result.verification.passed).toBe(true);
    });

    it('derives task candidates from the registry for the task wizard', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: { list: [BACKEND_PROVIDER, { ...BACKEND_PROVIDER, provider_id: 'ext-redbot', status: 'unverified', health: 'unknown' }] },
            msg: '',
        });

        const objects = await getGatewayTaskObjects();

        expect(objects).toEqual([{ harness: 'codex', id: 'ext-glm52', kind: 'model', name: 'GLM-5.2', protocol: 'openai_chat', verified: true }]);
    });
});
