import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/app-layout/app-layout';
import { renderRangePage } from '@/test/render-range-page';

describe('AppLayout', () => {
    it('keeps the original compact navigation on the situational-awareness home page', () => {
        renderRangePage(
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route path="dashboard" element={<div>Dashboard outlet</div>} />
                </Route>
            </Routes>,
        );

        expect(screen.getByText('Dashboard outlet')).toBeInTheDocument();
        expect(screen.getByTestId('app-sidebar')).toHaveAttribute('data-variant', 'compact');
        expect(screen.queryByRole('button', { name: '展开导航' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '收起导航' })).not.toBeInTheDocument();
    });

    it('keeps inner-page navigation expanded', () => {
        renderRangePage(
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route path="tasks" element={<div>Tasks outlet</div>} />
                </Route>
            </Routes>,
            '/tasks?type=code',
        );

        expect(screen.getByTestId('app-sidebar')).toHaveAttribute('data-variant', 'expanded');
        expect(screen.getByText('Tasks outlet')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '代码评测' })).toHaveAttribute('aria-current', 'page');
    });

    it('renders the authenticated user returned by the route loader adapter', () => {
        renderRangePage(
            <Routes>
                <Route path="/" element={<AppLayout user={{ ssoUid: '0001234', username: '演练管理员' }} />}>
                    <Route path="tasks" element={<div>Tasks outlet</div>} />
                </Route>
            </Routes>,
            '/tasks?type=range',
        );

        expect(screen.getByText('演练管理员')).toBeInTheDocument();
    });

    it('keeps the original navigation frame with task-center subtabs and the existing operation center', () => {
        renderRangePage(
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route path="tasks" element={<div>Tasks outlet</div>} />
                </Route>
            </Routes>,
            '/tasks?type=code',
        );

        const navigation = within(screen.getByTestId('app-sidebar')).getByRole('navigation');
        expect(within(navigation).getByText('任务中心')).toBeInTheDocument();
        expect(within(navigation).getByText('操作中心')).toBeInTheDocument();

        const links = within(navigation).getAllByRole('link');
        expect(links.map((link) => link.textContent)).toEqual(['首页', '代码评测', '靶场评测', '数据中心', '靶场大厅', '接入网关', '用户设置']);
        expect(links.map((link) => link.getAttribute('href'))).toEqual(['/dashboard', '/tasks?type=code', '/tasks?type=range', '/data', '/range-hall', '/gateway', '/settings']);
        expect(within(navigation).queryByText('训练任务')).not.toBeInTheDocument();
    });

    it('activates only the selected evaluation task subtab', () => {
        renderRangePage(
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route path="tasks" element={<div>Tasks outlet</div>} />
                </Route>
            </Routes>,
            '/tasks?type=range',
        );

        expect(screen.getByRole('link', { name: '靶场评测' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: '代码评测' })).not.toHaveAttribute('aria-current');
    });
});
