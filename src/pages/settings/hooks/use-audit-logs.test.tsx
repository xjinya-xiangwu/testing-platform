import { renderHook } from '@testing-library/react';
import { useInfiniteScroll } from 'ahooks';
import { describe, expect, it, vi } from 'vitest';
import { getAuditLogs } from '@/api/audit-logs';
import { AUDIT_LOG_PAGE_SIZE, useAuditLogs } from '@/pages/settings/hooks/use-audit-logs';

vi.mock('ahooks', () => ({
    useInfiniteScroll: vi.fn(),
}));

vi.mock('@/api/audit-logs', () => ({
    getAuditLogs: vi.fn(),
}));

describe('useAuditLogs', () => {
    it('uses ahooks infinite scroll against the internal target', async () => {
        const targetRef = { current: document.createElement('div') };
        vi.mocked(useInfiniteScroll).mockReturnValue({
            data: undefined,
            loading: false,
            loadingMore: false,
            error: undefined,
            noMore: false,
            loadMore: vi.fn(),
            loadMoreAsync: vi.fn(),
            reload: vi.fn(),
            reloadAsync: vi.fn(),
            mutate: vi.fn(),
            cancel: vi.fn(),
        });

        renderHook(() => useAuditLogs('zh-CN', targetRef));

        expect(useInfiniteScroll).toHaveBeenCalledWith(expect.any(Function), {
            target: targetRef,
            isNoMore: expect.any(Function),
            reloadDeps: ['zh-CN'],
            threshold: 80,
        });

        const [service, options] = vi.mocked(useInfiniteScroll).mock.calls[0];
        await service();
        await service({ list: [{ id: '1024', summary: 'SSO 登录', result: 'success', createdAt: '2026-08-05T00:57:00Z' }], page: { page: 1, pageSize: AUDIT_LOG_PAGE_SIZE, total: 24 } });

        expect(getAuditLogs).toHaveBeenNthCalledWith(1, { page: 1, pageSize: AUDIT_LOG_PAGE_SIZE });
        expect(getAuditLogs).toHaveBeenNthCalledWith(2, { page: 2, pageSize: AUDIT_LOG_PAGE_SIZE });
        expect(options?.isNoMore?.({ list: Array.from({ length: 24 }), page: { page: 3, pageSize: AUDIT_LOG_PAGE_SIZE, total: 24 } })).toBe(true);
    });
});
