import { GATEWAY_SESSIONS } from '@/config/cgi';
import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';
import {
    filterGatewaySessions,
    isGatewaySessionResult,
    type GatewaySessionKind,
    type GatewaySessionResult,
    type GatewaySessionStepKind,
    type IGatewaySession,
    type IGatewaySessionFilter,
    type IGatewaySessionStep,
} from '@/features/gateway/domain/gateway-session';

export type { GatewaySessionResult };

export interface IGatewaySessionQuery {
    providerId: string | null;
    result: GatewaySessionResult | 'all';
}

const SESSION_KINDS: readonly GatewaySessionKind[] = ['evaluation', 'verification'];
const SESSION_STEP_KINDS: readonly GatewaySessionStepKind[] = ['action', 'control', 'evidence', 'observation'];
const MAX_SESSION_STEPS = 200;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';

const parseSessionStep = (value: unknown): IGatewaySessionStep => {
    if (
        !isRecord(value) ||
        !isFiniteInteger(value.seq) ||
        !isNonEmptyString(typeof value.kind === 'string' ? value.kind : '') ||
        !(SESSION_STEP_KINDS as readonly string[]).includes(value.kind as string) ||
        !isNonEmptyString(value.summary) ||
        !isNonEmptyString(value.at) ||
        (value.latency_ms !== null && !isFiniteInteger(value.latency_ms))
    ) {
        throw new Error('Invalid gateway session response');
    }

    return {
        at: value.at,
        kind: value.kind as GatewaySessionStepKind,
        latencyMs: typeof value.latency_ms === 'number' ? value.latency_ms : null,
        seq: value.seq,
        summary: value.summary,
    };
};

const parseGatewaySession = (value: unknown): IGatewaySession => {
    if (
        !isRecord(value) ||
        !isNonEmptyString(value.session_id) ||
        !isNonEmptyString(value.provider_id) ||
        !isNonEmptyString(value.provider_name) ||
        !(SESSION_KINDS as readonly string[]).includes(value.kind as string) ||
        !isNonEmptyString(value.task_id) ||
        !isNonEmptyString(value.task_name) ||
        !isGatewaySessionResult(value.result) ||
        value.result === 'all' ||
        !isNonEmptyString(value.result_summary) ||
        !isNonEmptyString(value.started_at) ||
        !isNullableString(value.finished_at) ||
        !isFiniteInteger(value.turns) ||
        !isFiniteInteger(value.tokens_total) ||
        typeof value.cost_cny !== 'number' ||
        value.cost_cny < 0 ||
        !Array.isArray(value.steps) ||
        value.steps.length > MAX_SESSION_STEPS
    ) {
        throw new Error('Invalid gateway session response');
    }

    return {
        costCny: value.cost_cny,
        finishedAt: typeof value.finished_at === 'string' ? value.finished_at : null,
        id: value.session_id,
        kind: value.kind as GatewaySessionKind,
        providerId: value.provider_id,
        providerName: value.provider_name,
        result: value.result,
        resultSummary: value.result_summary,
        startedAt: value.started_at,
        steps: value.steps.map(parseSessionStep),
        taskId: value.task_id,
        taskName: value.task_name,
        tokensTotal: value.tokens_total,
        turns: value.turns,
    };
};

const parseGatewaySessionList = (value: unknown): { list: readonly IGatewaySession[] } => {
    if (!isRecord(value) || !Array.isArray(value.list)) throw new Error('Invalid gateway session response');
    return { list: value.list.map(parseGatewaySession) };
};

const DEMO_SESSION_STEPS: IGatewaySessionStep[] = [
    { at: '2026-08-05T16:22:00+08:00', kind: 'control', latencyMs: 210, seq: 1, summary: '会话建立 · 密钥鉴权通过 · 受限任务视图下发' },
    { at: '2026-08-05T16:23:10+08:00', kind: 'action', latencyMs: 1_840, seq: 2, summary: '决策 VM 下发动作 · 工具执行 VM 沙箱内运行' },
    { at: '2026-08-05T16:23:12+08:00', kind: 'observation', latencyMs: null, seq: 3, summary: 'action / observation 循环 · Token 计量实时记录' },
    { at: '2026-08-05T16:40:02+08:00', kind: 'evidence', latencyMs: 96, seq: 4, summary: '带外证据采集 · 快照封存 · 哈希验签通过' },
];

