import type { IRangeTopologyNetworkConnector } from '@/api/range';
import type { ITopologyDTO } from '@/features/topology/domain/topology';

export const projectTopologyNetworkConnectors = (topology: ITopologyDTO, visibleZoneIds: ReadonlySet<string>): IRangeTopologyNetworkConnector[] => {
    const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));

    return topology.networks.flatMap<IRangeTopologyNetworkConnector>((network) => {
        if (!visibleZoneIds.has(network.zoneId)) return [];
        const connectedNodes = topology.links
            .flatMap((link) => {
                if (link.source.type === 'network' && link.source.id === network.id && link.target.type === 'node') return [nodeById.get(link.target.id)];
                if (link.target.type === 'network' && link.target.id === network.id && link.source.type === 'node') return [nodeById.get(link.source.id)];
                return [];
            })
            .filter((node): node is NonNullable<typeof node> => Boolean(node));
        const sourceNode = connectedNodes.find((node) => node.zoneId !== network.zoneId);
        if (!sourceNode) return [];
        const targetNodeIds = connectedNodes
            .filter((node) => node.zoneId === network.zoneId)
            .map(({ id }) => id)
            .filter((nodeId, index, nodeIds) => nodeIds.indexOf(nodeId) === index);
        return [
            {
                id: network.id,
                label: network.label,
                sourceNodeId: sourceNode.id,
                sourceZoneId: sourceNode.zoneId,
                targetNodeIds,
                targetZoneId: network.zoneId,
                ...(network.cidr ? { cidr: network.cidr } : {}),
            },
        ];
    });
};
