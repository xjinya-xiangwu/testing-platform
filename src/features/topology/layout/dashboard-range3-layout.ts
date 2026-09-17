import { ITopologyDTO, ITopologyNode, ITopologyZone } from '@/features/topology/domain/topology';

interface ICanvasSize {
    height: number;
    width: number;
}

interface IPoint {
    x: number;
    y: number;
}

interface IDashboardZoneLayout {
    code: string;
    headerPosition: 'top' | 'bottom';
    height: number;
    nodeIds: readonly string[];
    nodePositions: readonly IPoint[];
    width: number;
    x: number;
    y: number;
    zoneId: string;
}

interface IDashboardAttackRoute {
    id: string;
    path: string;
    sourceId: string;
    targetId: string;
}

interface IDashboardZoneLink {
    id: string;
    path: string;
}

export interface IDashboardTopologyNodeView {
    node: ITopologyNode;
    position: IPoint;
}

export interface IDashboardTopologyZoneView extends Omit<IDashboardZoneLayout, 'nodeIds' | 'nodePositions' | 'zoneId'> {
    nodes: readonly IDashboardTopologyNodeView[];
    zone: ITopologyZone;
}

export interface IDashboardTopologyView {
    attackNodeIds: readonly string[];
    attackSegments: readonly IDashboardAttackRoute[];
    attacker: ITopologyNode;
    canvas: ICanvasSize;
    zoneLinks: readonly IDashboardZoneLink[];
    zones: readonly IDashboardTopologyZoneView[];
}

const ATTACK_ROUTES: readonly IDashboardAttackRoute[] = [
    { id: 'attacker->react', sourceId: 'attacker', targetId: 'react', path: 'M129 190 V220 H56 V253.5' },
    { id: 'react->dubbo', sourceId: 'react', targetId: 'dubbo', path: 'M74 271.5 H351' },
    { id: 'dubbo->geoserver', sourceId: 'dubbo', targetId: 'geoserver', path: 'M387 271.5 H424 V164 H613' },
    { id: 'geoserver->postgres', sourceId: 'geoserver', targetId: 'postgres', path: 'M651 164 H907.2' },
    { id: 'dubbo->cacti', sourceId: 'dubbo', targetId: 'cacti', path: 'M387 271.5 H424 V500 H613' },
    { id: 'cacti->neo4j', sourceId: 'cacti', targetId: 'neo4j', path: 'M651 500 H860 V468.5 H935' },
] as const;

export const DASHBOARD_RANGE3_LAYOUT: { canvas: ICanvasSize; zoneLinks: readonly IDashboardZoneLink[]; zones: readonly IDashboardZoneLayout[] } = {
    canvas: { width: 1192, height: 760 },
    zoneLinks: [
        { id: 'public-business', path: 'M252 331 H292' },
        { id: 'business-gis-service', path: 'M536 331 H560 V190 H584' },
        { id: 'gis-service-data', path: 'M828 190 H876' },
        { id: 'business-ops', path: 'M536 331 H560 V526 H584' },
        { id: 'ops-monitoring-data', path: 'M828 526 H876' },
    ],
    zones: [
        {
            zoneId: 'public-access',
            code: 'A1',
            x: 8,
            y: 236,
            width: 244,
            height: 190,
            headerPosition: 'bottom',
            nodeIds: ['react', 'gitea', 'postfix', 'dovecot', 'redis', 'rabbitmq'],
            nodePositions: [
                { x: 59, y: 276 },
                { x: 133, y: 276 },
                { x: 206, y: 276 },
                { x: 59, y: 345 },
                { x: 133, y: 345 },
                { x: 206, y: 345 },
            ],
        },
        {
            zoneId: 'business-application',
            code: 'B1',
            x: 292,
            y: 236,
            width: 244,
            height: 190,
            headerPosition: 'bottom',
            nodeIds: ['dubbo', 'zookeeper', 'snmp', 'syslog'],
            nodePositions: [
                { x: 370, y: 273 },
                { x: 472, y: 273 },
                { x: 370, y: 339 },
                { x: 472, y: 339 },
            ],
        },
        {
            zoneId: 'gis-service',
            code: 'C1',
            x: 584,
            y: 120,
            width: 244,
            height: 140,
            headerPosition: 'bottom',
            nodeIds: ['geoserver', 'consul', 'squid'],
            nodePositions: [
                { x: 643, y: 165 },
                { x: 717, y: 165 },
                { x: 790, y: 165 },
            ],
        },
        {
            zoneId: 'gis-data',
            code: 'C2',
            x: 876,
            y: 120,
            width: 244,
            height: 140,
            headerPosition: 'bottom',
            nodeIds: ['postgres', 'cassandra', 'influx'],
            nodePositions: [
                { x: 939, y: 165 },
                { x: 1013, y: 165 },
                { x: 1087, y: 165 },
            ],
        },
        {
            zoneId: 'ops-monitoring',
            code: 'D1',
            x: 584,
            y: 456,
            width: 244,
            height: 140,
            headerPosition: 'bottom',
            nodeIds: ['cacti', 'gitdecoy', 'clickhouse'],
            nodePositions: [
                { x: 643, y: 501 },
                { x: 717, y: 501 },
                { x: 790, y: 501 },
            ],
        },
        {
            zoneId: 'monitoring-data',
            code: 'D2',
            x: 876,
            y: 438,
            width: 244,
            height: 176,
            headerPosition: 'bottom',
            nodeIds: ['neo4j', 'cactidb', 'cups', 'iperf'],
            nodePositions: [
                { x: 962, y: 469 },
                { x: 1066, y: 469 },
                { x: 962, y: 535 },
                { x: 1066, y: 535 },
            ],
        },
    ],
};

