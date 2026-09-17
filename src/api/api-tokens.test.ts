import { beforeEach, describe, expect, it, vi } from 'vitest';
import Http from '@/utils/axios';
import { createApiToken, getApiTokens, revokeApiToken } from '@/api/api-tokens';

vi.mock('@/utils/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

const BACKEND_PAGE = {
    list: [
        {
            credential_id: 'cred_01M9G4T7XR2Z',
            name: 'CLI 接入凭证',
            key_prefix: 'sk-mock',
            status: 'ACTIVE',
            expires_at: '2027-08-18T03:00:00Z',
            created_at: '2026-08-18T03:00:00Z',
        },
        {
            credential_id: 'cred_revoked',
            name: '历史凭证',
            key_prefix: 'sk-old12',
            status: 'REVOKED',
            expires_at: '2027-01-08T03:00:00Z',
            created_at: '2026-01-08T03:00:00Z',
            revoked_at: '2026-08-18T05:00:00Z',
        },
    ],
    page: { page: 1, page_size: 20, total: 2 },
};

describe('API token facade', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads and maps the documented API token list without exposing a plaintext token', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: BACKEND_PAGE, msg: '' });

        const result = await getApiTokens();

        expect(result).toEqual({
            list: [
                {
                    credentialId: 'cred_01M9G4T7XR2Z',
                    name: 'CLI 接入凭证',
                    keyPrefix: 'sk-mock',
                    status: 'ACTIVE',
                    expiresAt: '2027-08-18T03:00:00Z',
                    createdAt: '2026-08-18T03:00:00Z',
                },
                {
                    credentialId: 'cred_revoked',
                    name: '历史凭证',
                    keyPrefix: 'sk-old12',
                    status: 'REVOKED',
                    expiresAt: '2027-01-08T03:00:00Z',
                    createdAt: '2026-01-08T03:00:00Z',
                    revokedAt: '2026-08-18T05:00:00Z',
                },
            ],
            page: { page: 1, pageSize: 20, total: 2 },
        });
        expect(Http.get).toHaveBeenCalledWith('/api/v1/api-tokens', {
            params: { page: 1, page_size: 20 },
            forbidMsg: true,
        });
        expect(JSON.stringify(result)).not.toContain('"token"');
    });

    it('bounds the displayed key prefix even if the backend accidentally returns a plaintext-shaped value', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: {
                list: [{ ...BACKEND_PAGE.list[0], key_prefix: 'sk-plaintext-secret-that-must-not-render' }],
                page: { page: 1, page_size: 20, total: 1 },
            },
            msg: '',
        });

        const result = await getApiTokens();

        expect(result.list[0].keyPrefix).toBe('sk-plain');
        expect(JSON.stringify(result)).not.toContain('plaintext-secret');
    });

    it('rejects malformed token data instead of rendering untrusted fields', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: { list: [{ credential_id: 'cred_only' }], page: { page: 1, page_size: 20, total: 1 } },
            msg: '',
        });

        await expect(getApiTokens()).rejects.toThrow('Invalid API token response');
    });

    it('turns a non-success business response into a query error', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 9999, data: null, msg: 'failed' });

        await expect(getApiTokens()).rejects.toThrow('API token request failed');
    });

    it('creates a token and exposes its plaintext only in the creation result', async () => {
        vi.mocked(Http.post).mockResolvedValue({
            code: 0,
            data: {
                ...BACKEND_PAGE.list[0],
                token: 'sk-mock-one-time-secret',
            },
            msg: '',
        });

        const result = await createApiToken('  CLI 接入凭证  ');

        expect(Http.post).toHaveBeenCalledWith('/api/v1/api-tokens', {
            data: { name: 'CLI 接入凭证' },
            forbidMsg: true,
        });
        expect(result).toMatchObject({ credentialId: 'cred_01M9G4T7XR2Z', token: 'sk-mock-one-time-secret' });
    });

    it('rejects an invalid token name before sending a request', async () => {
        await expect(createApiToken('   ')).rejects.toThrow('Token name is invalid');
        expect(Http.post).not.toHaveBeenCalled();
    });

    it('rejects a creation response without the one-time plaintext token', async () => {
        vi.mocked(Http.post).mockResolvedValue({ code: 0, data: BACKEND_PAGE.list[0], msg: '' });

        await expect(createApiToken('CLI 接入凭证')).rejects.toThrow('Invalid API token creation response');
    });

    it('revokes an encoded credential id and maps the result', async () => {
        vi.mocked(Http.post).mockResolvedValue({
            code: 0,
            data: { credential_id: 'cred/id', status: 'REVOKED', revoked_at: '2026-08-18T05:00:00Z' },
            msg: '',
        });

        await expect(revokeApiToken(' cred/id ')).resolves.toEqual({ credentialId: 'cred/id', status: 'REVOKED', revokedAt: '2026-08-18T05:00:00Z' });
        expect(Http.post).toHaveBeenCalledWith('/api/v1/api-tokens/cred%2Fid/revoke', { data: {}, forbidMsg: true });
    });

    it('rejects malformed mutation responses', async () => {
        vi.mocked(Http.post).mockResolvedValue({ code: 0, data: { status: 'ACTIVE' }, msg: '' });

        await expect(revokeApiToken('cred_invalid')).rejects.toThrow('Invalid API token revoke response');
    });

    it('rejects an invalid credential id before sending a request', async () => {
        await expect(revokeApiToken('   ')).rejects.toThrow('Credential ID is invalid');
        expect(Http.post).not.toHaveBeenCalled();
    });
});
