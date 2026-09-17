import type { IRangeTopology, IRangeTopologyNode, IRangeTopologyZone } from '@/api/range';
import type { ITopologyDTO, ITopologyEntityReference, ITopologyNode } from '@/features/topology/domain/topology';
import { projectTopologyNetworkConnectors } from '@/features/topology/layout/topology-network-connectors';

const CANVAS_PADDING = 24;
const COLUMN_GAP = 42;
const MIN_CANVAS_HEIGHT = 430;
const MIN_CANVAS_WIDTH = 920;
const NODE_GAP = 6;
const NODE_HEIGHT = 42;
const ZONE_GAP = 24;
const ZONE_HEADER_HEIGHT = 42;
const ZONE_INSET = 10;
const ZONE_WIDTH = 252;

interface IZoneRelationship {
    sourceId: string;
    targetId: string;
}

interface IRangeTopologyLayoutInput {
    topology: ITopologyDTO;
    vulnerabilityLabelsByNodeId?: ReadonlyMap<string, readonly string[]>;
}

const formatCoordinate = (value: number) => Number(value.toFixed(1));

const getZoneHeight = (nodeCount: number) => ZONE_HEADER_HEIGHT + ZONE_INSET * 2 + Math.max(1, nodeCount) * NODE_HEIGHT + Math.max(0, nodeCount - 1) * NODE_GAP;

const getNodeType = (node: ITopologyNode): IRangeTopologyNode['type'] => {
    const signature = `${node.id} ${node.label} ${node.technology ?? ''}`.toLowerCase();
    if (/mysql|postgres|redis|database|db\b|neo4j|cassandra|influx|clickhouse|qdrant|typesense|mongo|couch|solr|scylla|arango|orient|rethink/.test(signature)) return 'database';
    if (/antivirus|firewall|security|vault/.test(signature)) return 'firewall';
    if (/network|router|switch|gateway|squid|iperf/.test(signature)) return 'device';
    return 'server';
};

const getServices = (node: ITopologyNode) => {
    const services = node.interfaces.flatMap(({ ports = [] }) => ports.map(({ port, protocol }) => `${protocol.toUpperCase()} :${port}`));
    return services.filter((service, index) => services.indexOf(service) === index);
};

const getZoneIdForEndpoint = (endpoint: ITopologyEntityReference, nodeZoneById: ReadonlyMap<string, string>, networkZoneById: ReadonlyMap<string, string>) =>
    endpoint.type === 'node' ? nodeZoneById.get(endpoint.id) : networkZoneById.get(endpoint.id);

const dedupeRelationships = (relationships: readonly IZoneRelationship[]) => {
    const relationshipIds = new Set<string>();
    return relationships.filter(({ sourceId, targetId }) => {
        const relationshipId = `${sourceId}→${targetId}`;
        if (sourceId === targetId || relationshipIds.has(relationshipId)) return false;
        relationshipIds.add(relationshipId);
        return true;
    });
};

const getZoneRelationships = (topology: ITopologyDTO, visibleZoneIds: ReadonlySet<string>) => {
    const nodeZoneById = new Map(topology.nodes.map(({ id, zoneId }) => [id, zoneId]));
    const networkZoneById = new Map(topology.networks.map(({ id, zoneId }) => [id, zoneId]));
    const linkRelationships = topology.links.flatMap<IZoneRelationship>((link) => {
        const sourceId = getZoneIdForEndpoint(link.source, nodeZoneById, networkZoneById);
        const targetId = getZoneIdForEndpoint(link.target, nodeZoneById, networkZoneById);
        if (!sourceId || !targetId || !visibleZoneIds.has(sourceId) || !visibleZoneIds.has(targetId) || sourceId === targetId) return [];
        return link.directed
            ? [{ sourceId, targetId }]
            : [
                  { sourceId, targetId },
                  { sourceId: targetId, targetId: sourceId },
              ];
    });
    return dedupeRelationships(linkRelationships);
};

