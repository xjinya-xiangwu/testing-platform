import { beforeEach, describe, expect, it, vi } from 'vitest';
import Http from '@/utils/axios';
import { getGatewaySessions } from '@/api/gateway-sessions';

vi.mock('@/utils/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

const BACKEND_SESSION = {
    session_id: 'SES-20260805-21',
    provider_id: 'ext-glm52',
    provider_name: 'GLM-5.2',
    kind: 'evaluation',
    task_id: 'JOB-20260805-07',
    task_name: 'SCN-02 电网 · 漏利评测',
    result: 'completed',
    result_summary: '完成 · 综合 94.2',
    started_at: '2026-08-05T16:22:00+08:00',
    finished_at: '2026-08-05T17:02:00+08:00',
    turns: 88,
    tokens_total: 3_240_000,
    cost_cny: 412.6,
    steps: [{ seq: 1, kind: 'control', summary: '会话建立', at: '2026-08-05T16:22:00+08:00', latency_ms: 210 }],
};

describe('gateway session facade (live mode)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads sessions and forwards filters as query params', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { list: [BACKEND_SESSION] }, msg: '' });

        const result = await getGatewaySessions({ providerId: 'ext-glm52', result: 'completed' });

        expect(Http.get).toHaveBeenCalledWith('/api/v1/gateway/sessions', { params: { provider_id: 'ext-glm52', result: 'completed' }, forbidMsg: true });
        expect(result.list[0]).toMatchObject({
            finishedAt: '2026-08-05T17:02:00+08:00',
            id: 'SES-20260805-21',
            providerName: 'GLM-5.2',
            resultSummary: '完成 · 综合 94.2',
            steps: [{ kind: 'control', latencyMs: 210, seq: 1, summary: '会话建立' }],
            turns: 88,
        });
    });

    it('omits the provider param for the unfiltered view', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { list: [] }, msg: '' });

        await getGatewaySessions({ providerId: null, result: 'all' });

        expect(Http.get).toHaveBeenCalledWith('/api/v1/gateway/sessions', { params: { result: 'all' }, forbidMsg: true });
    });

    it('rejects malformed session data', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { list: [{ session_id: 'only' }] }, msg: '' });

        await expect(getGatewaySessions()).rejects.toThrow('Invalid gateway session response');
    });

    it('turns a non-success business response into an error', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 9999, data: null, msg: 'failed' });

        await expect(getGatewaySessions()).rejects.toThrow('Gateway session request failed');
    });
});
