import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';
import { createRangeHallFixture, getRangeEnvironmentFixture } from '@/test/fixtures/range';
import { parseTopology } from '@/features/topology/domain/validate-topology';
import { projectRangeDetailTopology } from '@/features/topology/layout/range-detail-topology-layout';

export type RangeEnvironmentStatus = 'available' | 'pending';

export interface IRangeTelemetry {
    label: string;
    value: string;
    isAlert?: boolean;
}

export interface IRangeTopologyNode {
    id: string;
    ip: string;
    label: string;
    os: string;
    role?: 'decoy' | 'primary';
    services: readonly string[];
    type: 'database' | 'device' | 'firewall' | 'server' | 'workstation';
    vulnerabilities: readonly string[];
    x: number;
    y: number;
    zone: string;
}

export interface IRangeTopologyZone {
    cidr?: string;
    height?: number;
    id: string;
    label: string;
    width: number;
    x: number;
    y?: number;
}

export interface IRangeTopologyNodeZoneLink {
    id: string;
    sourceNodeId: string;
    targetZoneId: string;
}

export interface IRangeTopologyNetworkConnector {
    cidr?: string;
    id: string;
    label: string;
    sourceNodeId: string;
    sourceZoneId: string;
    targetNodeIds?: readonly string[];
    targetZoneId: string;
}

export interface IRangeTopologyAttackPath {
    id: string;
    nodeIds: readonly string[];
}

export interface IRangeTopology {
    attackPath: readonly string[];
    attackPaths?: readonly IRangeTopologyAttackPath[];
    connections?: readonly (readonly [string, string])[];
    edges: readonly (readonly [string, string])[];
    networkConnectors?: readonly IRangeTopologyNetworkConnector[];
    nodeZoneLinks?: readonly IRangeTopologyNodeZoneLink[];
    nodes: readonly IRangeTopologyNode[];
    viewBox: string;
    zoneEdges?: readonly (readonly [string, string])[];
    zones: readonly IRangeTopologyZone[];
}

export interface IRangeEnvironment {
    agents: readonly string[];
    description: string;
    id: string;
    imageProfile: string;
    industry: string;
    isReal: boolean;
    killChain: readonly string[];
    name: string;
    networkScale: string;
    stages: readonly string[];
    status: RangeEnvironmentStatus;
    subnet: string;
    taskEnvironmentId: string;
    telemetry: readonly IRangeTelemetry[];
    topology: IRangeTopology;
    vulnerabilitySurface: string;
    warmup: string;
}

export interface IRangeHallData {
    environments: readonly IRangeEnvironment[];
}

interface IBackendListResponse<T> {
    list: T[];
}

interface IBackendRangeRow {
    allow_real_run?: boolean;
    can_quick_create_job?: boolean;
    estimated_duration_sec?: number;
    estimated_wait_sec?: number;
    industry?: string;
    name?: string;
    node_count?: number;
    range_id?: string;
    status?: string;
}

interface IBackendVulnerability {
    cve?: string;
    name?: string;
    node_id?: string;
    severity?: string;
    vulnerability_id?: string;
}

interface IBackendRangeDetail extends IBackendRangeRow {
    authorization?: {
        network_scopes?: string[];
    };
    description?: string;
    supported_agent_types?: string[];
    topology?: unknown;
    vulnerability_surface?: IBackendVulnerability[];
}

const EMPTY_TOPOLOGY: IRangeTopology = {
    attackPath: [],
    connections: [],
    edges: [],
    nodes: [],
    viewBox: '0 0 920 360',
    zones: [],
};

const RANGE_NODE_TYPES = ['database', 'device', 'firewall', 'server', 'workstation'] as const;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isRangeNodeType = (value: unknown): value is IRangeTopologyNode['type'] => RANGE_NODE_TYPES.some((nodeType) => nodeType === value);
const isRangeNodeRole = (value: unknown): value is NonNullable<IRangeTopologyNode['role']> => value === 'decoy' || value === 'primary';
const isStringPairArray = (value: unknown): value is [string, string][] =>
    Array.isArray(value) && value.every((edge) => Array.isArray(edge) && edge.length === 2 && edge.every((endpoint) => typeof endpoint === 'string'));
