import { describe, expect, it } from 'vitest';
import { getRangeNodeDisplayLabel, getRangeTopologyLayout } from '@/pages/range/components/range-topology-layout';
import type { IRangeTopology } from '@/api/range';

const makeNode = (id: string, zone: string, label = id) => ({
    id,
    ip: '',
    label,
    os: '',
    services: [],
    type: 'server' as const,
    vulnerabilities: [],
    x: 0,
    y: 0,
    zone,
});

describe('getRangeTopologyLayout', () => {
    it('repacks overlapping backend zones into separated columns and rows', () => {
        const topology: IRangeTopology = {
            attackPath: [],
            edges: [],
            nodes: [makeNode('entry', 'external'), makeNode('service-a', 'service-a'), makeNode('service-b', 'service-b')],
            viewBox: '0 0 1200 760',
            zoneEdges: [
                ['external', 'service-a'],
                ['external', 'service-b'],
            ],
            zones: [
                { id: 'external', label: 'external', x: 0, y: 180, width: 370, height: 220 },
                { id: 'service-a', label: '172.110.1.0/24', x: 160, y: 40, width: 225, height: 320 },
                { id: 'service-b', label: '172.110.2.0/24', x: 160, y: 120, width: 225, height: 320 },
            ],
        };

        const layout = getRangeTopologyLayout(topology);
        const entryZone = layout.zones.find(({ id }) => id === 'external')!;
        const serviceAZone = layout.zones.find(({ id }) => id === 'service-a')!;
        const serviceBZone = layout.zones.find(({ id }) => id === 'service-b')!;

        expect(serviceAZone.x).toBeGreaterThanOrEqual(entryZone.x + entryZone.width + 48);
        expect(serviceBZone.y).toBeGreaterThanOrEqual(serviceAZone.y + serviceAZone.height + 20);
        expect(layout.canvasHeight).toBeLessThan(760);
    });

    it('keeps the original label for details while removing trailing technology metadata from the card', () => {
        expect(getRangeNodeDisplayLabel('react 前端(Next.js 15.2.4)')).toBe('react 前端');
        expect(getRangeNodeDisplayLabel('cacti-db（MySQL 5.7）')).toBe('cacti-db');
    });

    it('places a multi-parent target after the longest incoming path', () => {
        const topology: IRangeTopology = {
            attackPath: [],
            edges: [],
            nodes: [makeNode('node-a', 'a'), makeNode('node-b', 'b'), makeNode('node-c', 'c')],
            viewBox: '0 0 920 430',
            zoneEdges: [
                ['a', 'c'],
                ['a', 'b'],
                ['b', 'c'],
            ],
            zones: [
                { id: 'a', label: 'A', x: 0, width: 200 },
                { id: 'b', label: 'B', x: 200, width: 200 },
                { id: 'c', label: 'C', x: 400, width: 200 },
            ],
        };

        const layout = getRangeTopologyLayout(topology);
        const zoneB = layout.zones.find(({ id }) => id === 'b')!;
        const zoneC = layout.zones.find(({ id }) => id === 'c')!;

        expect(zoneC.column).toBeGreaterThan(zoneB.column);
    });

    it('places a cross-zone network connector between its source and target zones', () => {
        const topology: IRangeTopology = {
            attackPath: [],
            edges: [],
            networkConnectors: [
                {
                    id: 'react-dubbo',
                    label: 'react_to_dubbo_net',
                    sourceNodeId: 'react',
                    sourceZoneId: 'public',
                    targetZoneId: 'business',
                },
            ],
            nodes: [makeNode('react', 'public'), makeNode('dubbo', 'business')],
            viewBox: '0 0 920 430',
            zoneEdges: [['public', 'business']],
            zones: [
                { id: 'public', label: 'Public', x: 0, width: 200 },
                { id: 'business', label: 'Business', x: 200, width: 200 },
            ],
        };

        const layout = getRangeTopologyLayout(topology);
        const sourceZone = layout.zones.find(({ id }) => id === 'public')!;
        const targetZone = layout.zones.find(({ id }) => id === 'business')!;
        const connector = layout.networkConnectors[0];

        expect(connector.x).toBeGreaterThan(sourceZone.x + sourceZone.width);
        expect(connector.x + connector.width).toBeLessThan(targetZone.x);
    });
});
