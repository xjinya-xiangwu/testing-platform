import { describe, expect, it, vi } from 'vitest';
import { matchRoutes } from 'react-router-dom';
import { APP_ROUTES } from '@/routes/routes';
import AuthenticatedAppLayout from '@/routes/authenticated-app-layout';
import { protectedRouteLoader } from '@/routes/auth-loader';
import Settings from '@/pages/settings/settings';
import Training from '@/pages/training/training';
import Gateway from '@/pages/gateway/gateway';
import DataCenter from '@/pages/data-center/data-center';

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, createBrowserRouter: vi.fn(() => ({})) };
});
vi.mock('@easycode/client-detector', () => ({
    detector: {
        sendClientInfo: vi.fn(),
        sendError2: vi.fn(),
    },
}));

vi.mock('@/routes/auth-loader', () => ({
    protectedRouteLoader: vi.fn(),
}));

describe('range routes', () => {
    it('keeps the application shell behind the router loader guard', () => {
        expect(APP_ROUTES[0].element).toEqual(<AuthenticatedAppLayout />);
        expect(APP_ROUTES[0].loader).toBe(protectedRouteLoader);
    });

    it.each(['/dashboard', '/tasks', '/training', '/data', '/range', '/range-hall', '/range-detail/SCN-01', '/gateway', '/settings', '/workbench', '/confirm'] as const)(
        'matches %s without falling through',
        (path) => {
            const matches = matchRoutes(APP_ROUTES, path);

            expect(matches?.at(-1)?.route.path).toBe(path === '/range-detail/SCN-01' ? 'range-detail/:envId' : path.slice(1));
        },
    );

    it('renders the real settings page instead of a placeholder', () => {
        const settingsRoute = matchRoutes(APP_ROUTES, '/settings')?.at(-1)?.route;

        expect(settingsRoute?.element).toEqual(<Settings />);
    });

    it.each(['/training', '/training-live'] as const)('renders the real training page at %s', (path) => {
        const trainingRoute = matchRoutes(APP_ROUTES, path)?.at(-1)?.route;

        expect(trainingRoute?.element).toEqual(<Training />);
    });

    it('renders the real data center instead of a placeholder', () => {
        const dataRoute = matchRoutes(APP_ROUTES, '/data')?.at(-1)?.route;

        expect(dataRoute?.element).toEqual(<DataCenter />);
    });
    it('renders the real gateway page at /gateway', () => {
        const gatewayRoute = matchRoutes(APP_ROUTES, '/gateway')?.at(-1)?.route;

        expect(gatewayRoute?.element).toEqual(<Gateway />);
    });
});