const isNodeZoneLinkArray = (value: unknown): value is IRangeTopologyNodeZoneLink[] =>
    Array.isArray(value) && value.every((link) => isRecord(link) && typeof link.id === 'string' && typeof link.sourceNodeId === 'string' && typeof link.targetZoneId === 'string');
const isNetworkConnectorArray = (value: unknown): value is IRangeTopologyNetworkConnector[] =>
    Array.isArray(value) &&
    value.every(
        (connector) =>
            isRecord(connector) &&
            typeof connector.id === 'string' &&
            typeof connector.label === 'string' &&
            typeof connector.sourceNodeId === 'string' &&
            typeof connector.sourceZoneId === 'string' &&
            (connector.targetNodeIds === undefined || isStringArray(connector.targetNodeIds)) &&
            typeof connector.targetZoneId === 'string' &&
            (connector.cidr === undefined || typeof connector.cidr === 'string'),
    );
const isAttackPathArray = (value: unknown): value is IRangeTopologyAttackPath[] =>
    Array.isArray(value) && value.every((path) => isRecord(path) && typeof path.id === 'string' && isStringArray(path.nodeIds) && path.nodeIds.length >= 2);

export const isRangeTopology = (value: unknown): value is IRangeTopology => {
    if (!isRecord(value) || typeof value.viewBox !== 'string' || !isStringArray(value.attackPath)) return false;
    if (!Array.isArray(value.zones) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) return false;

    const hasValidZones = value.zones.every(
        (zone) =>
            isRecord(zone) &&
            typeof zone.id === 'string' &&
            typeof zone.label === 'string' &&
            isFiniteNumber(zone.width) &&
            isFiniteNumber(zone.x) &&
            (zone.y === undefined || isFiniteNumber(zone.y)) &&
            (zone.height === undefined || isFiniteNumber(zone.height)) &&
            (zone.cidr === undefined || typeof zone.cidr === 'string'),
    );
    const hasValidNodes = value.nodes.every(
        (node) =>
            isRecord(node) &&
            typeof node.id === 'string' &&
            typeof node.ip === 'string' &&
            typeof node.label === 'string' &&
            typeof node.os === 'string' &&
            isStringArray(node.services) &&
            isRangeNodeType(node.type) &&
            isStringArray(node.vulnerabilities) &&
            isFiniteNumber(node.x) &&
            isFiniteNumber(node.y) &&
            typeof node.zone === 'string' &&
            (node.role === undefined || isRangeNodeRole(node.role)),
    );
    const hasValidEdges = isStringPairArray(value.edges);
    const hasValidConnections = value.connections === undefined || isStringPairArray(value.connections);
    const hasValidNetworkConnectors = value.networkConnectors === undefined || isNetworkConnectorArray(value.networkConnectors);
    const hasValidAttackPaths = value.attackPaths === undefined || isAttackPathArray(value.attackPaths);
    const hasValidNodeZoneLinks = value.nodeZoneLinks === undefined || isNodeZoneLinkArray(value.nodeZoneLinks);
    const hasValidZoneEdges = value.zoneEdges === undefined || isStringPairArray(value.zoneEdges);

    return hasValidZones && hasValidNodes && hasValidEdges && hasValidAttackPaths && hasValidConnections && hasValidNetworkConnectors && hasValidNodeZoneLinks && hasValidZoneEdges;
};

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const asNumber = (value: unknown): number | undefined => (isFiniteNumber(value) ? value : undefined);
const asStringArray = (value: unknown) => asArray(value).filter((item): item is string => typeof item === 'string');

