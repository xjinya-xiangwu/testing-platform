import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { getRangeHallData } from '@/api/range';
import RangeHall from '@/pages/range-hall/range-hall';
import { resetTaskDraftStore, useTaskDraftStore } from '@/stores/task-draft-store';
import { createRangeHallFixture } from '@/test/fixtures/range';
import { renderRangePage } from '@/test/render-range-page';
import type { IRangeHallData } from '@/api/range';

vi.mock('@/api/range', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/range')>();
    return { ...actual, getRangeHallData: vi.fn() };
});

const renderHall = () =>
    renderRangePage(
        <Routes>
            <Route path="/range-hall" element={<RangeHall />} />
            <Route path="/range-detail/:envId" element={<h1>environment detail target</h1>} />
            <Route path="/tasks" element={<h1>task center target</h1>} />
        </Routes>,
        '/range-hall',
    );

const createBackendRangeHallFixture = (): IRangeHallData => {
    const fixture = createRangeHallFixture();
    const rangeIds = ['rng_range3', 'rng_range4', 'rng_range5', 'rng_range6'] as const;

    return {
        environments: fixture.environments.slice(0, rangeIds.length).map((environment, index) => ({
            ...environment,
            id: rangeIds[index],
            taskEnvironmentId: rangeIds[index],
            name: `Range${index + 3}`,
            description: '',
            imageProfile: 'should not be displayed',
            networkScale: String(23 - index),
            stages: ['should not be displayed'],
        })),
    };
};

describe('RangeHall', () => {
    beforeEach(() => {
        vi.mocked(getRangeHallData).mockImplementation(async () => createBackendRangeHallFixture());
        resetTaskDraftStore();
    });

    it('renders the four backend environments with their availability states', async () => {
        renderHall();

        expect(await screen.findByRole('heading', { name: '靶场大厅' })).toBeInTheDocument();
        const list = screen.getByRole('list', { name: '预设靶场环境' });
        const cards = within(list).getAllByRole('listitem');
        expect(cards).toHaveLength(4);
        expect(cards.map((card) => within(card).getByTestId('range-environment-id').textContent)).toEqual(['rng_range3', 'rng_range4', 'rng_range5', 'rng_range6']);

        expect(within(cards[0]).getByText('Range3')).toBeInTheDocument();
        expect(within(cards[2]).getByText('公网门户经应用服务与缓存数据库横向进入多网段业务区，覆盖安全检测与内容管理双路渗透。')).toBeInTheDocument();
        expect(within(cards[0]).getByText('可进入')).toBeInTheDocument();
        expect(within(cards[2]).getByText('待接入')).toBeInTheDocument();
        expect(screen.queryByLabelText('环境状态筛选')).not.toBeInTheDocument();
        expect(screen.queryByText(/1 套真实接入环境/)).not.toBeInTheDocument();
    });

    it('shows only the backend node count and a zero milestone placeholder', async () => {
        renderHall();
        const firstCard = within(await screen.findByRole('list', { name: '预设靶场环境' })).getAllByRole('listitem')[0];

        expect(within(firstCard).getByText('23')).toBeInTheDocument();
        expect(within(firstCard).getByText('网络规模')).toBeInTheDocument();
        expect(within(firstCard).getByText('里程碑')).toBeInTheDocument();
        expect(within(firstCard).getByText('0')).toBeInTheDocument();
        expect(within(firstCard).queryByText('镜像构成')).not.toBeInTheDocument();
        expect(within(firstCard).queryByText('攻击阶段链')).not.toBeInTheDocument();
        expect(within(firstCard).queryByText('should not be displayed')).not.toBeInTheDocument();
    });

    it('only exposes the two effective card actions and gates pending environments', async () => {
        renderHall();
        const cards = within(await screen.findByRole('list', { name: '预设靶场环境' })).getAllByRole('listitem');

        cards.forEach((card) => {
            expect(within(card).getAllByRole('button')).toHaveLength(2);
            expect(within(card).getByRole('button', { name: '使用该环境创建任务' })).toBeInTheDocument();
            expect(within(card).getByRole('button', { name: '查看环境详情' })).toBeInTheDocument();
        });
        expect(within(cards[0]).getByRole('button', { name: '使用该环境创建任务' })).toBeEnabled();
        expect(within(cards[2]).getByRole('button', { name: '使用该环境创建任务' })).toBeDisabled();
        expect(screen.queryByText('常驻靶场环境')).not.toBeInTheDocument();
        expect(screen.queryByText('漏洞环境库')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /进入控制台|进入环境|发起评测/ })).not.toBeInTheDocument();
    });

    it('opens the selected environment detail route', async () => {
        renderHall();
        const firstCard = within(await screen.findByRole('list', { name: '预设靶场环境' })).getAllByRole('listitem')[0];

        await userEvent.click(within(firstCard).getByRole('button', { name: '查看环境详情' }));

        expect(screen.getByRole('heading', { name: 'environment detail target' })).toBeInTheDocument();
    });

    it('prefills an available environment when creating a task from the hall', async () => {
        renderHall();
        const firstCard = within(await screen.findByRole('list', { name: '预设靶场环境' })).getAllByRole('listitem')[0];

        await userEvent.click(within(firstCard).getByRole('button', { name: '使用该环境创建任务' }));

        expect(screen.getByRole('heading', { name: 'task center target' })).toBeInTheDocument();
        expect(useTaskDraftStore.getState()).toMatchObject({ environmentId: 'rng_range3', isOpen: true, taskType: 'range' });
    });

    it('opens a fresh task wizard from the page header', async () => {
        renderHall();

        await userEvent.click(await screen.findByRole('button', { name: '新建测试任务' }));

        expect(screen.getByRole('heading', { name: 'task center target' })).toBeInTheDocument();
        expect(useTaskDraftStore.getState()).toMatchObject({ isOpen: true, step: 1 });
    });

    it('TC-NAV-005 returns to the task center parent', async () => {
        renderHall();
        await userEvent.click(await screen.findByRole('link', { name: '返回测试任务' }));

        expect(screen.getByRole('heading', { name: 'task center target' })).toBeInTheDocument();
    });
});
