import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Outlet, Route, Routes } from 'react-router-dom';
import DataCenter from '@/pages/data-center/data-center';
import { renderRangePage } from '@/test/render-range-page';

describe('DataCenter', () => {
    it('shows users only published and authorized datasets', () => {
        renderRangePage(
            <Routes>
                <Route path="data" element={<DataCenter />} />
            </Routes>,
            '/data',
        );

        expect(screen.getByRole('heading', { name: '数据中心' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '数据集管理' })).toBeInTheDocument();
        expect(screen.getByText('自建 Web 漏洞利用集')).toBeInTheDocument();
        expect(screen.queryByText('内部题库草稿')).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '管理员题库操作' })).not.toBeInTheDocument();
    });

    it('shows the question-bank controls only for administrators', () => {
        renderRangePage(
            <Routes>
                <Route path="/" element={<Outlet context={{ ssoUid: 'admin', status: 'ADMIN' }} />}>
                    <Route path="data" element={<DataCenter />} />
                </Route>
            </Routes>,
            '/data',
        );

        const catalog = screen.getByRole('region', { name: '题库管理' });
        expect(within(catalog).getByText('内部题库草稿')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '管理员题库操作' })).toBeInTheDocument();
        expect(screen.getByText('管理员 · 题库管理')).toBeInTheDocument();
    });
});