const DEMO_GATEWAY_SESSIONS: readonly IGatewaySession[] = [
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
        steps: DEMO_SESSION_STEPS,
        taskId: 'JOB-20260805-07',
        taskName: 'SCN-02 电网 · 漏利评测',
        tokensTotal: 3_240_000,
        turns: 88,
    },
    {
        costCny: 268.4,
        finishedAt: '2026-08-05T14:36:00+08:00',
        id: 'SES-20260805-18',
        kind: 'evaluation',
        providerId: 'ext-gpt54',
        providerName: 'GPT-5.4',
        result: 'completed',
        resultSummary: '完成 · 综合 58.6',
        startedAt: '2026-08-05T14:07:00+08:00',
        steps: DEMO_SESSION_STEPS.map((step) => ({ ...step, at: '2026-08-05T14:07:00+08:00' })),
        taskId: 'JOB-20260805-03',
        taskName: 'ExploitGym t3 · 纯代码评测',
        tokensTotal: 2_180_000,
        turns: 64,
    },
    {
        costCny: 512.2,
        finishedAt: '2026-08-04T12:10:00+08:00',
        id: 'SES-20260804-33',
        kind: 'evaluation',
        providerId: 'ext-claude',
        providerName: 'Claude-Opus-4.7',
        result: 'completed',
        resultSummary: '完成 · 综合 92.0',
        startedAt: '2026-08-04T11:26:00+08:00',
        steps: DEMO_SESSION_STEPS.map((step) => ({ ...step, at: '2026-08-04T11:26:00+08:00' })),
        taskId: 'JOB-20260804-11',
        taskName: 'SCN-02 · 渗透',
        tokensTotal: 4_620_000,
        turns: 112,
    },
    {
        costCny: 3.1,
        finishedAt: '2026-08-04T09:16:00+08:00',
        id: 'SES-20260804-19',
        kind: 'verification',
        providerId: 'ext-glm52',
        providerName: 'GLM-5.2',
        result: 'verified',
        resultSummary: '校验通过',
        startedAt: '2026-08-04T09:15:00+08:00',
        steps: DEMO_SESSION_STEPS.slice(0, 2).map((step) => ({ ...step, at: '2026-08-04T09:15:00+08:00' })),
        taskId: 'VERIFY-ext-glm52',
        taskName: '接入校验 · 连通性探测',
        tokensTotal: 18_400,
        turns: 6,
    },
    {
        costCny: 0.8,
        finishedAt: '2026-08-03T17:41:00+08:00',
        id: 'SES-20260803-27',
        kind: 'verification',
        providerId: 'ext-redbot',
        providerName: 'RedBot-X',
        result: 'verification_failed',
        resultSummary: '校验失败 · 证书过期',
        startedAt: '2026-08-03T17:40:00+08:00',
        steps: DEMO_SESSION_STEPS.slice(0, 2).map((step) => ({ ...step, at: '2026-08-03T17:40:00+08:00' })),
        taskId: 'VERIFY-ext-redbot',
        taskName: '接入校验 · 连通性探测',
        tokensTotal: 9_200,
        turns: 2,
    },
];

let demoGatewaySessions: IGatewaySession[] = DEMO_GATEWAY_SESSIONS.map((session) => ({
    ...session,
    steps: session.steps.map((step) => ({ ...step })),
}));

const cloneDemoSessions = () => demoGatewaySessions.map((session) => ({ ...session, steps: session.steps.map((step) => ({ ...step })) }));

// Appends a gateway-produced session (verification runs) to the demo store so the
// sessions view reflects every verification attempt made in the registry.
export const appendDemoGatewaySession = (session: IGatewaySession): void => {
    demoGatewaySessions = [{ ...session, steps: session.steps.map((step) => ({ ...step })) }, ...demoGatewaySessions];
};

export const resetDemoGatewaySessions = (): void => {
    demoGatewaySessions = DEMO_GATEWAY_SESSIONS.map((session) => ({ ...session, steps: session.steps.map((step) => ({ ...step })) }));
};

export const getGatewaySessions = async (query: IGatewaySessionFilter = { providerId: null, result: 'all' }): Promise<{ list: readonly IGatewaySession[] }> => {
    if (IS_DEMO_MODE) return { list: filterGatewaySessions(cloneDemoSessions(), query) };

    const response = await Http.get<{ provider_id?: string; result?: string }, unknown>(GATEWAY_SESSIONS, {
        params: { ...(query.providerId ? { provider_id: query.providerId } : {}), result: query.result },
        forbidMsg: true,
    });
    if (response.code !== 0) throw new Error('Gateway session request failed');
    return parseGatewaySessionList(response.data);
};
