import { describe, expect, it } from 'vitest';
import { filterGatewaySessions, type IGatewaySession } from '@/features/gateway/domain/gateway-session';

const session = (overrides: Partial<IGatewaySession> = {}): IGatewaySession => ({
    costCny: 12.5,
    finishedAt: '2026-08-05T16:22:00+08:00',
    id: 'SES-20260805-21',
    kind: 'evaluation',
    providerId: 'ext-glm52',
    providerName: 'GLM-5.2',
    result: 'completed',
    resultSummary: '完成 · 综合 94.2',
    startedAt: '2026-08-05T16:22:00+08:00',
    steps: [{ at: '2026-08-05T16:22:00+08:00', kind: 'control', latencyMs: 210, seq: 1, summary: '会话建立' }],
    taskId: 'JOB-20260805-07',
    taskName: 'SCN-02 电网 · 漏利评测',
    tokensTotal: 3_240_000,
    turns: 88,
    ...overrides,
});

describe('gateway session domain', () => {
    it('returns every session for the unfiltered view', () => {
        const sessions = [session(), session({ id: 'SES-2', providerId: 'ext-gpt54', result: 'failed' })];
        expect(filterGatewaySessions(sessions, { providerId: null, result: 'all' })).toHaveLength(2);
    });

    it('filters by provider and result', () => {
        const sessions = [session(), session({ id: 'SES-2', providerId: 'ext-gpt54', result: 'failed' }), session({ id: 'SES-3', kind: 'verification', result: 'verification_failed' })];

        expect(filterGatewaySessions(sessions, { providerId: 'ext-gpt54', result: 'all' }).map((item) => item.id)).toEqual(['SES-2']);
        expect(filterGatewaySessions(sessions, { providerId: null, result: 'verification_failed' }).map((item) => item.id)).toEqual(['SES-3']);
    });
});
