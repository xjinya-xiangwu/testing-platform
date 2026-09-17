import type { IRangeTopology, IRangeTopologyNode } from '@/api/range';
import type { ITopologyDTO, ITopologyEntityReference, ITopologyNode } from '@/features/topology/domain/topology';
import { projectTopologyNetworkConnectors } from '@/features/topology/layout/topology-network-connectors';

const ZONE_WIDTH = 252;
const ZONE_GAP = 52;

const getNodeType = (node: ITopologyNode): IRangeTopologyNode['type'] => {
    if (node.kind === 'external_actor') return 'workstation';
    const signature = `${node.id} ${node.label} ${node.technology ?? ''}`.toLowerCase();
    if (/mysql|postgres|redis|database|db\b|neo4j|cassandra|influx|clickhouse|qdrant|typesense|mongo|couch|solr|scylla/.test(signature)) return 'database';
    if (/antivirus|firewall|security|vault/.test(signature)) return 'firewall';
    if (/network|router|switch|gateway|squid|iperf/.test(signature)) return 'device';
    return 'server';
};

const getServices = (node: ITopologyNode) =>
    node.interfaces.flatMap(({ ports = [] }) => ports.map(({ port, protocol }) => `${protocol.toUpperCase()} :${port}`)).filter((service, index, services) => services.indexOf(service) === index);

const getEndpointZoneId = (endpoint: ITopologyEntityReference, nodeZoneById: ReadonlyMap<string, string>, networkZoneById: ReadonlyMap<string, string>) =>
    endpoint.type === 'node' ? nodeZoneById.get(endpoint.id) : networkZoneById.get(endpoint.id);

const getAttackEdges = (topology: ITopologyDTO) => {
    const edgeIds = new Set<string>();
    return (topology.attackPaths ?? []).flatMap(({ nodeIds }) =>
        nodeIds.slice(0, -1).flatMap<readonly [string, string]>((sourceId, index) => {
            const targetId = nodeIds[index + 1];
            const edgeId = `${sourceId}->${targetId}`;
            if (!targetId || sourceId === targetId || edgeIds.has(edgeId)) return [];
            edgeIds.add(edgeId);
            return [[sourceId, targetId]];
        }),
    );
};

const getZoneEdges = (topology: ITopologyDTO) => {
    const nodeZoneById = new Map(topology.nodes.map(({ id, zoneId }) => [id, zoneId]));
    const networkZoneById = new Map(topology.networks.map(({ id, zoneId }) => [id, zoneId]));
    const zoneOrderById = new Map(topology.zones.map(({ id }, index) => [id, index]));
    const externalZoneIds = new Set(topology.nodes.filter(({ kind }) => kind === 'external_actor').map(({ zoneId }) => zoneId));
    const orderedZoneIndex = (zoneId: string) => (externalZoneIds.has(zoneId) ? -1 : (zoneOrderById.get(zoneId) ?? Number.MAX_SAFE_INTEGER));
    const edgeIds = new Set<string>();
    const addEdge = (sourceId: string | undefined, targetId: string | undefined) => {
        if (!sourceId || !targetId || sourceId === targetId) return [];
        const [fromId, toId] = orderedZoneIndex(sourceId) <= orderedZoneIndex(targetId) ? [sourceId, targetId] : [targetId, sourceId];
        const edgeId = `${fromId}->${toId}`;
        if (edgeIds.has(edgeId)) return [];
        edgeIds.add(edgeId);
        return [[fromId, toId] as const];
    };

    const attackZoneEdges = (topology.attackPaths ?? []).flatMap(({ nodeIds }) =>
        nodeIds.slice(0, -1).flatMap((sourceNodeId, index) => addEdge(nodeZoneById.get(sourceNodeId), nodeZoneById.get(nodeIds[index + 1] ?? ''))),
    );
    const structuralZoneEdges = topology.links.flatMap((link) => addEdge(getEndpointZoneId(link.source, nodeZoneById, networkZoneById), getEndpointZoneId(link.target, nodeZoneById, networkZoneById)));
    return [...attackZoneEdges, ...structuralZoneEdges];
};

export const projectWorkbenchTopology = (topology: ITopologyDTO): IRangeTopology => {
    const attackPaths = (topology.attackPaths ?? []).map(({ id, nodeIds }) => ({ id, nodeIds: [...nodeIds] }));
    const cidrByZoneId = new Map(topology.networks.filter(({ cidr }) => Boolean(cidr)).map(({ zoneId, cidr }) => [zoneId, cidr]));
    const externalZoneIds = new Set(topology.nodes.filter(({ kind }) => kind === 'external_actor').map(({ zoneId }) => zoneId));
    const orderedZones = [...topology.zones].sort((left, right) => Number(externalZoneIds.has(right.id)) - Number(externalZoneIds.has(left.id)));
    const visibleZoneIds = new Set(orderedZones.map(({ id }) => id));

    return {
        attackPath: attackPaths[0]?.nodeIds ?? [],
        ...(attackPaths.length > 0 ? { attackPaths } : {}),
        edges: getAttackEdges(topology),
        networkConnectors: projectTopologyNetworkConnectors(topology, visibleZoneIds),
        nodes: topology.nodes.map((node) => ({
            id: node.id,
            ip: node.interfaces.find(({ address }) => Boolean(address))?.address ?? '',
            label: node.label,
            os: node.technology ?? '',
            role: node.purpose === 'real' || node.purpose === undefined ? 'primary' : 'decoy',
            services: getServices(node),
            type: getNodeType(node),
            vulnerabilities: [],
            x: 0,
            y: 0,
            zone: node.zoneId,
        })),
        viewBox: '0 0 920 430',
        zoneEdges: getZoneEdges(topology),
        zones: orderedZones.map((zone, index) => ({
            id: zone.id,
            label: zone.label,
            width: ZONE_WIDTH,
            x: index * (ZONE_WIDTH + ZONE_GAP),
            ...(cidrByZoneId.get(zone.id) ? { cidr: cidrByZoneId.get(zone.id) } : {}),
        })),
    };
};
