import { describe, expect, it } from 'vitest';
import { isRangeTopology } from '@/api/range';
import { parseTopology } from '@/features/topology/domain/validate-topology';
import { projectWorkbenchTopology } from '@/features/topology/layout/workbench-topology-projection';
import { getWorkbenchTopologyView } from '@/pages/workbench/components/workbench-topology-layout';
import { createJobDetailFixture } from '@/test/fixtures/job-detail';
import range3Source from '../../../../public/data/topology/range3.json';
import range4Source from '../../../../public/data/topology/range4.json';
import range5Source from '../../../../public/data/topology/range5.json';
import range6Source from '../../../../public/data/topology/range6.json';
import type { IRangeTopology } from '@/api/range';

const getTopology = () => {
    const topology = createJobDetailFixture().topology;
    if (!isRangeTopology(topology)) throw new Error('Topology fixture is required');
    return topology;
};

const projectCanonicalTopology = (source: unknown): IRangeTopology => {
    const topology = parseTopology(source);
    const attackPath = topology.attackPaths?.[0]?.nodeIds ?? [];
    return {
        attackPath,
        attackPaths: topology.attackPaths?.map(({ id, nodeIds }) => ({ id, nodeIds })),
        edges: [],
        nodes: topology.nodes.map((node) => ({
            id: node.id,
            ip: node.interfaces.find((item) => item.address)?.address ?? '',
            label: node.label,
            os: '',
            services: [],
            type: node.kind === 'external_actor' ? 'workstation' : 'server',
            vulnerabilities: [],
            x: 0,
            y: 0,
            zone: node.zoneId,
        })),
        viewBox: '0 0 1200 660',
        zones: topology.zones.map((zone) => ({ ...zone, width: 0, x: 0 })),
    };
};

