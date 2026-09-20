import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/demo-mode', () => ({ IS_DEMO_MODE: true }));

import { getGatewayProviders, getGatewayTaskObjects, registerGatewayProvider, removeGatewayProvider, resetDemoGatewayProviders, verifyGatewayProvider } from '@/api/gateway-providers';
import { getGatewaySessions, resetDemoGatewaySessions } from '@/api/gateway-sessions';

const GOOD_INPUT = {
    endpoint: 'https://agent.example.com/mcp',
    harness: 'codex' as const,
    keyCredentialId: 'demo-cli',
    kind: 'agent' as const,
    name: 'RedBot-X',
    protocol: 'openai_responses' as const,
};

describe('gateway demo registry', () => {
    beforeEach(() => {
        resetDemoGatewayProviders();
        resetDemoGatewaySessions();
    });

    it('seeds the registry with verified external models and one unverified agent', async () => {
        const registry = await getGatewayProviders();

        expect(registry.list.map((provider) => provider.id)).toEqual(['ext-glm52', 'ext-gpt54', 'ext-claude', 'ext-redbot']);
        expect(registry.list.filter((provider) => provider.status === 'verified')).toHaveLength(3);
        expect(registry.list.find((provider) => provider.id === 'ext-redbot')).toMatchObject({ status: 'unverified', health: 'unknown', keyCredentialId: null });
    });

    it('registers a provider, verifies it, and exposes it as a task candidate', async () => {
        const { provider, verification } = await registerGatewayProvider(GOOD_INPUT);

        expect(verification.passed).toBe(true);
        expect(provider.status).toBe('verified');
        expect(provider.id).not.toBe('ext-redbot');

        const objects = await getGatewayTaskObjects();
        expect(objects.map((object) => object.id)).toContain(provider.id);

        const sessions = await getGatewaySessions({ providerId: provider.id, result: 'verified' });
        expect(sessions.list).toHaveLength(1);
        expect(sessions.list[0]).toMatchObject({ kind: 'verification', providerName: 'RedBot-X', result: 'verified' });
    });

    it('fails verification with a categorized network error for unreachable hosts', async () => {
        const { provider, verification } = await registerGatewayProvider({ ...GOOD_INPUT, endpoint: 'https://agent.invalid/mcp' });

        expect(verification).toMatchObject({ errorCode: 'network_unreachable', failedStep: 'connectivity', passed: false });
        expect(provider).toMatchObject({ status: 'unverified', health: 'down', lastErrorCode: 'network_unreachable' });

        const objects = await getGatewayTaskObjects();
        expect(objects.map((object) => object.id)).not.toContain(provider.id);
    });

    it('fails authentication when registering without an active key binding', async () => {
        const { provider, verification } = await registerGatewayProvider({ ...GOOD_INPUT, keyCredentialId: null });

        expect(verification).toMatchObject({ errorCode: 'no_active_key', failedStep: 'auth', passed: false });
        expect(provider.status).toBe('unverified');
    });

    it('reproduces certificate expiry and protocol mismatch failures', async () => {
        const expired = await registerGatewayProvider({ ...GOOD_INPUT, endpoint: 'https://cert-expired.agent.example.com' });
        const mismatched = await registerGatewayProvider({ ...GOOD_INPUT, endpoint: 'https://open.bigmodel.cn/api/paas/v4', protocol: 'anthropic_messages' });

        expect(expired.verification).toMatchObject({ errorCode: 'cert_expired', failedStep: 'connectivity', passed: false });
        expect(mismatched.verification).toMatchObject({ errorCode: 'protocol_mismatch', failedStep: 'protocol', passed: false });
    });

    it('keeps re-verification deterministic for a failing endpoint', async () => {
        const registered = await registerGatewayProvider({ ...GOOD_INPUT, endpoint: 'https://agent.invalid/mcp' });
        const reverified = await verifyGatewayProvider(registered.provider.id);

        expect(reverified.verification).toMatchObject({ errorCode: 'network_unreachable', passed: false });
        expect((await getGatewaySessions({ providerId: registered.provider.id, result: 'all' })).list).toHaveLength(2);
    });

    it('removes a provider from the registry', async () => {
        await removeGatewayProvider('ext-glm52');

        const registry = await getGatewayProviders();
        expect(registry.list.map((provider) => provider.id)).not.toContain('ext-glm52');
        await expect(removeGatewayProvider('ext-glm52')).rejects.toThrow('Gateway provider not found');
    });
});
