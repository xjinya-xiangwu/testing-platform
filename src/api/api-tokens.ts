import { API_TOKENS } from '@/config/cgi';
import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';

export type ApiTokenStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
export type ApiTokenPurpose = 'adversarial' | 'evaluation' | 'training';

export interface IApiToken {
    credentialId: string;
    name: string;
    keyPrefix: string;
    purpose?: ApiTokenPurpose;
    status: ApiTokenStatus;
    expiresAt: string;
    createdAt: string;
    revokedAt?: string;
}

export interface IApiTokenPage {
    list: readonly IApiToken[];
    page: {
        page: number;
        pageSize: number;
        total: number;
    };
}

export interface ICreatedApiToken extends IApiToken {
    token: string;
}

export interface IRevokedApiToken {
    credentialId: string;
    status: 'REVOKED';
    revokedAt: string;
}

interface IApiTokenQuery {
    page?: number;
    pageSize?: number;
}

const API_TOKEN_STATUSES = new Set<ApiTokenStatus>(['ACTIVE', 'EXPIRED', 'REVOKED']);
const API_TOKEN_PURPOSES: readonly ApiTokenPurpose[] = ['adversarial', 'evaluation', 'training'];
const API_TOKEN_PREFIX_LENGTH = 8;
const API_TOKEN_NAME_MAX_LENGTH = 128;
const DEMO_API_TOKENS: readonly IApiToken[] = [
    { credentialId: 'demo-cli', name: 'CLI 接入凭证', keyPrefix: 'sk-demo1', purpose: 'evaluation', status: 'ACTIVE', expiresAt: '2027-09-16T00:00:00Z', createdAt: '2026-09-10T02:30:00Z' },
    { credentialId: 'demo-ci', name: '评测流水线凭证', keyPrefix: 'sk-demo2', purpose: 'training', status: 'ACTIVE', expiresAt: '2027-09-16T00:00:00Z', createdAt: '2026-09-12T06:15:00Z' },
];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isApiTokenStatus = (value: unknown): value is ApiTokenStatus => typeof value === 'string' && API_TOKEN_STATUSES.has(value as ApiTokenStatus);
const isApiTokenPurpose = (value: unknown): value is ApiTokenPurpose => typeof value === 'string' && (API_TOKEN_PURPOSES as readonly string[]).includes(value);

const parseApiToken = (value: unknown): IApiToken => {
    if (
        !isRecord(value) ||
        typeof value.credential_id !== 'string' ||
        typeof value.name !== 'string' ||
        typeof value.key_prefix !== 'string' ||
        !isApiTokenStatus(value.status) ||
        typeof value.expires_at !== 'string' ||
        typeof value.created_at !== 'string' ||
        (value.revoked_at !== undefined && typeof value.revoked_at !== 'string') ||
        (value.purpose !== undefined && !isApiTokenPurpose(value.purpose))
    ) {
        throw new Error('Invalid API token response');
    }

    return {
        credentialId: value.credential_id,
        name: value.name,
        keyPrefix: value.key_prefix.slice(0, API_TOKEN_PREFIX_LENGTH),
        status: value.status,
        expiresAt: value.expires_at,
        createdAt: value.created_at,
        ...(isApiTokenPurpose(value.purpose) ? { purpose: value.purpose } : {}),
        ...(typeof value.revoked_at === 'string' ? { revokedAt: value.revoked_at } : {}),
    };
};

const parseApiTokenPage = (value: unknown): IApiTokenPage => {
    if (!isRecord(value) || !Array.isArray(value.list) || !isRecord(value.page)) throw new Error('Invalid API token response');
    if (!isFiniteInteger(value.page.page) || !isFiniteInteger(value.page.page_size) || !isFiniteInteger(value.page.total)) throw new Error('Invalid API token response');

    return {
        list: value.list.map(parseApiToken),
        page: {
            page: value.page.page,
            pageSize: value.page.page_size,
            total: value.page.total,
        },
    };
};

const parseCreatedApiToken = (value: unknown): ICreatedApiToken => {
    if (!isRecord(value) || typeof value.token !== 'string' || value.token.length === 0) {
        throw new Error('Invalid API token creation response');
    }

    return {
        ...parseApiToken(value),
        token: value.token,
    };
};

const parseRevokedApiToken = (value: unknown): IRevokedApiToken => {
    if (!isRecord(value) || typeof value.credential_id !== 'string' || value.status !== 'REVOKED' || typeof value.revoked_at !== 'string') {
        throw new Error('Invalid API token revoke response');
    }

    return {
        credentialId: value.credential_id,
        status: value.status,
        revokedAt: value.revoked_at,
    };
};

export const getApiTokens = async ({ page = 1, pageSize = 20 }: IApiTokenQuery = {}): Promise<IApiTokenPage> => {
    if (IS_DEMO_MODE) return { list: DEMO_API_TOKENS.map((token) => ({ ...token })), page: { page, pageSize, total: DEMO_API_TOKENS.length } };
    const response = await Http.get<{ page: number; page_size: number }, unknown>(API_TOKENS, {
        params: { page, page_size: pageSize },
        forbidMsg: true,
    });
    if (response.code !== 0) throw new Error('API token request failed');
    return parseApiTokenPage(response.data);
};

export interface ICreateApiTokenInput {
    name: string;
    purpose?: ApiTokenPurpose;
}

export const createApiToken = async ({ name, purpose }: ICreateApiTokenInput): Promise<ICreatedApiToken> => {
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    if (!normalizedName || normalizedName.length > API_TOKEN_NAME_MAX_LENGTH) throw new Error('Token name is invalid');
    if (purpose !== undefined && !isApiTokenPurpose(purpose)) throw new Error('Token purpose is invalid');

    if (IS_DEMO_MODE) {
        return {
            credentialId: 'demo-created',
            name: normalizedName,
            keyPrefix: 'sk-demo3',
            purpose: purpose ?? 'evaluation',
            status: 'ACTIVE',
            expiresAt: '2027-09-16T00:00:00Z',
            createdAt: new Date().toISOString(),
            token: 'sk-demo-not-a-real-secret',
        };
    }

    const response = await Http.post<{ name: string; purpose?: ApiTokenPurpose }, unknown>(API_TOKENS, {
        data: { name: normalizedName, ...(purpose ? { purpose } : {}) },
        forbidMsg: true,
    });
    if (response.code !== 0) throw new Error('API token creation failed');
    return parseCreatedApiToken(response.data);
};

export const revokeApiToken = async (credentialId: string): Promise<IRevokedApiToken> => {
    if (IS_DEMO_MODE) {
        const normalizedCredentialId = typeof credentialId === 'string' ? credentialId.trim() : '';
        if (!normalizedCredentialId) throw new Error('Credential ID is invalid');
        return { credentialId: normalizedCredentialId, status: 'REVOKED', revokedAt: new Date().toISOString() };
    }
    const normalizedCredentialId = typeof credentialId === 'string' ? credentialId.trim() : '';
    if (!normalizedCredentialId) throw new Error('Credential ID is invalid');

    const response = await Http.post<Record<string, never>, unknown>(`${API_TOKENS}/${encodeURIComponent(normalizedCredentialId)}/revoke`, {
        data: {},
        forbidMsg: true,
    });
    if (response.code !== 0) throw new Error('API token revoke failed');
    return parseRevokedApiToken(response.data);
};
