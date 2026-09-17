import { isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { matchRoutes } from 'react-router-dom';
import RangeConsole from '@/pages/range-console/range-console';
import RangeDetail from '@/pages/range-detail/range-detail';
import RangeHall from '@/pages/range-hall/range-hall';
import { APP_ROUTES } from '@/routes/routes';

vi.mock('@/routes/auth-loader', () => ({
    protectedRouteLoader: vi.fn(),
}));

describe('Prompt 07 route contract', () => {
    it.each([
        ['/range-hall', 'range-hall', RangeHall],
        ['/range-detail/SCN-01', 'range-detail/:envId', RangeDetail],
        ['/range', 'range', RangeConsole],
    ] as const)('mounts the real page for %s', (url, routePath, component) => {
        const leaf = matchRoutes(APP_ROUTES, url)?.at(-1)?.route;

        expect(leaf?.path).toBe(routePath);
        expect(isValidElement(leaf?.element) ? leaf.element.type : null).toBe(component);
    });
});