const requireNode = (nodesById: ReadonlyMap<string, ITopologyNode>, nodeId: string) => {
    const node = nodesById.get(nodeId);
    if (!node) throw new Error(`Dashboard Range 3 layout references missing node: ${nodeId}`);
    return node;
};

const requireZone = (zonesById: ReadonlyMap<string, ITopologyZone>, zoneId: string) => {
    const zone = zonesById.get(zoneId);
    if (!zone) throw new Error(`Dashboard Range 3 layout references missing zone: ${zoneId}`);
    return zone;
};

const getAttackSegments = (topology: ITopologyDTO) => {
    const requestedSegments = (topology.attackPaths ?? []).flatMap((attackPath) => attackPath.nodeIds.slice(0, -1).map((sourceId, index) => ({ sourceId, targetId: attackPath.nodeIds[index + 1] })));
    const uniqueSegments = requestedSegments.filter(
        (segment, index) => requestedSegments.findIndex((candidate) => candidate.sourceId === segment.sourceId && candidate.targetId === segment.targetId) === index,
    );

    return uniqueSegments.map((segment) => {
        const route = ATTACK_ROUTES.find((candidate) => candidate.sourceId === segment.sourceId && candidate.targetId === segment.targetId);
        if (!route) throw new Error(`Dashboard Range 3 layout has no route for attack segment: ${segment.sourceId}->${segment.targetId}`);
        return route;
    });
};

export const getDashboardRange3View = (topology: ITopologyDTO): IDashboardTopologyView => {
    const nodesById = new Map(topology.nodes.map((node) => [node.id, node]));
    const zonesById = new Map(topology.zones.map((zone) => [zone.id, zone]));
    const zones = DASHBOARD_RANGE3_LAYOUT.zones.map<IDashboardTopologyZoneView>((layout) => ({
        code: layout.code,
        headerPosition: layout.headerPosition,
        height: layout.height,
        width: layout.width,
        x: layout.x,
        y: layout.y,
        zone: requireZone(zonesById, layout.zoneId),
        nodes: layout.nodeIds.map((nodeId, index) => {
            const node = requireNode(nodesById, nodeId);
            if (node.zoneId !== layout.zoneId) throw new Error(`Dashboard Range 3 layout places ${node.id} outside its DTO zone ${node.zoneId}`);
            return { node, position: layout.nodePositions[index] };
        }),
    }));
    const attackSegments = getAttackSegments(topology);
    const attackNodeIds = (topology.attackPaths ?? []).flatMap((attackPath) => attackPath.nodeIds).filter((nodeId, index, nodeIds) => nodeIds.indexOf(nodeId) === index);

    return {
        canvas: { ...DASHBOARD_RANGE3_LAYOUT.canvas },
        attacker: requireNode(nodesById, 'attacker'),
        zoneLinks: DASHBOARD_RANGE3_LAYOUT.zoneLinks.map((link) => ({ ...link })),
        zones,
        attackSegments,
        attackNodeIds,
    };
};
