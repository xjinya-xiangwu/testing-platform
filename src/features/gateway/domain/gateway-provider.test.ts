import { describe, expect, it } from 'vitest';
import { GATEWAY_HARNESSES, GATEWAY_PROVIDER_KINDS, GATEWAY_PROTOCOLS, isGatewayEndpoint, validateGatewayProviderInput } from '@/features/gateway/domain/gateway-provider';

describe('gateway provider domain', () => {
    it('accepts http and https endpoints with a hostname', () => {
        expect(isGatewayEndpoint('https://api.openai.com/v1')).toBe(true);
        expect(isGatewayEndpoint(' http://agent.customer.lab/mcp ')).toBe(true);
    });

    it('rejects endpoints without a usable url or hostname', () => {
        expect(isGatewayEndpoint('')).toBe(false);
        expect(isGatewayEndpoint('not-a-url')).toBe(false);
        expect(isGatewayEndpoint('ftp://agent.customer.lab')).toBe(false);
        expect(isGatewayEndpoint('https://')).toBe(false);
    });

    it('validates a well-formed registration input', () => {
        expect(() =>
            validateGatewayProviderInput({ endpoint: 'https://agent.customer.lab/mcp', harness: 'codex', keyCredentialId: 'cred_1', kind: 'agent', name: 'RedBot-X', protocol: 'openai_responses' }),
        ).not.toThrow();
    });

    it('rejects blank names, oversized names, and bad endpoints or profiles', () => {
        const base = { endpoint: 'https://agent.customer.lab/mcp', harness: 'codex' as const, keyCredentialId: null, kind: 'agent' as const, name: 'RedBot-X', protocol: 'openai_responses' as const };

        expect(() => validateGatewayProviderInput({ ...base, name: '   ' })).toThrow('Provider name is invalid');
        expect(() => validateGatewayProviderInput({ ...base, name: 'a'.repeat(129) })).toThrow('Provider name is invalid');
        expect(() => validateGatewayProviderInput({ ...base, endpoint: 'nope' })).toThrow('Provider endpoint is invalid');
        expect(() => validateGatewayProviderInput({ ...base, kind: 'sandbox' as never })).toThrow('Provider integration profile is invalid');
    });

    it('exposes the supported integration profiles', () => {
        expect(GATEWAY_PROVIDER_KINDS).toEqual(['model', 'agent']);
        expect(GATEWAY_PROTOCOLS).toEqual(['openai_responses', 'openai_chat', 'anthropic_messages']);
        expect(GATEWAY_HARNESSES).toEqual(['codex', 'claude_code']);
    });
});
