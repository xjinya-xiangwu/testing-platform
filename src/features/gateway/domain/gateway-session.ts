export type GatewaySessionKind = 'evaluation' | 'verification';
export type GatewaySessionResult = 'completed' | 'failed' | 'verification_failed' | 'verified';
export type GatewaySessionStepKind = 'action' | 'control' | 'evidence' | 'observation';

export interface IGatewaySessionStep {
    at: string;
    kind: GatewaySessionStepKind;
    latencyMs: number | null;
    seq: number;
    summary: string;
}

export interface IGatewaySession {
    costCny: number;
    finishedAt: string | null;
    id: string;
    kind: GatewaySessionKind;
    providerId: string;
    providerName: string;
    result: GatewaySessionResult;
    resultSummary: string;
    startedAt: string;
    steps: IGatewaySessionStep[];
    taskId: string;
    taskName: string;
    tokensTotal: number;
    turns: number;
}

export interface IGatewaySessionFilter {
    providerId: string | null;
    result: GatewaySessionResult | 'all';
}

export const GATEWAY_SESSION_RESULTS: readonly (GatewaySessionResult | 'all')[] = ['all', 'completed', 'failed', 'verified', 'verification_failed'];

export const isGatewaySessionResult = (value: unknown): value is GatewaySessionResult | 'all' => (GATEWAY_SESSION_RESULTS as readonly string[]).includes(value as string);

export const filterGatewaySessions = (sessions: readonly IGatewaySession[], filter: IGatewaySessionFilter): IGatewaySession[] =>
    sessions.filter((session) => (filter.providerId ? session.providerId === filter.providerId : true) && (filter.result === 'all' ? true : session.result === filter.result));
