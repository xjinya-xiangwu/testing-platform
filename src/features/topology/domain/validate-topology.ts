import {
    ITopologyAttackPath,
    ITopologyDTO,
    ITopologyEntityReference,
    ITopologyInterface,
    ITopologyLink,
    ITopologyNetwork,
    ITopologyNode,
    ITopologyPort,
    ITopologySupplement,
    ITopologyZone,
    TopologyEndpointType,
    TopologyNodeKind,
    TopologyNodePurpose,
    TopologyProtocol,
} from '@/features/topology/domain/topology';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const PURPOSES = new Set<TopologyNodePurpose>(['real', 'decoy', 'distractor']);
const PROTOCOLS = new Set<TopologyProtocol>(['tcp', 'udp']);
const NODE_KINDS = new Set<TopologyNodeKind>(['service', 'external_actor']);
const ENDPOINT_TYPES = new Set<TopologyEndpointType>(['node', 'network']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const assertAllowedKeys = (value: Record<string, unknown>, allowed: readonly string[], scope: string) => {
    const allowedKeys = new Set(allowed);
    const unknownKey = Object.keys(value).find((key) => !allowedKeys.has(key));
    if (unknownKey) throw new Error(`${scope} contains unsupported field: ${unknownKey}`);
};

const assertId: (value: unknown, scope: string) => asserts value is string = (value, scope) => {
    if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new Error(`${scope} has invalid id: ${String(value)}`);
};

const assertNonEmptyString: (value: unknown, scope: string) => asserts value is string = (value, scope) => {
    if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${scope} must be a non-empty string`);
};

const uniqueIds = (scope: string, values: readonly string[]) => {
    const seen = new Set<string>();
    values.forEach((value) => {
        if (seen.has(value)) throw new Error(`${scope} contains duplicate id: ${value}`);
        seen.add(value);
    });
    return seen;
};

const parsePort = (value: unknown, scope: string): ITopologyPort => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    assertAllowedKeys(value, ['protocol', 'port'], scope);
    if (!PROTOCOLS.has(value.protocol as TopologyProtocol)) throw new Error(`${scope} has unsupported protocol: ${String(value.protocol)}`);
    if (!Number.isInteger(value.port) || Number(value.port) < 1 || Number(value.port) > 65535) throw new Error(`${scope} has invalid port: ${String(value.port)}`);
    return { protocol: value.protocol as TopologyProtocol, port: Number(value.port) };
};

const parseZone = (value: unknown, scope: string): ITopologyZone => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    assertAllowedKeys(value, ['id', 'label'], scope);
    assertId(value.id, scope);
    assertNonEmptyString(value.label, `${scope}.label`);
    return { id: value.id, label: value.label };
};

const parseAttackPath = (value: unknown, scope: string): ITopologyAttackPath => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    assertAllowedKeys(value, ['id', 'nodeIds'], scope);
    assertId(value.id, scope);
    if (!Array.isArray(value.nodeIds) || value.nodeIds.length < 2) throw new Error(`${scope}.nodeIds must contain at least two nodes`);
    const nodeIds = value.nodeIds.map((nodeId, index) => {
        assertId(nodeId, `${scope}.nodeIds[${index}]`);
        return nodeId;
    });
    return { id: value.id, nodeIds };
};

const parseNetwork = (value: unknown, scope: string): ITopologyNetwork => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    assertAllowedKeys(value, ['id', 'label', 'zoneId', 'cidr'], scope);
    assertId(value.id, scope);
    assertNonEmptyString(value.label, `${scope}.label`);
    assertId(value.zoneId, `${scope}.zoneId`);
    if (value.cidr !== undefined) assertNonEmptyString(value.cidr, `${scope}.cidr`);
    return { id: value.id, label: value.label, zoneId: value.zoneId, ...(value.cidr ? { cidr: value.cidr } : {}) };
};

const parseInterface = (value: unknown, scope: string): ITopologyInterface => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    assertAllowedKeys(value, ['networkId', 'address', 'ports'], scope);
    assertId(value.networkId, `${scope}.networkId`);
    if (value.address !== undefined) assertNonEmptyString(value.address, `${scope}.address`);
    if (value.ports !== undefined && !Array.isArray(value.ports)) throw new Error(`${scope}.ports must be an array`);
    const ports = value.ports?.map((port, index) => parsePort(port, `${scope}.ports[${index}]`));
    return { networkId: value.networkId, ...(value.address ? { address: value.address } : {}), ...(ports ? { ports } : {}) };
};

const parseNode = (value: unknown, scope: string): ITopologyNode => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    assertAllowedKeys(value, ['id', 'label', 'kind', 'zoneId', 'interfaces', 'purpose', 'technology'], scope);
    assertId(value.id, scope);
    assertNonEmptyString(value.label, `${scope}.label`);
    assertId(value.zoneId, `${scope}.zoneId`);
    if (!NODE_KINDS.has(value.kind as TopologyNodeKind)) throw new Error(`${scope}.kind is invalid`);
    if (!Array.isArray(value.interfaces)) throw new Error(`${scope}.interfaces must be an array`);
    if (value.purpose !== undefined && !PURPOSES.has(value.purpose as TopologyNodePurpose)) throw new Error(`${scope}.purpose is invalid`);
    if (value.technology !== undefined) assertNonEmptyString(value.technology, `${scope}.technology`);
    const interfaces = value.interfaces.map((networkInterface, index) => parseInterface(networkInterface, `${scope}.interfaces[${index}]`));
    return {
        id: value.id,
        label: value.label,
        kind: value.kind as TopologyNodeKind,
        zoneId: value.zoneId,
        interfaces,
        ...(value.purpose ? { purpose: value.purpose as TopologyNodePurpose } : {}),
        ...(value.technology ? { technology: value.technology } : {}),
    };
};

const parseEntityReference = (value: unknown, scope: string): ITopologyEntityReference => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    assertAllowedKeys(value, ['type', 'id'], scope);
    if (!ENDPOINT_TYPES.has(value.type as TopologyEndpointType)) throw new Error(`${scope}.type is invalid`);
    assertId(value.id, `${scope}.id`);
    return { type: value.type as TopologyEndpointType, id: value.id };
};

const parseLink = (value: unknown, scope: string): ITopologyLink => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    assertAllowedKeys(value, ['id', 'source', 'target', 'directed'], scope);
    assertId(value.id, scope);
    if (typeof value.directed !== 'boolean') throw new Error(`${scope}.directed must be a boolean`);
    return {
        id: value.id,
        source: parseEntityReference(value.source, `${scope}.source`),
        target: parseEntityReference(value.target, `${scope}.target`),
        directed: value.directed,
    };
};

const parseStringMap = (value: unknown, scope: string): Record<string, string> => {
    if (!isRecord(value)) throw new Error(`${scope} must be an object`);
    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => {
            assertId(key, scope);
            assertNonEmptyString(item, `${scope}.${key}`);
            return [key, item];
        }),
    );
};

export const parseTopologySupplement = (value: unknown): ITopologySupplement => {
    if (!isRecord(value)) throw new Error('Topology supplement must be an object');
    assertAllowedKeys(value, ['zones', 'zoneByEntityId', 'cidrByNetworkId', 'portsByNodeId', 'purposeByNodeId', 'attackPaths'], 'Topology supplement');
    if (!Array.isArray(value.zones)) throw new Error('Topology supplement zones must be an array');
    const zones = value.zones.map((zone, index) => parseZone(zone, `Topology supplement zones[${index}]`));
    uniqueIds(
        'Topology supplement zones',
        zones.map((zone) => zone.id),
    );
    const zoneByEntityId = parseStringMap(value.zoneByEntityId, 'Topology supplement zoneByEntityId');
    const cidrByNetworkId = value.cidrByNetworkId === undefined ? undefined : parseStringMap(value.cidrByNetworkId, 'Topology supplement cidrByNetworkId');
    let portsByNodeId: Record<string, readonly ITopologyPort[]> | undefined;
    if (value.portsByNodeId !== undefined) {
        if (!isRecord(value.portsByNodeId)) throw new Error('Topology supplement portsByNodeId must be an object');
        portsByNodeId = Object.fromEntries(
            Object.entries(value.portsByNodeId).map(([nodeId, ports]) => {
                assertId(nodeId, 'Topology supplement portsByNodeId');
                if (!Array.isArray(ports)) throw new Error(`Topology supplement portsByNodeId.${nodeId} must be an array`);
                return [nodeId, ports.map((port, index) => parsePort(port, `Topology supplement portsByNodeId.${nodeId}[${index}]`))];
            }),
        );
    }
    let purposeByNodeId: Record<string, TopologyNodePurpose> | undefined;
    if (value.purposeByNodeId !== undefined) {
        if (!isRecord(value.purposeByNodeId)) throw new Error('Topology supplement purposeByNodeId must be an object');
        purposeByNodeId = Object.fromEntries(
            Object.entries(value.purposeByNodeId).map(([nodeId, purpose]) => {
                assertId(nodeId, 'Topology supplement purposeByNodeId');
                if (!PURPOSES.has(purpose as TopologyNodePurpose)) throw new Error(`Topology supplement purposeByNodeId.${nodeId} is invalid`);
                return [nodeId, purpose as TopologyNodePurpose];
            }),
        );
    }
    const attackPaths =
        value.attackPaths === undefined
            ? undefined
            : Array.isArray(value.attackPaths)
              ? value.attackPaths.map((path, index) => parseAttackPath(path, `Topology supplement attackPaths[${index}]`))
              : undefined;
    if (value.attackPaths !== undefined && !attackPaths) throw new Error('Topology supplement attackPaths must be an array');

    return { zones, zoneByEntityId, cidrByNetworkId, portsByNodeId, purposeByNodeId, attackPaths };
};

export const parseTopology = (value: unknown): ITopologyDTO => {
    if (!isRecord(value)) throw new Error('Topology must be an object');
    assertAllowedKeys(value, ['zones', 'networks', 'nodes', 'links', 'attackPaths'], 'Topology');
    if (!Array.isArray(value.zones)) throw new Error('Topology zones must be an array');
    if (!Array.isArray(value.networks)) throw new Error('Topology networks must be an array');
    if (!Array.isArray(value.nodes)) throw new Error('Topology nodes must be an array');
    if (!Array.isArray(value.links)) throw new Error('Topology links must be an array');
    if (value.attackPaths !== undefined && !Array.isArray(value.attackPaths)) throw new Error('Topology attackPaths must be an array');

    const topology: ITopologyDTO = {
        zones: value.zones.map((zone, index) => parseZone(zone, `Topology zones[${index}]`)),
        networks: value.networks.map((network, index) => parseNetwork(network, `Topology networks[${index}]`)),
        nodes: value.nodes.map((node, index) => parseNode(node, `Topology nodes[${index}]`)),
        links: value.links.map((link, index) => parseLink(link, `Topology links[${index}]`)),
        ...(value.attackPaths ? { attackPaths: value.attackPaths.map((path, index) => parseAttackPath(path, `Topology attackPaths[${index}]`)) } : {}),
    };
    validateTopology(topology);
    return topology;
};

export const validateTopology = (topology: ITopologyDTO): void => {
    const zoneIds = uniqueIds(
        'zones',
        topology.zones.map((zone) => zone.id),
    );
    const networkIds = uniqueIds(
        'networks',
        topology.networks.map((network) => network.id),
    );
    const nodeIds = uniqueIds(
        'nodes',
        topology.nodes.map((node) => node.id),
    );
    uniqueIds(
        'links',
        topology.links.map((link) => link.id),
    );
    uniqueIds(
        'attackPaths',
        (topology.attackPaths ?? []).map((path) => path.id),
    );

    topology.zones.forEach((zone) => {
        assertId(zone.id, 'zone');
        assertNonEmptyString(zone.label, `zone ${zone.id}.label`);
    });
    topology.networks.forEach((network) => {
        assertId(network.id, 'network');
        if (!zoneIds.has(network.zoneId)) throw new Error(`Unknown zone ${network.zoneId} for network ${network.id}`);
    });
    topology.nodes.forEach((node) => {
        assertId(node.id, 'node');
        if (!zoneIds.has(node.zoneId)) throw new Error(`Unknown zone ${node.zoneId} for node ${node.id}`);
        node.interfaces.forEach((networkInterface) => {
            if (!networkIds.has(networkInterface.networkId)) throw new Error(`Unknown network ${networkInterface.networkId} on node ${node.id}`);
        });
    });
    topology.links.forEach((link) => {
        const sourceIds = link.source.type === 'node' ? nodeIds : networkIds;
        const targetIds = link.target.type === 'node' ? nodeIds : networkIds;
        if (!sourceIds.has(link.source.id)) throw new Error(`Unknown source ${link.source.type}:${link.source.id} on link ${link.id}`);
        if (!targetIds.has(link.target.id)) throw new Error(`Unknown target ${link.target.type}:${link.target.id} on link ${link.id}`);
    });
    (topology.attackPaths ?? []).forEach((path) => {
        if (path.nodeIds.length < 2) throw new Error(`Attack path ${path.id} must contain at least two nodes`);
        path.nodeIds.forEach((nodeId) => {
            if (!nodeIds.has(nodeId)) throw new Error(`Unknown node ${nodeId} on attack path ${path.id}`);
        });
    });
};