const getEntryZoneIds = (topology: ITopologyDTO, visibleZoneIds: ReadonlySet<string>) => {
    const externalNodeIds = new Set(topology.nodes.filter(({ kind }) => kind === 'external_actor').map(({ id }) => id));
    const networkZoneById = new Map(topology.networks.map(({ id, zoneId }) => [id, zoneId]));
    const nodeZoneById = new Map(topology.nodes.map(({ id, zoneId }) => [id, zoneId]));
    const entryZoneIds = topology.links.flatMap((link) => {
        if (link.source.type !== 'node' || !externalNodeIds.has(link.source.id)) return [];
        const zoneId = getZoneIdForEndpoint(link.target, nodeZoneById, networkZoneById);
        return zoneId && visibleZoneIds.has(zoneId) ? [zoneId] : [];
    });
    return entryZoneIds.filter((zoneId, index) => entryZoneIds.indexOf(zoneId) === index);
};

const getZoneDepthById = (orderedZoneIds: readonly string[], relationships: readonly IZoneRelationship[], entryZoneIds: readonly string[]) => {
    const adjacency = new Map(orderedZoneIds.map((zoneId) => [zoneId, relationships.filter(({ sourceId }) => sourceId === zoneId).map(({ targetId }) => targetId)]));
    const inDegreeById = new Map(orderedZoneIds.map((zoneId) => [zoneId, relationships.filter(({ targetId }) => targetId === zoneId).length]));
    const rootZoneIds = entryZoneIds.length > 0 ? entryZoneIds : orderedZoneIds.filter((zoneId) => inDegreeById.get(zoneId) === 0).slice(0, 1);
    const initialRootZoneIds = rootZoneIds.length > 0 ? rootZoneIds : orderedZoneIds.slice(0, 1);
    const depthById = new Map(initialRootZoneIds.map((zoneId) => [zoneId, 0]));
    const queue = [...initialRootZoneIds];

    while (queue.length > 0) {
        const sourceId = queue.shift();
        if (!sourceId) continue;
        const sourceDepth = depthById.get(sourceId) ?? 0;
        (adjacency.get(sourceId) ?? []).forEach((targetId) => {
            if (depthById.has(targetId)) return;
            depthById.set(targetId, sourceDepth + 1);
            queue.push(targetId);
        });
    }

    orderedZoneIds.forEach((zoneId) => {
        if (depthById.has(zoneId)) return;
        const fallbackDepth = Math.max(0, ...depthById.values()) + 1;
        depthById.set(zoneId, fallbackDepth);
    });
    return depthById;
};

