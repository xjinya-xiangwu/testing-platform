export type GatewayProviderKind = 'agent' | 'model';
export type GatewayProtocol = 'anthropic_messages' | 'openai_chat' | 'openai_responses';
export type GatewayHarness = 'claude_code' | 'codex';
export type GatewayProviderStatus = 'unverified' | 'verified';
export type GatewayProviderHealth = 'degraded' | 'down' | 'healthy' | 'unknown';

// Categorized access-verification failures. Each code maps to the verification step it
// interrupts (see gateway-verification.ts) and carries its own remediation hint in the UI.
export type GatewayErrorCode = 'auth_failed' | 'cert_expired' | 'endpoint_invalid' | 'network_unreachable' | 'no_active_key' | 'protocol_mismatch';

export interface IGatewayProviderMetrics {
    costCny: number;
    tasks: number;
    tokensTotal: number;
    trajectories: number;
}

export interface IGatewayProvider {
    endpoint: string;
    harness: GatewayHarness;
    health: GatewayProviderHealth;
    id: string;
    keyCredentialId: string | null;
    kind: GatewayProviderKind;
    lastCheckedAt: string | null;
    lastErrorCode: GatewayErrorCode | null;
    metrics: IGatewayProviderMetrics;
    name: string;
    protocol: GatewayProtocol;
    status: GatewayProviderStatus;
    verifiedAt: string | null;
}

export interface IGatewayProviderInput {
    endpoint: string;
    harness: GatewayHarness;
    keyCredentialId: string | null;
    kind: GatewayProviderKind;
    name: string;
    protocol: GatewayProtocol;
}

export const GATEWAY_PROVIDER_KINDS: readonly GatewayProviderKind[] = ['model', 'agent'];
export const GATEWAY_PROTOCOLS: readonly GatewayProtocol[] = ['openai_responses', 'openai_chat', 'anthropic_messages'];
export const GATEWAY_HARNESSES: readonly GatewayHarness[] = ['codex', 'claude_code'];

export const GATEWAY_PROVIDER_NAME_MAX_LENGTH = 128;

const GATEWAY_ERROR_CODES: readonly GatewayErrorCode[] = ['auth_failed', 'cert_expired', 'endpoint_invalid', 'network_unreachable', 'no_active_key', 'protocol_mismatch'];

export const isGatewayErrorCode = (value: unknown): value is GatewayErrorCode => typeof value === 'string' && (GATEWAY_ERROR_CODES as readonly string[]).includes(value);

export const isGatewayProviderKind = (value: unknown): value is GatewayProviderKind => value === 'agent' || value === 'model';
export const isGatewayProtocol = (value: unknown): value is GatewayProtocol => value === 'anthropic_messages' || value === 'openai_chat' || value === 'openai_responses';
export const isGatewayHarness = (value: unknown): value is GatewayHarness => value === 'claude_code' || value === 'codex';

export const normalizeGatewayEndpoint = (value: string) => value.trim();

export const isGatewayEndpoint = (value: string): boolean => {
    try {
        const url = new URL(normalizeGatewayEndpoint(value));
        return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
    } catch {
        return false;
    }
};

export const validateGatewayProviderInput = (input: IGatewayProviderInput): void => {
    const name = input.name.trim();
    if (!name || name.length > GATEWAY_PROVIDER_NAME_MAX_LENGTH) throw new Error('Provider name is invalid');
    if (!isGatewayEndpoint(input.endpoint)) throw new Error('Provider endpoint is invalid');
    if (!isGatewayProviderKind(input.kind) || !isGatewayProtocol(input.protocol) || !isGatewayHarness(input.harness)) throw new Error('Provider integration profile is invalid');
};
