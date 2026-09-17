import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { getRangeEnvironmentDetail } from '@/api/range';
import RangeDetail from '@/pages/range-detail/range-detail';
import { resetTaskDraftStore, useTaskDraftStore } from '@/stores/task-draft-store';
import { getRangeEnvironmentFixture } from '@/test/fixtures/range';
import { renderRangePage } from '@/test/render-range-page';

vi.mock('@/api/range', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/range')>();
    return { ...actual, getRangeEnvironmentDetail: vi.fn() };
});

const renderDetail = (environmentId = 'SCN-01') =>
    renderRangePage(
        <Routes>
            <Route path="/range-detail/:envId" element={<RangeDetail />} />
            <Route path="/range-hall" element={<h1>range hall target</h1>} />
            <Route path="/tasks" element={<h1>task center target</h1>} />
        </Routes>,
        `/range-detail/${environmentId}`,
    );

describe('RangeDetail', () => {
    beforeEach(() => {
        vi.mocked(getRangeEnvironmentDetail).mockImplementation(async (environmentId) => getRangeEnvironmentFixture(environmentId));
        resetTaskDraftStore();
    });

    it('renders supported parameters without unavailable build or attack-chain metadata', async () => {
        renderDetail();

        expect(await screen.findByRole('heading', { name: 'ENT-0520 靶场' })).toBeInTheDocument();
        const parameters = screen.getByRole('table', { name: '环境参数' });
        expect(parameters).toHaveTextContent('场景编号');
        expect(parameters).toHaveTextContent('SCN-01');
        expect(parameters).toHaveTextContent('5 网区 / 20 节点');
        expect(parameters).toHaveTextContent('适配 Agent');
        expect(parameters).not.toHaveTextContent('镜像构成');
        expect(parameters).not.toHaveTextContent('预热与构建');
        expect(parameters).not.toHaveTextContent('攻击阶段链');
        const pageHeader = screen.getByRole('banner');
        expect(within(pageHeader).queryByText('企业内网')).not.toBeInTheDocument();
        expect(within(pageHeader).queryByText('真实接入')).not.toBeInTheDocument();
        expect(within(pageHeader).queryByText('可进入')).not.toBeInTheDocument();
    });

    it('renders the static topology and keeps node details available', async () => {
        const environment = getRangeEnvironmentFixture('SCN-01');
        vi.mocked(getRangeEnvironmentDetail).mockResolvedValue({
            ...environment,
            topology: {
                ...environment.topology,
                connections: [['wp', 'redis']],
                networkConnectors: [
                    {
                        id: 'pub-app-network',
                        label: 'pub_to_app_net',
                        sourceNodeId: 'wp',
                        sourceZoneId: 'pub',
                        targetZoneId: 'app',
                    },
                ],
                nodeZoneLinks: [{ id: 'wp-app', sourceNodeId: 'wp', targetZoneId: 'app' }],
                zoneEdges: [['pub', 'app']],
                zones: environment.topology.zones.map((zone) => (zone.id === 'pub' ? { ...zone, cidr: '10.10.0.0/24' } : zone)),
            },
        });
        renderDetail();

        expect(await screen.findByRole('group', { name: 'ENT-0520 靶场环境拓扑' })).toBeInTheDocument();
        expect(screen.queryByText('拓扑图区域预留')).not.toBeInTheDocument();
        expect(screen.queryByTestId('range-topology-node-zone-link')).not.toBeInTheDocument();
        expect(screen.getByTestId('range-topology-network-link')).toBeInTheDocument();
        expect(screen.getByTestId('range-topology-network-connector')).toHaveTextContent('pub_to_app_net');
        expect(screen.queryByTestId('range-topology-zone-connection')).not.toBeInTheDocument();
        expect(screen.queryByTestId('range-topology-connection')).not.toBeInTheDocument();
        expect(screen.getByText('A1 · 公网区')).toBeInTheDocument();
        expect(screen.queryByText('A1 · 10.10.0.0/24')).not.toBeInTheDocument();
        expect(screen.getAllByText(/个服务节点$/).length).toBeGreaterThan(0);
        const portalNode = screen.getByRole('button', { name: '查看企业门户网站节点详情' });
        expect(portalNode.querySelector('[data-testid="range-topology-node-card"]')).toBeInTheDocument();
        expect(portalNode.querySelector('[data-testid="range-topology-node-ip"]')).not.toBeInTheDocument();
        await userEvent.click(portalNode);
        expect(screen.getByRole('region', { name: '企业门户网站节点详情' })).toHaveTextContent('10.10.0.18');
    });

    it('keeps shared topology glyphs in the outer SVG coordinate system', async () => {
        renderDetail();

        const [node] = await screen.findAllByTestId('range-topology-node');
        const glyphContainer = node.querySelector(':scope > g[aria-hidden="true"]');

        expect(glyphContainer?.firstElementChild?.tagName.toLowerCase()).toBe('g');
        expect(glyphContainer?.querySelector(':scope > svg')).toBeNull();
    });

    it('prefills the task draft and carries it back to the wizard', async () => {
        renderDetail();
        await userEvent.click(await screen.findByRole('button', { name: '使用该环境创建任务' }));

        expect(screen.getByRole('heading', { name: 'task center target' })).toBeInTheDocument();
        expect(useTaskDraftStore.getState()).toMatchObject({ environmentId: 'corp', isOpen: true, taskType: 'range' });
    });

    it('shows a non-interactive placeholder and disables task creation for a pending environment', async () => {
        renderDetail('SCN-03');

        expect(await screen.findByRole('heading', { name: 'FIN-0418 靶场' })).toBeInTheDocument();
        expect(screen.getByText('场景接入中')).toBeInTheDocument();
        expect(screen.queryByRole('group', { name: /环境拓扑/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '使用该环境创建任务' })).toBeDisabled();
    });

    it('TC-NAV-004 returns to the range hall parent', async () => {
        renderDetail();
        await userEvent.click(await screen.findByRole('link', { name: '返回靶场大厅' }));

        expect(screen.getByRole('heading', { name: 'range hall target' })).toBeInTheDocument();
    });
});