const cloneTopology = (topology: IRangeTopology): IRangeTopology => ({
    ...topology,
    attackPath: [...topology.attackPath],
    ...(topology.attackPaths ? { attackPaths: topology.attackPaths.map((path) => ({ ...path, nodeIds: [...path.nodeIds] })) } : {}),
    ...(topology.connections ? { connections: topology.connections.map(([from, to]) => [from, to]) } : {}),
    edges: topology.edges.map(([from, to]) => [from, to]),
    ...(topology.networkConnectors
        ? { networkConnectors: topology.networkConnectors.map((connector) => ({ ...connector, ...(connector.targetNodeIds ? { targetNodeIds: [...connector.targetNodeIds] } : {}) })) }
        : {}),
    ...(topology.nodeZoneLinks ? { nodeZoneLinks: topology.nodeZoneLinks.map((link) => ({ ...link })) } : {}),
    nodes: topology.nodes.map((node) => ({ ...node, services: [...node.services], vulnerabilities: [...node.vulnerabilities] })),
    zones: topology.zones.map((zone) => ({ ...zone })),
    ...(topology.zoneEdges ? { zoneEdges: topology.zoneEdges.map(([from, to]) => [from, to]) } : {}),
});

const normalizeNodeType = (value: unknown): IRangeTopologyNode['type'] => {
    const nodeType = asString(value).toLowerCase();
    if (nodeType.includes('database') || nodeType.includes('db')) return 'database';
    if (nodeType.includes('firewall') || nodeType.includes('security')) return 'firewall';
    if (nodeType.includes('attacker') || nodeType.includes('workstation')) return 'workstation';
    if (nodeType.includes('network')) return 'device';
    if (nodeType.includes('server') || nodeType.includes('vuln') || nodeType.includes('service')) return 'server';
    return 'device';
};

const getVulnerabilityLabel = (vulnerability: IBackendVulnerability) => vulnerability.name || vulnerability.cve || vulnerability.vulnerability_id || '';

const adaptAttackPaths = (value: unknown): IRangeTopologyAttackPath[] =>
    asArray(value).flatMap((item, index) => {
        if (Array.isArray(item)) {
            const nodeIds = asStringArray(item);
            return nodeIds.length >= 2 ? [{ id: `attack-path-${index + 1}`, nodeIds }] : [];
        }
        const path = asRecord(item);
        const nodeIds = asStringArray(path.nodeIds ?? path.node_ids ?? path.nodes);
        return nodeIds.length >= 2 ? [{ id: asString(path.id, `attack-path-${index + 1}`), nodeIds }] : [];
    });

