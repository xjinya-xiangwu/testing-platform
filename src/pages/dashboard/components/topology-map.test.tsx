import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTACK_CYCLE_MS, ATTACK_PLAYBACK_STEPS, buildAttackDashedReveal, getAttackAnimationDurationMs } from '@/features/topology/playback/attack-playback';
import { getDashboardRange3View } from '@/features/topology/layout/dashboard-range3-layout';
import { parseTopology } from '@/features/topology/domain/validate-topology';
import TopologyMap from '@/pages/dashboard/components/topology-map';
import { LocaleMessages } from '@/locale';
import { ZH } from '@/locale/zh';
import topologySource from '../../../../public/data/topology/range3.json';

const chartLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-charts.module.less'), 'utf8');
const topology = parseTopology(topologySource);
const view = getDashboardRange3View(topology);
const messages: LocaleMessages = ZH;
const translate = (key: string) => messages[key] ?? key;

type AttackState = 'idle' | 'active' | 'complete' | 'hit' | 'compromised';

const stubReducedMotion = (matches: boolean) => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({
            matches,
            media: '(prefers-reduced-motion: reduce)',
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }),
    );
};

const getSegment = (segmentId: string) => {
    const segment = screen.getAllByTestId('topology-attack-segment').find((candidate) => candidate.getAttribute('data-segment-id') === segmentId);
    expect(segment, `Expected attack segment ${segmentId} to be rendered`).toBeDefined();
    return segment as HTMLElement;
};

const getNode = (nodeId: string) => {
    const node = screen.getAllByTestId('topology-node').find((candidate) => candidate.getAttribute('data-node-id') === nodeId);
    expect(node, `Expected topology node ${nodeId} to be rendered`).toBeDefined();
    return node as HTMLElement;
};

const expectAttackState = (element: HTMLElement, state: AttackState) => {
    expect(element).toHaveAttribute('data-attack-state', state);
};

const expectOnlyActiveSegment = (segmentId?: string) => {
    const activeIds = screen
        .getAllByTestId('topology-attack-segment')
        .filter((segment) => segment.getAttribute('data-attack-state') === 'active')
        .map((segment) => segment.getAttribute('data-segment-id'));
    expect(activeIds).toEqual(segmentId ? [segmentId] : []);
};

const advancePlaybackBy = (milliseconds: number) => {
    act(() => vi.advanceTimersByTime(milliseconds));
};

