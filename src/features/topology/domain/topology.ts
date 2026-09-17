export type TopologyNodeKind = 'service' | 'external_actor';
export type TopologyNodePurpose = 'real' | 'decoy' | 'distractor';
export type TopologyEndpointType = 'node' | 'network';
export type TopologyProtocol = 'tcp' | 'udp';

export interface ITopologyZone {
    id: string;
    label: string;
}

export interface ITopologyNetwork {
    cidr?: string;
    id: string;
    label: string;
    zoneId: string;
}

export interface ITopologyPort {
    port: number;
    protocol: TopologyProtocol;
}

export interface ITopologyInterface {
    address?: string;
    networkId: string;
    ports?: readonly ITopologyPort[];
}

export interface ITopologyNode {
    id: string;
    interfaces: readonly ITopologyInterface[];
    kind: TopologyNodeKind;
    label: string;
    purpose?: TopologyNodePurpose;
    technology?: string;
    zoneId: string;
}

export interface ITopologyEntityReference {
    id: string;
    type: TopologyEndpointType;
}

export interface ITopologyLink {
    directed: boolean;
    id: string;
    source: ITopologyEntityReference;
    target: ITopologyEntityReference;
}

export interface ITopologyAttackPath {
    id: string;
    nodeIds: readonly string[];
}

export interface ITopologyDTO {
    attackPaths?: readonly ITopologyAttackPath[];
    links: readonly ITopologyLink[];
    networks: readonly ITopologyNetwork[];
    nodes: readonly ITopologyNode[];
    zones: readonly ITopologyZone[];
}

export interface ITopologySupplement {
    attackPaths?: readonly ITopologyAttackPath[];
    cidrByNetworkId?: Readonly<Record<string, string>>;
    portsByNodeId?: Readonly<Record<string, readonly ITopologyPort[]>>;
    purposeByNodeId?: Readonly<Record<string, TopologyNodePurpose>>;
    zoneByEntityId: Readonly<Record<string, string>>;
    zones: readonly ITopologyZone[];
}

export interface ITopologyConverterInput {
    mermaid: string;
    supplement: ITopologySupplement;
}
