import Home from '@/pages/home/home';
import { Navigate, RouteObject, createBrowserRouter } from 'react-router-dom';
import Dashboard from '@/pages/dashboard/dashboard';
import Tasks from '@/pages/tasks/tasks';
import RangeConsole from '@/pages/range-console/range-console';
import RangeDetail from '@/pages/range-detail/range-detail';
import RangeHall from '@/pages/range-hall/range-hall';
import DataCenter from '@/pages/data-center/data-center';
import Workbench from '@/pages/workbench/workbench';
import Settings from '@/pages/settings/settings';
import Training from '@/pages/training/training';
import Gateway from '@/pages/gateway/gateway';
import { protectedRouteLoader } from '@/routes/auth-loader';
import AuthenticatedAppLayout from '@/routes/authenticated-app-layout';

export const APP_ROUTES: RouteObject[] = [
    {
        path: '/',
        element: <AuthenticatedAppLayout />,
        loader: protectedRouteLoader,
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: 'dashboard',
                element: <Dashboard />,
            },
            {
                path: 'tasks',
                element: <Tasks />,
            },
            {
                path: 'range',
                element: <RangeConsole />,
            },
            {
                path: 'range-hall',
                element: <RangeHall />,
            },
            {
                path: 'range-detail/:envId',
                element: <RangeDetail />,
            },
            {
                path: 'workbench',
                element: <Workbench />,
            },
            {
                path: 'training',
                element: <Training />,
            },
            {
                path: 'training-live',
                element: <Training />,
            },
            {
                path: 'data',
                element: <DataCenter />,
            },
            {
                path: 'gateway',
                element: <Gateway />,
            },
            {
                path: 'settings',
                element: <Settings />,
            },
            {
                path: 'confirm',
                element: <Tasks />,
            },
        ],
    },
    {
        path: '/login',
        element: <Home />,
    },
    {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
    },
];

const router = createBrowserRouter(APP_ROUTES, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });

export default router;
