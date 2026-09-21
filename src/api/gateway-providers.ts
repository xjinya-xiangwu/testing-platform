import { GATEWAY_PROVIDERS } from '@/config/cgi';
import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';
import { toGatewayCatalogObjects, type IGatewayCatalogObject } from '@/features/gateway/domain/gateway-catalog';
import {
    isGatewayEndpoint,
    isGatewayErrorCode,
    isGatewayHarness,
    isGatewayIntegrationMethod,
    isGatewayProviderKind,
    isGatewayProtocol,
    validateGatewayProviderInput,
    type GatewayErrorCode,
    type GatewayHarness,
    type GatewayIntegrationMethod,
    type GatewayProviderHealth,
    type IGatewayProviderInput,
    type GatewayProviderKind,
    type GatewayProviderStatus,
    type GatewayProtocol,
    type IGatewayProvider,
} from '@/features/gateway/domain/gateway-provider';
import { deriveVerificationProviderState, GATEWAY_VERIFICATION_STEPS, type GatewayVerificationStep, type IGatewayVerificationOutcome } from '@/features/gateway/domain/gateway-verification';
import { appendDemoGatewaySession } from '@/api/gateway-sessions';

export type { IGatewayCatalogObject };

export interface IGatewayProviderRegistry {
    list: readonly IGatewayProvider[];
}

export interface IGatewayProviderRegistration {
    provider: IGatewayProvider;
    verification: IGatewayVerificationOutcome;
}

export interface IRemovedGatewayProvider {
    providerId: string;
}

