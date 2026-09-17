import { describe, expect, it } from 'vitest';
import { DASHBOARD_RANGE3_LAYOUT, getDashboardRange3View } from '@/features/topology/layout/dashboard-range3-layout';
import { parseTopology } from '@/features/topology/domain/validate-topology';
import topologySource from '../../../../public/data/topology/range3.json';

const topology = parseTopology(topologySource);

describe('Dashboard Range 3 topology projection', () => {
    it('projects the canonical DTO onto the six product zones without changing entity ids', () => {
        const view = getDashboardRange3View(topology);

        expect(view.canvas).toEqual({ width: 1192, height: 760 });
        expect(view.zones.map((zone) => [zone.code, zone.zone.id, zone.nodes.map(({ node }) => node.id)])).toEqual([
            ['A1', 'public-access', ['react', 'gitea', 'postfix', 'dovecot', 'redis', 'rabbitmq']],
            ['B1', 'business-application', ['dubbo', 'zookeeper', 'snmp', 'syslog']],
            ['C1', 'gis-service', ['geoserver', 'consul', 'squid']],
            ['C2', 'gis-data', ['postgres', 'cassandra', 'influx']],
            ['D1', 'ops-monitoring', ['cacti', 'gitdecoy', 'clickhouse']],
            ['D2', 'monitoring-data', ['neo4j', 'cactidb', 'cups', 'iperf']],
        ]);
        expect(view.attacker.id).toBe('attacker');
        expect(view.zones.flatMap((zone) => zone.nodes)).toHaveLength(23);
        expect(view.zones.map(({ code, headerPosition, x, y, width, height }) => [code, headerPosition, x, y, width, height])).toEqual([
            ['A1', 'bottom', 8, 236, 244, 190],
            ['B1', 'bottom', 292, 236, 244, 190],
            ['C1', 'bottom', 584, 120, 244, 140],
            ['C2', 'bottom', 876, 120, 244, 140],
            ['D1', 'bottom', 584, 456, 244, 140],
            ['D2', 'bottom', 876, 438, 244, 176],
        ]);
    });

    it('projects the five current zone-to-zone structural links', () => {
        const view = getDashboardRange3View(topology);

        expect(view.zoneLinks.map(({ id, path }) => [id, path])).toEqual([
            ['public-business', 'M252 331 H292'],
            ['business-gis-service', 'M536 331 H560 V190 H584'],
            ['gis-service-data', 'M828 190 H876'],
            ['business-ops', 'M536 331 H560 V526 H584'],
            ['ops-monitoring-data', 'M828 526 H876'],
        ]);
    });

    it('derives six unique visual attack segments from the two data attack paths', () => {
        const view = getDashboardRange3View(topology);

        expect(view.attackSegments.map((segment) => segment.id)).toEqual(['attacker->react', 'react->dubbo', 'dubbo->geoserver', 'geoserver->postgres', 'dubbo->cacti', 'cacti->neo4j']);
        expect(view.attackSegments.map((segment) => segment.path)).toEqual([
            'M129 190 V220 H56 V253.5',
            'M74 271.5 H351',
            'M387 271.5 H424 V164 H613',
            'M651 164 H907.2',
            'M387 271.5 H424 V500 H613',
            'M651 500 H860 V468.5 H935',
        ]);
    });

    it('fails when a product layout references an entity outside the DTO', () => {
        const invalidTopology = { ...topology, nodes: topology.nodes.filter((node) => node.id !== 'react') };

        expect(() => getDashboardRange3View(invalidTopology)).toThrow('Dashboard Range 3 layout references missing node: react');
        expect(DASHBOARD_RANGE3_LAYOUT.zones).toHaveLength(6);
    });
});