const extractLessRule = (selector: string) => {
    const rule = chartLess.match(new RegExp(`\\.${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'i'))?.[1];
    expect(rule, `Expected .${selector} Less rule`).toBeDefined();
    return rule as string;
};

describe('TopologyMap', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        stubReducedMotion(false);
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('renders the real Range 3 entities, product zones, and data-derived attack path', () => {
        render(<TopologyMap view={view} translate={translate} />);

        expect(screen.getByRole('img', { name: 'Range 3 实时攻防拓扑' })).toBeInTheDocument();
        expect(screen.getAllByTestId('topology-node')).toHaveLength(24);
        expect(screen.getAllByTestId('topology-zone')).toHaveLength(6);
        expect(screen.getAllByTestId('topology-attack-segment')).toHaveLength(6);
        ['公网接入区', '业务应用区', 'GIS服务区', 'GIS数据区', '运维监控区', '监控数据区'].forEach((zone) => {
            expect(screen.getByText(zone)).toBeInTheDocument();
        });
        ['React应用', 'Dubbo服务', 'GeoServer', 'PostgreSQL', 'Cacti平台', 'Neo4j', 'External Attacker'].forEach((node) => {
            expect(screen.getByText(node)).toBeInTheDocument();
        });
    });

    it('centers the fixed demo canvas by its visible topology field', () => {
        render(<TopologyMap view={view} translate={translate} />);

        const mapRule = extractLessRule('topologyMap');
        expect(mapRule).toMatch(/width:\s*1192px/i);
        expect(mapRule).toMatch(/height:\s*760px/i);
        expect(mapRule).toMatch(/flex:\s*0 0 1192px/i);
        expect(mapRule).toMatch(/transform:\s*translateX\(62\.5px\)/i);
    });

    it('keeps the demo SVG connection plane above the HTML zone cards', () => {
        render(<TopologyMap view={view} translate={translate} />);

        const attackLayer = screen.getAllByTestId('topology-attack-segment')[0].parentElement;
        const flowNetworkRule = extractLessRule('topologyFlowNetwork');
        const zoneRule = extractLessRule('topologyZone');
        expect(attackLayer).not.toBeNull();
        expect(Number(flowNetworkRule.match(/z-index:\s*(\d+)/i)?.[1])).toBeGreaterThan(Number(zoneRule.match(/z-index:\s*(\d+)/i)?.[1]));
    });

    it('renders the demo external-attacker card and its original SVG icon', () => {
        render(<TopologyMap view={view} translate={translate} />);

        const attacker = getNode('attacker');
        const icon = attacker.querySelector(':scope > i > svg');
        const attackerRule = extractLessRule('topologyExternalAttacker');

        expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
        expect(icon?.querySelector('circle')).toHaveAttribute('cy', '7.2');
        expect(icon?.querySelectorAll('path')).toHaveLength(2);
        expect(attackerRule).toMatch(/left:\s*7px/i);
        expect(attackerRule).toMatch(/top:\s*118px/i);
        expect(attackerRule).toMatch(/width:\s*244px/i);
        expect(attackerRule).toMatch(/255\s+126\s+96/i);
    });

    it('renders the current zone boundary links independently from attack playback', () => {
        render(<TopologyMap view={view} translate={translate} />);

        expect(screen.getAllByTestId('topology-zone-link').map((link) => link.getAttribute('d'))).toEqual([
            'M252 331 H292',
            'M536 331 H560 V190 H584',
            'M828 190 H876',
            'M536 331 H560 V526 H584',
            'M828 526 H876',
        ]);
    });

    it('places every zone description in the bottom title bar', () => {
        render(<TopologyMap view={view} translate={translate} />);

        const headerRule = extractLessRule('topologyZoneHead');
        const misplacedHeaders = screen
            .getAllByTestId('topology-zone')
            .filter((zone) => !zone.firstElementChild?.getAttribute('class')?.includes('topologyZoneHead'))
            .map((zone) => zone.getAttribute('data-zone-id'));

        expect(headerRule).toMatch(/bottom:\s*0/i);
        expect(headerRule).toMatch(/height:\s*31px/i);
        expect(misplacedHeaders).toEqual([]);
    });

    it('uses the demo dashed-reveal algorithm and its rounded arrow travel duration', () => {
        render(<TopologyMap view={view} translate={translate} />);

        const activeSegment = getSegment('attacker->react');
        const arrow = screen.getByTestId('topology-attack-arrow');
        const motion = arrow.querySelector('animateMotion');
        const activeOpacity = Number(extractLessRule('topologyAttackPathActive').match(/opacity:\s*([\d.]+)\s*;/i)?.[1]);

        expect(activeSegment).toHaveAttribute('data-attack-state', 'active');
        expect(activeSegment).not.toHaveAttribute('mask');
        expect(activeSegment.style.strokeDasharray).toBe('0 420.0');
        expect(buildAttackDashedReveal(18, 420)).toBe('4.00 4.00 4.00 4.00 2.00 420.0');
        expect(motion).toHaveAttribute('dur', '1.50s');
        expect(motion).toHaveAttribute('repeatCount', '1');
        expect(motion).toHaveAttribute('fill', 'freeze');
        expect(motion?.querySelector('mpath')).toHaveAttribute('href', '#flowExternalReact');
        expect(activeOpacity, 'The active path must not wait for the completed state to become paintable').toBeGreaterThan(0);
    });

    it('derives the full 27.08s rhythm from the demo speed, pauses, and reset delay', () => {
        expect(ATTACK_PLAYBACK_STEPS.map(({ hitAtMs, startAtMs }) => [startAtMs, hitAtMs].map((value) => Math.round(value * 1_000) / 1_000))).toEqual([
            [0, 1_500],
            [2_460, 5_876.667],
            [6_836.667, 9_670],
            [10_630, 13_046.667],
            [14_006.667, 17_506.667],
            [18_466.667, 21_300],
        ]);
        expect(ATTACK_PLAYBACK_STEPS.map(getAttackAnimationDurationMs)).toEqual([1_500, 3_420, 2_830, 2_420, 3_500, 2_830]);
        expect(ATTACK_CYCLE_MS).toBeCloseTo(27_080, 8);
    });

    it('uses the demo HTML node grids and tuned A1 spacing contract', () => {
        render(<TopologyMap view={view} translate={translate} />);

        const publicAccess = screen.getAllByTestId('topology-zone').find((zone) => zone.getAttribute('data-zone-id') === 'public-access');
        const nodeGrid = publicAccess?.children[1];
        const gridRule = extractLessRule('topologyGrid6');
        expect(publicAccess).toBeDefined();
        expect(publicAccess).toHaveStyle({ left: '8px', top: '236px', width: '244px', height: '190px' });
        expect(nodeGrid?.getAttribute('class')).toContain('topologyGrid6');
        expect(nodeGrid?.querySelectorAll('[data-testid="topology-node"]')).toHaveLength(6);
        expect(gridRule).toMatch(/repeat\(3,\s*64px\)/i);
        expect(chartLess).toMatch(/\.topologyZone\[data-zone-id='public-access'\][\s\S]*?gap:\s*14px 10px/i);
    });

    it('uses the demo icon drawings for each attack-node device type', () => {
        render(<TopologyMap view={view} translate={translate} />);

        expect(getNode('react').querySelector('rect')).toHaveAttribute('x', '4');
        expect(getNode('dubbo').querySelectorAll('rect')).toHaveLength(3);
        expect(getNode('geoserver').querySelector('path')).toHaveAttribute('d', 'M4.5 6.5 10 4l4 2 5.5-2.2v13.7L14 20l-4-2-5.5 2.2z');
        expect(getNode('postgres').querySelector('ellipse')).toHaveAttribute('rx', '7');
        expect(getNode('cacti').querySelectorAll('rect')).toHaveLength(1);
        expect(getNode('neo4j').querySelector('ellipse')).toHaveAttribute('ry', '3');
    });

    it('advances at exact route boundaries and keeps each reached node hit for 780ms before compromise', () => {
        render(<TopologyMap view={view} translate={translate} />);

        expect(vi.getTimerCount()).toBeGreaterThan(0);
        expectOnlyActiveSegment('attacker->react');
        expectAttackState(getSegment('attacker->react'), 'active');
        expectAttackState(getSegment('react->dubbo'), 'idle');
        expectAttackState(getNode('react'), 'idle');
        expectAttackState(getNode('dubbo'), 'idle');

        advancePlaybackBy(1499);

        expectOnlyActiveSegment('attacker->react');
        expectAttackState(getNode('react'), 'idle');

        advancePlaybackBy(1);

        expectOnlyActiveSegment();
        expectAttackState(getSegment('attacker->react'), 'complete');
        expectAttackState(getSegment('react->dubbo'), 'idle');
        expectAttackState(getNode('react'), 'hit');
        expectAttackState(getNode('dubbo'), 'idle');

        advancePlaybackBy(779);
        expectAttackState(getNode('react'), 'hit');

        advancePlaybackBy(1);
        expectAttackState(getNode('react'), 'compromised');
        expectOnlyActiveSegment();

        advancePlaybackBy(179);
        expectOnlyActiveSegment();

        advancePlaybackBy(1);
        expectOnlyActiveSegment('react->dubbo');

        advancePlaybackBy(3416);
        expectAttackState(getNode('dubbo'), 'idle');
        expectOnlyActiveSegment('react->dubbo');

        advancePlaybackBy(1);

        expectOnlyActiveSegment();
        expectAttackState(getSegment('react->dubbo'), 'complete');
        expectAttackState(getSegment('dubbo->geoserver'), 'idle');
        expectAttackState(getNode('dubbo'), 'hit');
        expectAttackState(getNode('geoserver'), 'idle');

        advancePlaybackBy(780);
        expectAttackState(getNode('dubbo'), 'compromised');
    });

    it('starts the second route at the shared branch without replaying its public prefix', () => {
        render(<TopologyMap view={view} translate={translate} />);

        expect(vi.getTimerCount()).toBeGreaterThan(0);
        advancePlaybackBy(13046);

        expectOnlyActiveSegment('geoserver->postgres');
        expectAttackState(getSegment('dubbo->cacti'), 'idle');
        expectAttackState(getNode('postgres'), 'idle');

        advancePlaybackBy(1);

        expectAttackState(getSegment('attacker->react'), 'complete');
        expectAttackState(getSegment('react->dubbo'), 'complete');
        expectAttackState(getSegment('dubbo->geoserver'), 'complete');
        expectAttackState(getSegment('geoserver->postgres'), 'complete');
        expectOnlyActiveSegment();
        expectAttackState(getSegment('dubbo->cacti'), 'idle');
        expectAttackState(getSegment('cacti->neo4j'), 'idle');
        expectAttackState(getNode('postgres'), 'hit');
        expectAttackState(getNode('cacti'), 'idle');

        advancePlaybackBy(780);

        expectOnlyActiveSegment();
        expectAttackState(getNode('postgres'), 'compromised');
        expectAttackState(getNode('cacti'), 'idle');

        advancePlaybackBy(179);
        expectOnlyActiveSegment();

        advancePlaybackBy(1);
        expectOnlyActiveSegment('dubbo->cacti');
    });

    it('shows the completed attack once, then resets and loops from the first segment', () => {
        render(<TopologyMap view={view} translate={translate} />);

        expect(vi.getTimerCount()).toBeGreaterThan(0);
        advancePlaybackBy(14007);

        expectOnlyActiveSegment('dubbo->cacti');
        expectAttackState(getSegment('dubbo->cacti'), 'active');
        expectAttackState(getNode('cacti'), 'idle');
        expectAttackState(getNode('neo4j'), 'idle');

        advancePlaybackBy(3500);
        expectOnlyActiveSegment();
        expectAttackState(getSegment('dubbo->cacti'), 'complete');
        expectAttackState(getNode('cacti'), 'hit');

        advancePlaybackBy(780);
        expectAttackState(getNode('cacti'), 'compromised');
        expectAttackState(getNode('neo4j'), 'idle');

        advancePlaybackBy(179);
        expectOnlyActiveSegment();

        advancePlaybackBy(1);
        expectOnlyActiveSegment('cacti->neo4j');

        advancePlaybackBy(2832);
        expectOnlyActiveSegment('cacti->neo4j');
        expectAttackState(getNode('neo4j'), 'idle');

        advancePlaybackBy(1);

        screen.getAllByTestId('topology-attack-segment').forEach((segment) => expectAttackState(segment, 'complete'));
        expectOnlyActiveSegment();
        ['react', 'dubbo', 'geoserver', 'postgres', 'cacti'].forEach((nodeId) => expectAttackState(getNode(nodeId), 'compromised'));
        expectAttackState(getNode('neo4j'), 'hit');

        advancePlaybackBy(780);
        expectAttackState(getNode('neo4j'), 'compromised');

        advancePlaybackBy(4999);
        expectAttackState(getNode('neo4j'), 'compromised');

        advancePlaybackBy(1);

        expectOnlyActiveSegment('attacker->react');
        expectAttackState(getSegment('attacker->react'), 'active');
        ['react->dubbo', 'dubbo->geoserver', 'geoserver->postgres', 'dubbo->cacti', 'cacti->neo4j'].forEach((segmentId) => expectAttackState(getSegment(segmentId), 'idle'));
        ['react', 'dubbo', 'geoserver', 'postgres', 'cacti', 'neo4j'].forEach((nodeId) => expectAttackState(getNode(nodeId), 'idle'));
    });

    it('renders the complete route statically and schedules no playback for reduced motion', () => {
        stubReducedMotion(true);

        render(<TopologyMap view={view} translate={translate} />);

        expect(vi.getTimerCount()).toBe(0);
        screen.getAllByTestId('topology-attack-segment').forEach((segment) => expectAttackState(segment, 'complete'));
        ['react', 'dubbo', 'geoserver', 'postgres', 'cacti', 'neo4j'].forEach((nodeId) => expectAttackState(getNode(nodeId), 'compromised'));
    });

    it('cleans up its playback timer when the topology unmounts', () => {
        const { unmount } = render(<TopologyMap view={view} translate={translate} />);

        expect(vi.getTimerCount()).toBeGreaterThan(0);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});