const PROVIDER_STATUSES: readonly GatewayProviderStatus[] = ['unverified', 'verified'];
const PROVIDER_HEALTH: readonly GatewayProviderHealth[] = ['degraded', 'down', 'healthy', 'unknown'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';

const parseGatewayMetrics = (value: unknown): IGatewayProvider['metrics'] => {
    if (!isRecord(value) || !isFiniteInteger(value.tasks) || !isFiniteInteger(value.tokens_total) || !isFiniteInteger(value.trajectories) || typeof value.cost_cny !== 'number' || value.cost_cny < 0) {
        throw new Error('Invalid gateway provider response');
    }
    return { costCny: value.cost_cny, tasks: value.tasks, tokensTotal: value.tokens_total, trajectories: value.trajectories };
};

const parseGatewayProvider = (value: unknown): IGatewayProvider => {
    if (
        !isRecord(value) ||
        typeof value.provider_id !== 'string' ||
        value.provider_id.length === 0 ||
        typeof value.name !== 'string' ||
        value.name.length === 0 ||
        !isGatewayProviderKind(value.kind) ||
        typeof value.endpoint !== 'string' ||
        !isGatewayEndpoint(value.endpoint) ||
        !isGatewayProtocol(value.protocol) ||
        !isGatewayHarness(value.harness) ||
        !isGatewayIntegrationMethod(value.method) ||
        !isNullableString(value.key_credential_id) ||
        !(PROVIDER_STATUSES as readonly string[]).includes(value.status as string) ||
        !(PROVIDER_HEALTH as readonly string[]).includes(value.health as string) ||
        !isNullableString(value.last_checked_at) ||
        !(value.last_error_code === null || isGatewayErrorCode(value.last_error_code)) ||
        !isNullableString(value.verified_at)
    ) {
        throw new Error('Invalid gateway provider response');
    }

    return {
        endpoint: value.endpoint,
        harness: value.harness,
        health: value.health as GatewayProviderHealth,
        id: value.provider_id,
        keyCredentialId: value.key_credential_id,
        kind: value.kind,
        lastCheckedAt: value.last_checked_at,
        lastErrorCode: value.last_error_code,
        method: value.method,
        metrics: parseGatewayMetrics(value.metrics),
        name: value.name,
        protocol: value.protocol,
        status: value.status as GatewayProviderStatus,
        verifiedAt: value.verified_at,
    };
};

const parseGatewayRegistry = (value: unknown): IGatewayProviderRegistry => {
    if (!isRecord(value) || !Array.isArray(value.list)) throw new Error('Invalid gateway provider response');
    return { list: value.list.map(parseGatewayProvider) };
};

const isVerificationStep = (value: unknown): value is GatewayVerificationStep => (GATEWAY_VERIFICATION_STEPS as readonly string[]).includes(value as string);

const parseVerificationOutcome = (value: unknown): IGatewayVerificationOutcome => {
    if (!isRecord(value) || typeof value.passed !== 'boolean' || typeof value.checked_at !== 'string') throw new Error('Invalid gateway verification response');
    const errorCodeValid = value.error_code === null || isGatewayErrorCode(value.error_code);
    const failedStepValid = value.failed_step === null || isVerificationStep(value.failed_step);
    if (!errorCodeValid || !failedStepValid) throw new Error('Invalid gateway verification response');
    if (value.passed && (value.error_code !== null || value.failed_step !== null)) throw new Error('Invalid gateway verification response');
    if (!value.passed && (value.error_code === null || value.failed_step === null)) throw new Error('Invalid gateway verification response');

    return {
        checkedAt: value.checked_at,
        errorCode: value.error_code as GatewayErrorCode | null,
        failedStep: value.failed_step as GatewayVerificationStep | null,
        passed: value.passed,
    };
};

const parseGatewayProviderRegistration = (value: unknown): IGatewayProviderRegistration => {
    if (!isRecord(value) || !isRecord(value.provider) || !isRecord(value.verification)) throw new Error('Invalid gateway verification response');
    return { provider: parseGatewayProvider(value.provider), verification: parseVerificationOutcome(value.verification) };
};

const parseRemovedGatewayProvider = (value: unknown): IRemovedGatewayProvider => {
    if (!isRecord(value) || typeof value.provider_id !== 'string' || value.provider_id.length === 0) throw new Error('Invalid gateway provider response');
    return { providerId: value.provider_id };
};

const DEMO_ZERO_METRICS = { costCny: 0, tasks: 0, tokensTotal: 0, trajectories: 0 } as const;

const DEMO_GATEWAY_PROVIDERS: readonly IGatewayProvider[] = [
    {
        endpoint: 'https://open.bigmodel.cn/api/paas/v4',
        harness: 'codex',
        health: 'healthy',
        id: 'ext-glm52',
        keyCredentialId: 'demo-cli',
        kind: 'model',
        lastCheckedAt: '2026-08-05T16:20:00+08:00',
        lastErrorCode: null,
        method: 'rest_api',
        metrics: { costCny: 1_286, tasks: 46, tokensTotal: 32_400_000, trajectories: 41_000 },
        name: 'GLM-5.2',
        protocol: 'openai_chat',
        status: 'verified',
        verifiedAt: '2026-08-05T16:20:00+08:00',
    },
    {
        endpoint: 'https://api.openai.com/v1',
        harness: 'codex',
        health: 'healthy',
        id: 'ext-gpt54',
        keyCredentialId: 'demo-ci',
        kind: 'model',
        lastCheckedAt: '2026-08-04T11:02:00+08:00',
        lastErrorCode: null,
        method: 'rest_api',
        metrics: { costCny: 1_904, tasks: 31, tokensTotal: 21_800_000, trajectories: 28_000 },
        name: 'GPT-5.4',
        protocol: 'openai_responses',
        status: 'verified',
        verifiedAt: '2026-08-04T11:02:00+08:00',
    },
    {
        endpoint: 'https://api.anthropic.com',
        harness: 'claude_code',
        health: 'healthy',
        id: 'ext-claude',
        keyCredentialId: 'demo-cli',
        kind: 'model',
        lastCheckedAt: '2026-08-03T09:44:00+08:00',
        lastErrorCode: null,
        method: 'rest_api',
        metrics: { costCny: 2_417, tasks: 58, tokensTotal: 46_200_000, trajectories: 56_000 },
        name: 'Claude-Opus-4.7',
        protocol: 'anthropic_messages',
        status: 'verified',
        verifiedAt: '2026-08-03T09:44:00+08:00',
    },
    {
        endpoint: 'https://agent.customer.lab/mcp',
        harness: 'codex',
        health: 'unknown',
        id: 'ext-redbot',
        keyCredentialId: null,
        kind: 'agent',
        lastCheckedAt: null,
        lastErrorCode: null,
        method: 'mcp',
        metrics: DEMO_ZERO_METRICS,
        name: 'RedBot-X',
        protocol: 'mcp',
        status: 'unverified',
        verifiedAt: null,
    },
];

let demoGatewayProviders: IGatewayProvider[] = DEMO_GATEWAY_PROVIDERS.map((provider) => ({ ...provider, metrics: { ...provider.metrics } }));

const cloneDemoProviders = () => demoGatewayProviders.map((provider) => ({ ...provider, metrics: { ...provider.metrics } }));

export const resetDemoGatewayProviders = (): void => {
    demoGatewayProviders = DEMO_GATEWAY_PROVIDERS.map((provider) => ({ ...provider, metrics: { ...provider.metrics } }));
};

const demoProviderId = () => `ext-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now().toString(36)}`;

// Deterministic demo heuristics so every failure class is reproducible without a
// backend: *.invalid hosts never answer, cert-expired.* presents an expired
// certificate, and an Anthropic-protocol call against bigmodel.cn speaks the wrong
// protocol. Everything else verifies.
const simulateDemoVerification = (endpoint: string, protocol: GatewayProtocol): IGatewayVerificationOutcome => {
    const checkedAt = new Date().toISOString();
    const fail = (errorCode: GatewayErrorCode): IGatewayVerificationOutcome => ({ checkedAt, errorCode, failedStep: errorCode === 'protocol_mismatch' ? 'protocol' : 'connectivity', passed: false });

    const { hostname } = new URL(endpoint);
    if (hostname.endsWith('.invalid')) return fail('network_unreachable');
    if (hostname.startsWith('cert-expired.')) return fail('cert_expired');
    if (protocol === 'anthropic_messages' && hostname.includes('bigmodel')) return fail('protocol_mismatch');
    return { checkedAt, errorCode: null, failedStep: null, passed: true };
};

const runDemoVerification = (input: IGatewayProviderInput, checkedAt: string): IGatewayVerificationOutcome => {
    if (!input.keyCredentialId) return { checkedAt, errorCode: 'no_active_key', failedStep: 'auth', passed: false };
    return simulateDemoVerification(input.endpoint, input.protocol);
};

const appendDemoVerificationSession = (provider: IGatewayProvider, verification: IGatewayVerificationOutcome): void => {
    const stamp = verification.checkedAt;
    appendDemoGatewaySession({
        costCny: 0,
        finishedAt: stamp,
        id: `SES-VERIFY-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now().toString(36)}`,
        kind: 'verification',
        providerId: provider.id,
        providerName: provider.name,
        result: verification.passed ? 'verified' : 'verification_failed',
        resultSummary: verification.passed ? '校验通过' : `校验失败 · ${verification.errorCode}`,
        startedAt: stamp,
        steps: [
            { at: stamp, kind: 'control', latencyMs: 120, seq: 1, summary: '密钥鉴权（API Key + mTLS）' },
            {
                at: stamp,
                kind: 'observation',
                latencyMs: 860,
                seq: 2,
                summary: verification.errorCode === 'no_active_key' ? '未绑定生效密钥 · 校验中止' : verification.passed ? '连通性探测 · 受限任务视图下发成功' : '连通性探测失败',
            },
            { at: stamp, kind: 'evidence', latencyMs: 40, seq: 3, summary: verification.passed ? '证据通道回传验证通过 · 写入注册表' : '校验中止 · 结果已记录' },
        ],
        taskId: `VERIFY-${provider.id}`,
        taskName: '接入校验 · 连通性探测',
        tokensTotal: 0,
        turns: verification.passed ? 6 : 2,
    });
};

const registerDemoGatewayProvider = (input: IGatewayProviderInput): IGatewayProviderRegistration => {
    validateGatewayProviderInput(input);
    const checkedAt = new Date().toISOString();
    const verification = runDemoVerification(input, checkedAt);
    const state = deriveVerificationProviderState(verification);
    const provider: IGatewayProvider = {
        ...input,
        health: state.health,
        id: demoProviderId(),
        lastCheckedAt: verification.checkedAt,
        lastErrorCode: verification.errorCode,
        metrics: { ...DEMO_ZERO_METRICS },
        status: state.status,
        verifiedAt: verification.passed ? verification.checkedAt : null,
    };
    demoGatewayProviders = [provider, ...demoGatewayProviders];
    appendDemoVerificationSession(provider, verification);
    return { provider: { ...provider, metrics: { ...provider.metrics } }, verification };
};

const verifyDemoGatewayProvider = (providerId: string): IGatewayProviderRegistration => {
    const normalizedId = providerId.trim();
    const provider = demoGatewayProviders.find((item) => item.id === normalizedId);
    if (!provider) throw new Error('Gateway provider not found');

    const checkedAt = new Date().toISOString();
    const verification = runDemoVerification(
        {
            endpoint: provider.endpoint,
            harness: provider.harness,
            keyCredentialId: provider.keyCredentialId,
            kind: provider.kind,
            method: provider.method,
            name: provider.name,
            protocol: provider.protocol,
        },
        checkedAt,
    );
    const state = deriveVerificationProviderState(verification);
    const updated: IGatewayProvider = {
        ...provider,
        health: state.health,
        lastCheckedAt: verification.checkedAt,
        lastErrorCode: verification.errorCode,
        metrics: { ...provider.metrics },
        status: state.status,
        verifiedAt: verification.passed ? verification.checkedAt : null,
    };
    demoGatewayProviders = demoGatewayProviders.map((item) => (item.id === normalizedId ? updated : item));
    appendDemoVerificationSession(updated, verification);
    return { provider: { ...updated }, verification };
};

const removeDemoGatewayProvider = (providerId: string): IRemovedGatewayProvider => {
    const normalizedId = providerId.trim();
    if (!demoGatewayProviders.some((item) => item.id === normalizedId)) throw new Error('Gateway provider not found');
    demoGatewayProviders = demoGatewayProviders.filter((item) => item.id !== normalizedId);
    return { providerId: normalizedId };
};

export const getGatewayProviders = async (): Promise<IGatewayProviderRegistry> => {
    if (IS_DEMO_MODE) return { list: cloneDemoProviders() };
    const response = await Http.get<Record<string, never>, unknown>(GATEWAY_PROVIDERS, { forbidMsg: true });
    if (response.code !== 0) throw new Error('Gateway provider request failed');
    return parseGatewayRegistry(response.data);
};

export const registerGatewayProvider = async (input: IGatewayProviderInput): Promise<IGatewayProviderRegistration> => {
    validateGatewayProviderInput(input);
    if (IS_DEMO_MODE) return registerDemoGatewayProvider(input);
    const response = await Http.post<
        { endpoint: string; harness: GatewayHarness; key_credential_id: string | null; kind: GatewayProviderKind; method: GatewayIntegrationMethod; name: string; protocol: GatewayProtocol },
        unknown
    >(GATEWAY_PROVIDERS, {
        data: {
            endpoint: input.endpoint.trim(),
            harness: input.harness,
            key_credential_id: input.keyCredentialId,
            kind: input.kind,
            method: input.method,
            name: input.name.trim(),
            protocol: input.protocol,
        },
        forbidMsg: true,
    });
    if (response.code !== 0) throw new Error('Gateway provider registration failed');
    return parseGatewayProviderRegistration(response.data);
};

export const verifyGatewayProvider = async (providerId: string): Promise<IGatewayProviderRegistration> => {
    const normalizedId = providerId.trim();
    if (!normalizedId) throw new Error('Gateway provider id is invalid');
    if (IS_DEMO_MODE) return verifyDemoGatewayProvider(normalizedId);
    const response = await Http.post<Record<string, never>, unknown>(`${GATEWAY_PROVIDERS}/${encodeURIComponent(normalizedId)}/verify`, { data: {}, forbidMsg: true });
    if (response.code !== 0) throw new Error('Gateway provider verification failed');
    return parseGatewayProviderRegistration(response.data);
};

export const removeGatewayProvider = async (providerId: string): Promise<IRemovedGatewayProvider> => {
    const normalizedId = providerId.trim();
    if (!normalizedId) throw new Error('Gateway provider id is invalid');
    if (IS_DEMO_MODE) return removeDemoGatewayProvider(normalizedId);
    const response = await Http.delete<Record<string, never>, unknown>(`${GATEWAY_PROVIDERS}/${encodeURIComponent(normalizedId)}`, { forbidMsg: true });
    if (response.code !== 0) throw new Error('Gateway provider removal failed');
    return parseRemovedGatewayProvider(response.data);
};

// Single-source bridge: the task wizard derives its external candidates from the
// provider registry in both demo and live mode.
export const getGatewayTaskObjects = async (): Promise<IGatewayCatalogObject[]> => {
    const registry = IS_DEMO_MODE ? { list: cloneDemoProviders() } : await getGatewayProviders();
    return toGatewayCatalogObjects(registry.list);
};