describe('workbench topology layout', () => {
    it('keeps the backend entities but projects them into readable zone columns', () => {
        const topology = getTopology();
        const view = getWorkbenchTopologyView(topology);

        expect(view.nodes.map((node) => node.id)).toEqual(topology.nodes.map((node) => node.id));
        expect(view.zones.map((zone) => zone.id)).toEqual(['pub', 'app', 'cache', 'sec', 'cms']);
        expect(view.externalNodes.map((node) => node.id)).toEqual(['attacker']);
        expect(new Set(view.nodes.map((node) => `${node.x}:${node.y}`)).size).toBe(view.nodes.length);

        view.zones.forEach((zone) => {
            const externalNodeIds = new Set(view.externalNodes.map((node) => node.id));
            view.nodes
                .filter((node) => node.zone === zone.id && !externalNodeIds.has(node.id))
                .forEach((node) => {
                    expect(node.x).toBeGreaterThan(zone.x);
                    expect(node.x).toBeLessThan(zone.x + zone.width);
                    expect(node.y).toBeGreaterThan(zone.y);
                    expect(node.y).toBeLessThan(zone.y + zone.height);
                });
        });
    });

    it('places attack-path nodes first in each zone and routes edges orthogonally', () => {
        const view = getWorkbenchTopologyView(getTopology());
        const nodesById = new Map(view.nodes.map((node) => [node.id, node]));

        expect(nodesById.get('attacker')?.row).toBe(0);
        expect(nodesById.get('wp')?.row).toBe(1);
        expect(nodesById.get('app')?.row).toBe(0);
        expect(nodesById.get('redis')?.row).toBe(0);
        expect(view.edges).toHaveLength(6);
        view.edges.forEach((edge) => {
            expect(edge.path).toMatch(/^M [\d.]+ [\d.]+ H [\d.]+ V [\d.]+ H [\d.]+$/);
        });
    });

    it('keeps primary nodes ahead of decoys when a zone has no attack path', () => {
        const topology = getTopology();
        const sourceNode = topology.nodes.find(({ id }) => id === 'wp')!;
        const view = getWorkbenchTopologyView({
            ...topology,
            attackPath: [],
            edges: [],
            nodes: [
                { ...sourceNode, id: 'decoy', label: '1_decoy', role: 'decoy' },
                { ...sourceNode, id: 'primary', label: 'primary', role: 'primary' },
            ],
            zones: topology.zones.slice(0, 1),
        });

        const nodeById = new Map(view.nodes.map((node) => [node.id, node]));
        expect(nodeById.get('primary')?.row).toBe(0);
        expect(nodeById.get('decoy')?.row).toBe(1);
    });

    it('derives visible links from the backend attack path when explicit edges are absent', () => {
        const topology = getTopology();
        const view = getWorkbenchTopologyView({ ...topology, attackPaths: undefined, edges: [] });

        expect(view.edges.map(({ sourceId, targetId }) => [sourceId, targetId])).toEqual([
            ['attacker', 'wp'],
            ['wp', 'app'],
            ['app', 'redis'],
            ['redis', 'av'],
            ['av', 'cms'],
        ]);
    });

    it('keeps the two Range3 attack routes separate from low-emphasis structural links', () => {
        const view = getWorkbenchTopologyView(projectWorkbenchTopology(parseTopology(range3Source)));

        expect(view.attackRoutes).toHaveLength(2);
        expect(view.attackRoutes.map(({ id }) => id)).toEqual(['range3-data-path', 'range3-monitoring-path']);
        expect(view.attackRoutes.map(({ segments }) => segments.map(({ sourceId, targetId }) => `${sourceId}->${targetId}`))).toEqual([
            ['attacker->react', 'react->dubbo', 'dubbo->geoserver', 'geoserver->postgres'],
            ['attacker->react', 'react->dubbo', 'dubbo->cacti', 'cacti->neo4j'],
        ]);
        expect(view.structuralEdges.length).toBeLessThan(view.nodes.length);
    });

    it('lays out Range3 transit networks independently between service zones', () => {
        const topology = projectWorkbenchTopology(parseTopology(range3Source));
        const view = getWorkbenchTopologyView(topology);

        expect(view.nodes.map(({ id }) => id)).not.toContain('react_dubbo');
        expect(view.networkConnectors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 'react_dubbo', sourceNodeId: 'react', sourceZoneId: 'public-access', targetZoneId: 'business-application' }),
                expect.objectContaining({ id: 'dubbo_geoserver', sourceNodeId: 'dubbo', sourceZoneId: 'business-application', targetZoneId: 'gis-service' }),
            ]),
        );
        view.networkConnectors.forEach((connector) => {
            const targetZone = view.zones.find(({ id }) => id === connector.targetZoneId);
            expect(targetZone).toBeDefined();
            expect(connector.x + connector.width).toBeLessThan(targetZone!.x);
        });
        expect(view.networkEdges.filter(({ networkId }) => networkId === 'react_dubbo').map(({ nodeId, side }) => `${side}:${nodeId}`)).toEqual([
            'source:react',
            'target:dubbo',
            'target:zookeeper',
            'target:snmp',
            'target:syslog',
        ]);
        view.networkEdges.forEach(({ path }) => expect(path).toMatch(/^M [\d.]+ [\d.]+ H [\d.]+ V [\d.]+ H [\d.]+$/));
    });

    it.each([
        ['range3', range3Source],
        ['range4', range4Source],
        ['range5', range5Source],
        ['range6', range6Source],
    ])('keeps every fixed %s node inside its display lane', (_rangeId, source) => {
        const topology = projectCanonicalTopology(source);
        const view = getWorkbenchTopologyView(topology);
        const externalNodeIds = new Set(view.externalNodes.map((node) => node.id));
        const zoneById = new Map(view.zones.map((zone) => [zone.id, zone]));

        expect(view.nodes).toHaveLength(topology.nodes.length);
        expect(new Set(view.nodes.map((node) => `${node.x}:${node.y}`)).size).toBe(view.nodes.length);
        view.nodes
            .filter((node) => !externalNodeIds.has(node.id))
            .forEach((node) => {
                const zone = zoneById.get(node.zone);
                expect(zone).toBeDefined();
                expect(node.y - 21).toBeGreaterThan(zone!.y + 42);
                expect(node.y + 21).toBeLessThan(zone!.y + zone!.height);
            });
    });
});
