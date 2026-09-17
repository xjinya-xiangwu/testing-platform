import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRangeTopology } from '@/api/range';
import { createWorkbenchAttackPlaybackSchedule } from '@/pages/workbench/components/workbench-attack-playback';
import { parseTopology } from '@/features/topology/domain/validate-topology';
import { projectWorkbenchTopology } from '@/features/topology/layout/workbench-topology-projection';
import WorkbenchTopology from '@/pages/workbench/components/workbench-topology';
import { createJobDetailFixture } from '@/test/fixtures/job-detail';
import { renderRangePage } from '@/test/render-range-page';
import type { IRangeTopology, IRangeTopologyAttackPath } from '@/api/range';
import range3Source from '../../../../public/data/topology/range3.json';

const matchMedia = (matches: boolean) =>
    vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches,
        media: '(prefers-reduced-motion: reduce)',
        removeEventListener: vi.fn(),
    });

const getFixtureTopology = () => {
    const topology = createJobDetailFixture().topology;
    if (!isRangeTopology(topology)) throw new Error('Workbench topology fixture is required');
    return topology;
};

const renderTopology = (topology: IRangeTopology) => renderRangePage(<WorkbenchTopology environmentName="Arbitrary range" topology={topology} />);

const getActiveAttackPath = () => screen.getByTestId('workbench-topology-attack-path');

describe('WorkbenchTopology attack-path playback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('matchMedia', matchMedia(false));
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('builds a moving arrow and reveal marker from arbitrary attack-path data', () => {
        const topology = getFixtureTopology();
        const attackPaths: readonly IRangeTopologyAttackPath[] = [{ id: 'custom-alpha-route', nodeIds: ['app', 'redis', 'av'] }];

        renderTopology({ ...topology, attackPath: [], attackPaths });

        const activePath = getActiveAttackPath();
        const reveal = activePath.querySelector('animate[attributeName="stroke-dashoffset"]');
        const arrow = screen.getByTestId('workbench-topology-attack-arrow');
        const arrowMotion = arrow.querySelector('animateMotion');
        const routeReference = arrowMotion?.querySelector('mpath');

        expect(activePath).toHaveAttribute('data-path-id', 'custom-alpha-route');
        expect(activePath).toHaveAttribute('data-edge-id', 'app->redis');
        expect(activePath).toHaveAttribute('pathLength', '100');
        expect(activePath).toHaveAttribute('stroke-dasharray', '100');
        expect(activePath).toHaveAttribute('stroke-dashoffset', '100');
        expect(reveal).not.toBeNull();
        expect(arrowMotion).not.toBeNull();
        expect(routeReference).toHaveAttribute('href', `#${activePath.id}`);
    });

    it('renders no attack animation when neither attackPaths nor a legacy attackPath is configured', () => {
        const topology = getFixtureTopology();

        renderTopology({ ...topology, attackPath: [], attackPaths: undefined });

        expect(screen.getByTestId('workbench-topology-canvas')).toHaveAttribute('data-attack-path-count', '0');
        expect(screen.queryByTestId('workbench-topology-attack-path')).not.toBeInTheDocument();
        expect(screen.queryByTestId('workbench-topology-attack-arrow')).not.toBeInTheDocument();
        expect(screen.queryByTestId('workbench-topology-attack-orb')).not.toBeInTheDocument();
    });

    it('keeps shared topology glyphs in the outer SVG coordinate system', () => {
        renderTopology(getFixtureTopology());

        const [node] = screen.getAllByTestId('workbench-topology-node');
        const glyphContainer = node.querySelector(':scope > g[aria-hidden="true"]');

        expect(glyphContainer?.firstElementChild?.tagName.toLowerCase()).toBe('g');
        expect(glyphContainer?.querySelector(':scope > svg')).toBeNull();
    });

    it('renders Range3 transit networks as independent connector cards', () => {
        renderTopology(projectWorkbenchTopology(parseTopology(range3Source)));

        const connectorIds = screen.getAllByTestId('workbench-topology-network-connector').map((element) => element.getAttribute('data-network-id'));
        const nodeIds = screen.getAllByTestId('workbench-topology-node').map((element) => element.getAttribute('data-node-id'));
        const networkEdgeIds = screen.getAllByTestId('workbench-topology-network-edge').map((element) => element.getAttribute('data-edge-id'));
        expect(connectorIds).toContain('react_dubbo');
        expect(nodeIds).not.toContain('react_dubbo');
        expect(networkEdgeIds).toEqual(expect.arrayContaining(['react_dubbo:source:react', 'react_dubbo:target:dubbo', 'react_dubbo:target:zookeeper']));
    });

    it('plays two attack paths in order and loops back to the first path', () => {
        const topology = getFixtureTopology();
        const attackPaths = topology.attackPaths ?? [];
        const schedule = createWorkbenchAttackPlaybackSchedule(attackPaths);
        const secondPathStart = schedule.paths[1].startAtMs;

        renderTopology(topology);

        const canvas = screen.getByTestId('workbench-topology-canvas');
        expect(canvas).toHaveAttribute('data-active-attack-path', attackPaths[0].id);
        expect(getActiveAttackPath()).toHaveAttribute('data-edge-id', 'attacker->wp');

        act(() => vi.advanceTimersByTime(secondPathStart));

        expect(canvas).toHaveAttribute('data-active-attack-path', attackPaths[1].id);
        expect(getActiveAttackPath()).toHaveAttribute('data-path-id', attackPaths[1].id);
        expect(getActiveAttackPath()).toHaveAttribute('data-edge-id', 'attacker->wp');

        act(() => vi.advanceTimersByTime(schedule.cycleDurationMs - secondPathStart));

        expect(canvas).toHaveAttribute('data-active-attack-path', attackPaths[0].id);
        expect(getActiveAttackPath()).toHaveAttribute('data-path-id', attackPaths[0].id);
        expect(getActiveAttackPath()).toHaveAttribute('data-edge-id', 'attacker->wp');
    });
});