const getZoneLayouts = (topology: ITopologyDTO, visibleNodes: readonly ITopologyNode[], relationships: readonly IZoneRelationship[], entryZoneIds: readonly string[]) => {
    const visibleZoneIds = topology.zones.filter((zone) => visibleNodes.some((node) => node.zoneId === zone.id)).map(({ id }) => id);
    const depthById = getZoneDepthById(visibleZoneIds, relationships, entryZoneIds);
    const maximumDepth = Math.max(0, ...depthById.values());
    const columnZoneIds = Array.from({ length: maximumDepth + 1 }, (_, depth) => visibleZoneIds.filter((zoneId) => depthById.get(zoneId) === depth));
    const heightByZoneId = new Map(visibleZoneIds.map((zoneId) => [zoneId, getZoneHeight(visibleNodes.filter((node) => node.zoneId === zoneId).length)]));
    const columnHeights = columnZoneIds.map((zoneIds) => zoneIds.reduce((height, zoneId) => height + (heightByZoneId.get(zoneId) ?? 0), 0) + Math.max(0, zoneIds.length - 1) * ZONE_GAP);
    const canvasHeight = Math.max(MIN_CANVAS_HEIGHT, Math.max(0, ...columnHeights) + CANVAS_PADDING * 2);
    const contentWidth = columnZoneIds.length * ZONE_WIDTH + Math.max(0, columnZoneIds.length - 1) * COLUMN_GAP;
    const canvasWidth = Math.max(MIN_CANVAS_WIDTH, contentWidth + CANVAS_PADDING * 2);
    const startX = (canvasWidth - contentWidth) / 2;
    const sourceZoneById = new Map(topology.zones.map((zone) => [zone.id, zone]));
    const cidrByZoneId = new Map(topology.networks.filter(({ cidr }) => Boolean(cidr)).map(({ zoneId, cidr }) => [zoneId, cidr]));
    const zones = columnZoneIds.flatMap((zoneIds, depth) => {
        const columnHeight = columnHeights[depth];
        const startY = (canvasHeight - columnHeight) / 2;
        return zoneIds.map<IRangeTopologyZone>((zoneId, row) => {
            const precedingHeight = zoneIds.slice(0, row).reduce((height, precedingZoneId) => height + (heightByZoneId.get(precedingZoneId) ?? 0) + ZONE_GAP, 0);
            return {
                id: zoneId,
                label: sourceZoneById.get(zoneId)?.label || zoneId,
                x: formatCoordinate(startX + depth * (ZONE_WIDTH + COLUMN_GAP)),
                y: formatCoordinate(startY + precedingHeight),
                width: ZONE_WIDTH,
                height: heightByZoneId.get(zoneId) ?? getZoneHeight(0),
                ...(cidrByZoneId.get(zoneId) ? { cidr: cidrByZoneId.get(zoneId) } : {}),
            };
        });
    });
    return { canvasHeight, canvasWidth, zones };
};

const getAttackPath = (topology: ITopologyDTO, visibleNodeIds: ReadonlySet<string>) => (topology.attackPaths?.[0]?.nodeIds ?? []).filter((nodeId) => visibleNodeIds.has(nodeId));

const getAttackPaths = (topology: ITopologyDTO, visibleNodeIds: ReadonlySet<string>): NonNullable<IRangeTopology['attackPaths']> =>
    (topology.attackPaths ?? []).flatMap(({ id, nodeIds }) => {
        const visiblePath = nodeIds.filter((nodeId) => visibleNodeIds.has(nodeId));
        return visiblePath.length >= 2 ? [{ id, nodeIds: visiblePath }] : [];
    });

const getAttackEdges = (topology: ITopologyDTO, visibleNodeIds: ReadonlySet<string>) => {
    const edgeIds = new Set<string>();
    return (topology.attackPaths ?? []).flatMap(({ nodeIds }) =>
        nodeIds.slice(0, -1).flatMap<readonly [string, string]>((sourceId, index) => {
            const targetId = nodeIds[index + 1];
            const edgeId = `${sourceId}→${targetId}`;
            if (!visibleNodeIds.has(sourceId) || !visibleNodeIds.has(targetId) || edgeIds.has(edgeId)) return [];
            edgeIds.add(edgeId);
            return [[sourceId, targetId]];
        }),
    );
};

const getNetworkConnections = (topology: ITopologyDTO, visibleNodeIds: ReadonlySet<string>) => {
    const connectionIds = new Set<string>();
    return topology.networks.flatMap<readonly [string, string]>(({ id: networkId }) => {
        const members = topology.nodes.filter((node) => visibleNodeIds.has(node.id) && node.interfaces.some(({ networkId: interfaceNetworkId }) => interfaceNetworkId === networkId));
        if (members.length < 2) return [];
        const hub = members.find((node) => node.purpose === 'real' && node.interfaces.length > 1) ?? members.find((node) => node.purpose === 'real' || node.purpose === undefined) ?? members[0];
        return members.flatMap<readonly [string, string]>((member) => {
            const connectionId = [hub.id, member.id].sort().join('↔');
            if (member.id === hub.id || connectionIds.has(connectionId)) return [];
            connectionIds.add(connectionId);
            return [[hub.id, member.id]];
        });
    });
};

