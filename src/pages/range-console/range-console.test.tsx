import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { getRangeHallData } from '@/api/range';
import RangeConsole from '@/pages/range-console/range-console';
import { createRangeHallFixture } from '@/test/fixtures/range';
import { renderRangePage } from '@/test/render-range-page';

vi.mock('@/api/range', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/range')>();
    return { ...actual, getRangeHallData: vi.fn() };
});

const renderConsole = () =>
    renderRangePage(
        <Routes>
            <Route path="/range" element={<RangeConsole />} />
            <Route path="/range-hall" element={<h1>range hall target</h1>} />
        </Routes>,
        '/range',
    );

describe('RangeConsole', () => {
    beforeEach(() => {
        vi.mocked(getRangeHallData).mockImplementation(async () => createRangeHallFixture());
    });

    it('provides the real console entry with attack-chain and environment telemetry', async () => {
        renderConsole();

        expect(await screen.findByRole('heading', { name: '靶场控制台' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: '攻击链阶段' })).toHaveTextContent('侦察探测');
        expect(screen.getByRole('region', { name: '攻击链阶段' })).toHaveTextContent('目标达成');
        expect(screen.getByRole('region', { name: '环境仿真参数' })).toHaveTextContent('在线节点');
    });

    it('switches the running scene and renders a dynamic topology for it', async () => {
        renderConsole();
        await screen.findByRole('heading', { name: '靶场控制台' });
        await userEvent.click(screen.getByRole('tab', { name: 'ENG-0416 靶场' }));

        expect(screen.getByRole('tab', { name: 'ENG-0416 靶场' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('img', { name: 'ENG-0416 靶场环境拓扑' }).tagName.toLowerCase()).toBe('svg');
    });

    it('opens dynamic topology node details from the console', async () => {
        renderConsole();
        await screen.findByRole('heading', { name: '靶场控制台' });
        await userEvent.click(screen.getByRole('button', { name: '查看企业门户网站节点详情' }));

        const details = screen.getByRole('region', { name: '企业门户网站节点详情' });
        expect(details).toHaveTextContent('10.10.0.18');
        expect(details).toHaveTextContent('CVE-2024-8353');
    });

    it('returns to the range hall', async () => {
        renderConsole();
        await userEvent.click(await screen.findByRole('link', { name: '返回靶场大厅' }));

        expect(screen.getByRole('heading', { name: 'range hall target' })).toBeInTheDocument();
    });
});