export const adaptRangeTopology = (value: unknown, vulnerabilities: readonly IBackendVulnerability[] = []): IRangeTopology => {
    if (isRangeTopology(value)) return cloneTopology(value);

    const topology = asRecord(value);
    if (Array.isArray(topology.zones) && Array.isArray(topology.networks) && Array.isArray(topology.nodes) && Array.isArray(topology.links)) {
        const canonicalTopology = parseTopology(value);
        const vulnerabilityLabelsByNodeId = new Map(
            canonicalTopology.nodes.map(({ id }) => [
                id,
                vulnerabilities
                    .filter(({ node_id }) => node_id === id)
                    .map(getVulnerabilityLabel)
                    .filter(Boolean),
            ]),
        );
        return projectRangeDetailTopology({ topology: canonicalTopology, vulnerabilityLabelsByNodeId });
    }

    const vulnerabilityById = new Map(vulnerabilities.map((item) => [item.vulnerability_id, getVulnerabilityLabel(item)]));
    const rawNodes = asArray(topology.nodes).map(asRecord);
    const isLegacyNetworkNode = (node: Record<string, unknown>) => asString(node.node_type).toLowerCase().includes('network');
    const rawNetworkNodes = rawNodes.filter(isLegacyNetworkNode);
    const rawServiceNodes = rawNodes.filter((node) => !isLegacyNetworkNode(node));
    const nodes = rawServiceNodes.flatMap<IRangeTopologyNode>((node) => {
        const id = asString(node.node_id);
        const x = asNumber(node.x);
        const y = asNumber(node.y);
        if (!id || x === undefined || y === undefined) return [];

        return [
            {
                id,
                label: asString(node.name, id),
                ip: asString(node.ip),
                type: normalizeNodeType(node.node_type),
                os: asString(node.os),
                services: asStringArray(node.services),
                vulnerabilities: asStringArray(node.vulnerability_ids).map((vulnerabilityId) => vulnerabilityById.get(vulnerabilityId) || vulnerabilityId),
                x,
                y,
                zone: asString(node.zone),
            },
        ];
    });

    if (nodes.length === 0) return cloneTopology(EMPTY_TOPOLOGY);

    const zoneIds = [...new Set(nodes.map(({ zone }) => zone).filter(Boolean))];
    const zones = zoneIds.map((zoneId) => {
        const zoneNodes = nodes.filter(({ zone }) => zone === zoneId);
        const minimumX = Math.min(...zoneNodes.map(({ x }) => x));
        const maximumX = Math.max(...zoneNodes.map(({ x }) => x));
        return { id: zoneId, label: zoneId, x: Math.max(0, minimumX - 60), width: Math.max(140, maximumX - minimumX + 120) };
    });
    const rawEdges = asArray(topology.edges).map(asRecord);
    const edges = rawEdges.map((edge) => [asString(edge.source), asString(edge.target)] as const).filter(([source, target]) => source.length > 0 && target.length > 0);
    const rawNodeById = new Map(rawNodes.map((node) => [asString(node.node_id), node]));
    const networkConnectors = rawNetworkNodes.flatMap<IRangeTopologyNetworkConnector>((networkNode) => {
        const networkId = asString(networkNode.node_id);
        const targetZoneId = asString(networkNode.zone);
        if (!networkId || !targetZoneId) return [];
        const sourceNode = rawEdges
            .flatMap((edge) => {
                const sourceId = asString(edge.source);
                const targetId = asString(edge.target);
                if (sourceId === networkId) return [rawNodeById.get(targetId)];
                if (targetId === networkId) return [rawNodeById.get(sourceId)];
                return [];
            })
            .find((candidate) => candidate && !isLegacyNetworkNode(candidate) && asString(candidate.zone) && asString(candidate.zone) !== targetZoneId);
        if (!sourceNode) return [];
        const sourceNodeId = asString(sourceNode.node_id);
        const sourceZoneId = asString(sourceNode.zone);
        if (!sourceNodeId || !sourceZoneId) return [];
        const targetNodeIds = rawEdges
            .flatMap((edge) => {
                const sourceId = asString(edge.source);
                const targetId = asString(edge.target);
                if (sourceId === networkId) return [rawNodeById.get(targetId)];
                if (targetId === networkId) return [rawNodeById.get(sourceId)];
                return [];
            })
            .filter((candidate): candidate is Record<string, unknown> => candidate !== undefined && !isLegacyNetworkNode(candidate))
            .filter((candidate) => asString(candidate.zone) === targetZoneId)
            .map((candidate) => asString(candidate.node_id))
            .filter((nodeId, index, nodeIds) => Boolean(nodeId) && nodeIds.indexOf(nodeId) === index);
        const cidr = asString(networkNode.cidr);
        return [
            {
                id: networkId,
                label: asString(networkNode.name, networkId),
                sourceNodeId,
                sourceZoneId,
                targetNodeIds,
                targetZoneId,
                ...(cidr ? { cidr } : {}),
            },
        ];
    });
    const nodeZoneLinkIds = new Set<string>();
    const nodeZoneLinks = rawEdges.flatMap<NonNullable<IRangeTopology['nodeZoneLinks']>[number]>((edge) => {
        const sourceNodeId = asString(edge.source);
        const targetNodeId = asString(edge.target);
        const sourceNode = rawNodeById.get(sourceNodeId);
        const targetNode = rawNodeById.get(targetNodeId);
        if (!sourceNode || !targetNode) return [];
        const sourceNodeType = asString(sourceNode.node_type).toLowerCase();
        const targetNodeType = asString(targetNode.node_type).toLowerCase();
        const sourceZone = asString(sourceNode.zone);
        const targetZoneId = asString(targetNode.zone);
        if (sourceNodeType.includes('network') || !targetNodeType.includes('network') || !sourceZone || !targetZoneId || sourceZone === targetZoneId) return [];
        const nodeZoneLinkId = `${sourceNodeId}→${targetZoneId}`;
        if (nodeZoneLinkIds.has(nodeZoneLinkId)) return [];
        nodeZoneLinkIds.add(nodeZoneLinkId);
        return [{ id: asString(edge.edge_id, `${sourceNodeId}-${targetNodeId}`), sourceNodeId, targetZoneId }];
    });
    const attackPath = asArray(topology.attack_path)
        .map((item) => (typeof item === 'string' ? item : asString(asRecord(item).node_id)))
        .filter(Boolean);
    const attackPaths = adaptAttackPaths(topology.attackPaths ?? topology.attack_paths);
    const maximumX = Math.max(...nodes.map(({ x }) => x), 820);
    const maximumY = Math.max(...nodes.map(({ y }) => y), 260);

    return {
        attackPath: attackPaths[0]?.nodeIds ?? attackPath,
        ...(attackPaths.length > 0 ? { attackPaths } : {}),
        connections: edges,
        edges,
        networkConnectors,
        nodeZoneLinks,
        nodes,
        viewBox: `0 0 ${maximumX + 100} ${maximumY + 100}`,
        zones,
    };
};