const getNodeZoneLinks = (topology: ITopologyDTO, visibleNodeIds: ReadonlySet<string>, visibleZoneIds: ReadonlySet<string>): NonNullable<IRangeTopology['nodeZoneLinks']> => {
    const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
    const networkById = new Map(topology.networks.map((network) => [network.id, network]));
    const linkIds = new Set<string>();

    return topology.links.flatMap((link) => {
        if (link.source.type !== 'node' || link.target.type !== 'network') return [];
        const sourceNode = nodeById.get(link.source.id);
        const targetNetwork = networkById.get(link.target.id);
        if (!sourceNode || !targetNetwork || !visibleNodeIds.has(sourceNode.id) || !visibleZoneIds.has(targetNetwork.zoneId) || sourceNode.zoneId === targetNetwork.zoneId) return [];
        const linkId = `${sourceNode.id}→${targetNetwork.zoneId}`;
        if (linkIds.has(linkId)) return [];
        linkIds.add(linkId);
        return [{ id: link.id, sourceNodeId: sourceNode.id, targetZoneId: targetNetwork.zoneId }];
    });
};

export const projectRangeDetailTopology = ({ topology, vulnerabilityLabelsByNodeId = new Map() }: IRangeTopologyLayoutInput): IRangeTopology => {
    const visibleNodes = topology.nodes.filter(({ kind }) => kind !== 'external_actor');
    const visibleNodeIds = new Set(visibleNodes.map(({ id }) => id));
    const visibleZoneIds = new Set(visibleNodes.map(({ zoneId }) => zoneId));
    const relationships = getZoneRelationships(topology, visibleZoneIds);
    const entryZoneIds = getEntryZoneIds(topology, visibleZoneIds);
    const { canvasHeight, canvasWidth, zones } = getZoneLayouts(topology, visibleNodes, relationships, entryZoneIds);
    const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
    const zoneDepthById = new Map(zones.map((zone) => [zone.id, zone.x]));
    const nodes = visibleNodes.flatMap<IRangeTopologyNode>((node) => {
        const zone = zoneById.get(node.zoneId);
        if (!zone) return [];
        const row = visibleNodes.filter(({ zoneId }) => zoneId === node.zoneId).findIndex(({ id }) => id === node.id);
        return [
            {
                id: node.id,
                label: node.label,
                ip: node.interfaces.find(({ address }) => Boolean(address))?.address ?? '',
                os: node.technology ?? '',
                services: getServices(node),
                type: getNodeType(node),
                vulnerabilities: vulnerabilityLabelsByNodeId.get(node.id) ?? [],
                x: formatCoordinate(zone.x + zone.width / 2),
                y: formatCoordinate((zone.y ?? CANVAS_PADDING) + ZONE_HEADER_HEIGHT + ZONE_INSET + NODE_HEIGHT / 2 + row * (NODE_HEIGHT + NODE_GAP)),
                zone: node.zoneId,
                role: node.purpose === 'real' || node.purpose === undefined ? 'primary' : 'decoy',
            },
        ];
    });
    const zoneEdges = relationships
        .filter(({ sourceId, targetId }) => (zoneDepthById.get(sourceId) ?? 0) < (zoneDepthById.get(targetId) ?? 0))
        .map(({ sourceId, targetId }) => [sourceId, targetId] as const);

    return {
        attackPath: getAttackPath(topology, visibleNodeIds),
        attackPaths: getAttackPaths(topology, visibleNodeIds),
        connections: getNetworkConnections(topology, visibleNodeIds),
        edges: getAttackEdges(topology, visibleNodeIds),
        networkConnectors: projectTopologyNetworkConnectors(topology, visibleZoneIds),
        nodeZoneLinks: getNodeZoneLinks(topology, visibleNodeIds, visibleZoneIds),
        nodes,
        viewBox: `0 0 ${canvasWidth} ${canvasHeight}`,
        zones,
        zoneEdges,
    };
};
