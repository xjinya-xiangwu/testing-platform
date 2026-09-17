import type { RefObject } from 'react';
import { useInfiniteScroll } from 'ahooks';
import { getAuditLogs, type IAuditLogPage } from '@/api/audit-logs';

export const AUDIT_LOG_PAGE_SIZE = 10;

export const useAuditLogs = (language: string, target: RefObject<HTMLElement>) =>
    useInfiniteScroll<IAuditLogPage>(
        (currentData) =>
            getAuditLogs({
                page: (currentData?.page.page ?? 0) + 1,
                pageSize: AUDIT_LOG_PAGE_SIZE,
            }),
        {
            target,
            threshold: 80,
            reloadDeps: [language],
            isNoMore: (data) => Boolean(data && (data.list.length >= data.page.total || data.page.page * data.page.pageSize >= data.page.total)),
        },
    );
