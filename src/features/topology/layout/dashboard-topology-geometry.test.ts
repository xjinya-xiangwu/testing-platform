import { describe, expect, it } from 'vitest';
import { getDashboardTopologyGeometry } from '@/features/topology/layout/dashboard-topology-geometry';

const screenRect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom, width: right - left, height: bottom - top });
const scaledRect = (left: number, top: number, right: number, bottom: number) => screenRect(100 + left / 2, 50 + top / 2, 100 + right / 2, 50 + bottom / 2);

describe('dashboard topology geometry', () => {
    it('projects measured responsive cards and icons back onto the fixed SVG plane', () => {
        const geometry = getDashboardTopologyGeometry({
            canvas: { width: 1192, height: 760 },
            svgRect: screenRect(100, 50, 696, 430),
            attackerRect: scaledRect(7, 118, 251, 190),
            zoneRects: {
                'public-access': scaledRect(8, 236, 252, 426),
                'business-application': scaledRect(292, 236, 536, 426),
                'gis-service': scaledRect(584, 120, 828, 260),
                'gis-data': scaledRect(876, 120, 1120, 260),
                'ops-monitoring': scaledRect(584, 456, 828, 596),
                'monitoring-data': scaledRect(876, 438, 1120, 614),
            },
            iconRects: {
                react: scaledRect(34, 251, 84, 301),
                gitea: scaledRect(108, 251, 158, 301),
                postfix: scaledRect(181, 251, 231, 301),
                dovecot: scaledRect(34, 320, 84, 370),
                redis: scaledRect(108, 320, 158, 370),
                rabbitmq: scaledRect(181, 320, 231, 370),
                dubbo: scaledRect(345, 248, 395, 298),
                zookeeper: scaledRect(447, 248, 497, 298),
                snmp: scaledRect(345, 314, 395, 364),
                syslog: scaledRect(447, 314, 497, 364),
                geoserver: scaledRect(618, 140, 668, 190),
                consul: scaledRect(692, 140, 742, 190),
                squid: scaledRect(765, 140, 815, 190),
                postgres: scaledRect(914, 140, 964, 190),
                cassandra: scaledRect(988, 140, 1038, 190),
                influx: scaledRect(1062, 140, 1112, 190),
                cacti: scaledRect(618, 476, 668, 526),
                gitdecoy: scaledRect(692, 476, 742, 526),
                clickhouse: scaledRect(765, 476, 815, 526),
                neo4j: scaledRect(937, 444, 987, 494),
                cactidb: scaledRect(1041, 444, 1091, 494),
                cups: scaledRect(937, 510, 987, 560),
                iperf: scaledRect(1041, 510, 1091, 560),
            },
        });

        expect(geometry.zoneLinkPaths).toEqual({
            'public-business': 'M252 331 H292',
            'business-gis-service': 'M536 331 H560 V190 H584',
            'gis-service-data': 'M828 190 H876',
            'business-ops': 'M536 331 H560 V526 H584',
            'ops-monitoring-data': 'M828 526 H876',
        });
        expect(geometry.attackPaths).toEqual({
            'attacker->react': 'M129 190 V220 H59 V251',
            'react->dubbo': 'M84 276 H345',
            'dubbo->geoserver': 'M395 273 H432 V165 H618',
            'geoserver->postgres': 'M668 165 H914',
            'dubbo->cacti': 'M395 273 H432 V501 H618',
            'cacti->neo4j': 'M668 501 H860 V469 H937',
        });
        expect(geometry.iconClearPath).toContain('M34,251 H84 V301 H34 Z');
        expect(geometry.iconClearPath).toContain('M1041,510 H1091 V560 H1041 Z');
    });

    it('omits dynamic paths whose measured rectangles are unavailable', () => {
        const geometry = getDashboardTopologyGeometry({
            canvas: { width: 1192, height: 760 },
            svgRect: screenRect(100, 50, 696, 430),
            attackerRect: scaledRect(7, 118, 251, 190),
            zoneRects: {
                'public-access': scaledRect(8, 236, 252, 426),
                'business-application': scaledRect(292, 236, 536, 426),
            },
            iconRects: {
                react: scaledRect(34, 251, 84, 301),
                dubbo: scaledRect(345, 248, 395, 298),
            },
        });

        expect(geometry.zoneLinkPaths).toEqual({
            'public-business': 'M252 331 H292',
        });
        expect(geometry.attackPaths).toEqual({
            'attacker->react': 'M129 190 V220 H59 V251',
            'react->dubbo': 'M84 276 H345',
        });
        expect(geometry.iconClearPath).toContain('M34,251 H84 V301 H34 Z');
        expect(geometry.iconClearPath).toContain('M345,248 H395 V298 H345 Z');
    });
});
