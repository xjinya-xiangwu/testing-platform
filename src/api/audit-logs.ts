import { AUDIT_LOGS } from '@/config/cgi';
import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';

export type AuditLogResult = 'success' | 'failure';

export interface IAuditLog {
    id: string;
    summary: string;
    result: AuditLogResult;
    createdAt: string;
}

export interface IAuditLogPage {
    list: IAuditLog[];
    page: {
        page: number;
        pageSize: number;
        total: number;
    };
}

export interface IAuditLogQuery {
    page?: number;
    pageSize?: number;
}

const AUDIT_LOG_RESULTS = new Set<AuditLogResult>(['success', 'failure']);
const DEFAULT_AUDIT_LOG_PAGE_SIZE = 10;
const MAX_AUDIT_LOG_PAGE_SIZE = 100;
const DEMO_AUDIT_LOGS: readonly IAuditLog[] = [
    { id: 'demo-audit-1', summary: '进入中心化评测态势感知', result: 'success', createdAt: '2026-09-16T05:55:00Z' },
    { id: 'demo-audit-2', summary: '查看代码评测任务', result: 'success', createdAt: '2026-09-16T05:50:00Z' },
    { id: 'demo-audit-3', summary: '外部 Agent 完成连通性校验', result: 'success', createdAt: '2026-09-16T05:42:00Z' },
];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNonNegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value: unknown): value is number => isNonNegativeInteger(value) && value > 0;
const isAuditLogResult = (value: unknown): value is AuditLogResult => typeof value === 'string' && AUDIT_LOG_RESULTS.has(value as AuditLogResult);
const isValidDateTime = (value: string) => !Number.isNaN(new Date(value).getTime());

const parseAuditLog = (value: unknown): IAuditLog => {
    if (
        !isRecord(value) ||
        !isNonEmptyString(value.id) ||
        !isNonEmptyString(value.summary) ||
        !isAuditLogResult(value.result) ||
        !isNonEmptyString(value.created_at) ||
        !isValidDateTime(value.created_at)
    ) {
        throw new Error('Invalid audit log response');
    }

    return {
        id: value.id,
        summary: value.summary,
        result: value.result,
        createdAt: value.created_at,
    };
};

const parseAuditLogPage = (value: unknown, requestedPageSize: number): IAuditLogPage => {
    if (
        !isRecord(value) ||
        !Array.isArray(value.list) ||
        !isRecord(value.page) ||
        !isPositiveInteger(value.page.page) ||
        !isPositiveInteger(value.page.page_size) ||
        !isNonNegativeInteger(value.page.total) ||
        value.list.length > value.page.page_size ||
        value.list.length > requestedPageSize ||
        value.list.length > value.page.total
    ) {
        throw new Error('Invalid audit log response');
    }

    return {
        list: value.list.map(parseAuditLog),
        page: {
            page: value.page.page,
            pageSize: value.page.page_size,
            total: value.page.total,
        },
    };
};

export const getAuditLogs = async ({ page = 1, pageSize = DEFAULT_AUDIT_LOG_PAGE_SIZE }: IAuditLogQuery = {}): Promise<IAuditLogPage> => {
    if (!isPositiveInteger(page) || !isPositiveInteger(pageSize) || pageSize > MAX_AUDIT_LOG_PAGE_SIZE) throw new Error('Audit log pagination is invalid');
    if (IS_DEMO_MODE) {
        const start = (page - 1) * pageSize;
        return { list: DEMO_AUDIT_LOGS.slice(start, start + pageSize).map((log) => ({ ...log })), page: { page, pageSize, total: DEMO_AUDIT_LOGS.length } };
    }

    const response = await Http.get<{ page: number; page_size: number }, unknown>(AUDIT_LOGS, {
        params: { page, page_size: pageSize },
        forbidMsg: true,
    });
    if (response.code !== 0) throw new Error('Audit log request failed');
    return parseAuditLogPage(response.data, pageSize);
};
