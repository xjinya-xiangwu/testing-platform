import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuditLogs } from '@/api/audit-logs';
import Http from '@/utils/axios';

vi.mock('@/utils/axios', () => ({
    default: {
        get: vi.fn(),
    },
}));

const BACKEND_AUDIT_LOGS = {
    list: [
        {
            id: '1024',
            action: 'api_token.create',
            action_label: '创建接入密钥',
            summary: '创建接入密钥「CI流水线·夜间回归」',
            resource_type: 'api_token',
            resource_id: 'tok_8f3a',
            resource_name: 'CI流水线·夜间回归',
            result: 'success',
            status: 201,
            client_ip: '203.0.113.9',
            duration_ms: 42,
            request_id: 'b7e2d1a9',
            method: 'POST',
            path: '/api/v1/api-tokens',
            created_at: '2026-08-05T10:02:00Z',
        },
        {
            id: '1023',
            action: 'auth.sso_login',
            action_label: 'SSO 登录',
            summary: 'SSO 登录',
            resource_type: 'session',
            result: 'failure',
            status: 403,
            client_ip: '203.0.113.9',
            duration_ms: 130,
            request_id: 'a3f1c8d2',
            method: 'GET',
            path: '/api/v1/auth/callback',
            created_at: '2026-08-05T00:57:00Z',
        },
    ],
    page: { page: 2, page_size: 10, total: 24 },
};

describe('audit log facade', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads a requested page from the audit logs endpoint and exposes only renderable fields', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: BACKEND_AUDIT_LOGS, msg: '' });

        const result = await getAuditLogs({ page: 2, pageSize: 10 });

        expect(Http.get).toHaveBeenCalledWith('/api/v1/audit-logs', {
            params: { page: 2, page_size: 10 },
            forbidMsg: true,
        });
        expect(result).toEqual({
            list: [
                {
                    id: '1024',
                    summary: '创建接入密钥「CI流水线·夜间回归」',
                    result: 'success',
                    createdAt: '2026-08-05T10:02:00Z',
                },
                {
                    id: '1023',
                    summary: 'SSO 登录',
                    result: 'failure',
                    createdAt: '2026-08-05T00:57:00Z',
                },
            ],
            page: { page: 2, pageSize: 10, total: 24 },
        });
        expect(result.list[0].id).toBe('1024');
        expect(result.list[0]).not.toHaveProperty('clientIp');
        expect(result.list[0]).not.toHaveProperty('requestId');
        expect(result.list[0]).not.toHaveProperty('actionLabel');
    });

    it('accepts the documented empty list for a new user', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: { list: [], page: { page: 1, page_size: 10, total: 0 } }, msg: '' });

        await expect(getAuditLogs()).resolves.toEqual({ list: [], page: { page: 1, pageSize: 10, total: 0 } });
    });

    it('rejects malformed or unknown audit fields instead of rendering them', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: { list: [{ id: 1024, summary: '', result: 'unknown', created_at: 'not-a-date' }], page: { page: 1, page_size: 10, total: 1 } },
            msg: '',
        });

        await expect(getAuditLogs()).rejects.toThrow('Invalid audit log response');
    });

    it('rejects a response page larger than its declared page size', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: {
                list: Array.from({ length: 11 }, (_, index) => ({ ...BACKEND_AUDIT_LOGS.list[0], id: String(index + 1) })),
                page: { page: 1, page_size: 10, total: 11 },
            },
            msg: '',
        });

        await expect(getAuditLogs()).rejects.toThrow('Invalid audit log response');
    });

    it('turns a non-success business response into a query error', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 9999, data: null, msg: 'failed' });

        await expect(getAuditLogs()).rejects.toThrow('Audit log request failed');
    });

    it('rejects invalid pagination before sending a request', async () => {
        await expect(getAuditLogs({ page: 0, pageSize: 10 })).rejects.toThrow('Audit log pagination is invalid');
        expect(Http.get).not.toHaveBeenCalled();
    });
});