const formatVulnerabilitySurface = (vulnerabilities: readonly IBackendVulnerability[]) =>
    vulnerabilities
        .map((item) => [item.cve, item.name, item.severity].filter(Boolean).join(' · '))
        .filter(Boolean)
        .join('；');

export const adaptRangeEnvironment = (range: IBackendRangeRow | IBackendRangeDetail): IRangeEnvironment => {
    const detail = range as IBackendRangeDetail;
    const vulnerabilities = detail.vulnerability_surface ?? [];
    const nodeCount = range.node_count ?? asArray(asRecord(detail.topology).nodes).length;

    return {
        id: range.range_id ?? '',
        taskEnvironmentId: range.range_id ?? '',
        name: range.name ?? '',
        description: detail.description ?? '',
        industry: range.industry ?? '',
        isReal: range.allow_real_run === true,
        status: range.status === 'ACTIVE' && range.can_quick_create_job === true ? 'available' : 'pending',
        networkScale: nodeCount > 0 ? String(nodeCount) : '',
        imageProfile: '',
        warmup: '',
        agents: detail.supported_agent_types ?? [],
        stages: [],
        killChain: [],
        subnet: detail.authorization?.network_scopes?.join(' / ') ?? '',
        vulnerabilitySurface: formatVulnerabilitySurface(vulnerabilities),
        telemetry: [],
        topology: adaptRangeTopology(detail.topology, vulnerabilities),
    };
};

const requireResponseData = <T>(data: T | null | undefined, resource: string): T => {
    if (!data) throw new Error(`${resource} response is empty`);
    return data;
};

export const getRangeHallData = async (): Promise<IRangeHallData> => {
    if (IS_DEMO_MODE) return createRangeHallFixture();
    const response = await Http.get<never, IBackendListResponse<IBackendRangeRow>>('/api/v1/ranges?page=1&page_size=100', { forbidMsg: true });
    const data = requireResponseData(response.data, 'Ranges');
    if (!Array.isArray(data.list)) throw new Error('Ranges response is invalid');
    return { environments: data.list.map(adaptRangeEnvironment) };
};

export const getRangeEnvironmentDetail = async (environmentId: string): Promise<IRangeEnvironment> => {
    if (IS_DEMO_MODE) return getRangeEnvironmentFixture(environmentId);
    const normalizedEnvironmentId = environmentId.trim();
    if (!normalizedEnvironmentId || normalizedEnvironmentId.length > 256) throw new Error('environmentId is invalid');
    const response = await Http.get<never, IBackendRangeDetail>(`/api/v1/ranges/${encodeURIComponent(normalizedEnvironmentId)}`, { forbidMsg: true });
    return adaptRangeEnvironment(requireResponseData(response.data, 'Range detail'));
};
