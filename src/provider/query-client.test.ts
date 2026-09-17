import { describe, expect, it } from 'vitest';
import { queryClient } from '@/provider/query-client';

describe('queryClient', () => {
    it('uses application query defaults', () => {
        const queryDefaults = queryClient.getDefaultOptions().queries;

        expect(queryDefaults?.retry).toBe(1);
        expect(queryDefaults?.staleTime).toBe(5 * 60 * 1000);
        expect(queryDefaults?.refetchOnWindowFocus).toBe(false);
    });
});
