import { getRangeNodeDisplayLabel, getRangeTopologyLayout, type IRangeTopologyNetworkConnectorLayout, type IRangeTopologyZoneLayout } from '@/pages/range/components/range-topology-layout';
import type { IRangeTopology, IRangeTopologyNode } from '@/api/range';

const MAX_LABEL_LENGTH = 26;
const NODE_CARD_GAP = 6;
const NODE_CARD_HEIGHT = 42;
const NODE_CARD_INSET = 14;
const ZONE_HEADER_HEIGHT = 42;
const ZONE_NODE_TOP_GAP = 10;

interface IWorkbenchTopologyNodeView extends IRangeTopologyNode {
    displayLabel: string;
    row: number;
}

export interface IWorkbenchTopologyZoneView extends IRangeTopologyZoneLayout {
    nodeCount: number;
}

export interface IWorkbenchTopologyEdgeView {
    path: string;
    sourceId: string;
    targetId: string;
}

export interface IWorkbenchTopologyAttackRouteView {
    id: string;
    nodeIds: readonly string[];
    segments: readonly IWorkbenchTopologyEdgeView[];
}

export interface IWorkbenchTopologyNetworkEdgeView {
    id: string;
    networkId: string;
    nodeId: string;
    path: string;
    side: 'source' | 'target';
}

interface IWorkbenchTopologyStructuralEdgeView {
    id: string;
    path: string;
    sourceZoneId: string;
    targetZoneId: string;
}

export interface IWorkbenchTopologyView {
    attackRoutes: readonly IWorkbenchTopologyAttackRouteView[];
    canvasHeight: number;
    canvasWidth: number;
    edges: readonly IWorkbenchTopologyEdgeView[];
    externalNodes: readonly IWorkbenchTopologyNodeView[];
    networkConnectors: readonly IRangeTopologyNetworkConnectorLayout[];
    networkEdges: readonly IWorkbenchTopologyNetworkEdgeView[];
    nodes: readonly IWorkbenchTopologyNodeView[];
    structuralEdges: readonly IWorkbenchTopologyStructuralEdgeView[];
    viewBox: string;
    zones: readonly IWorkbenchTopologyZoneView[];
}

const isExternalNode = (node: IRangeTopologyNode) => {
    const nodeId = node.id.toLowerCase();
    const zoneId = node.zone.toLowerCase();
    return nodeId === 'attacker' || nodeId.includes('external-attacker') || zoneId === 'internet' || zoneId === 'external';
};

const shortenLabel = (label: string) => {
    const characters = [...getRangeNodeDisplayLabel(label)];
    return characters.length > MAX_LABEL_LENGTH ? `${characters.slice(0, MAX_LABEL_LENGTH - 1).join('')}…` : characters.join('');
};

const getNumericPrefix = (node: IRangeTopologyNode) => Number(node.label.match(/^\D*(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
const getRoleOrder = (node: IRangeTopologyNode) => (node.role === 'decoy' ? 1 : 0);

const getAttackPaths = (topology: IRangeTopology) => {
    if (topology.attackPaths && topology.attackPaths.length > 0) return topology.attackPaths;
    return topology.attackPath.length >= 2 ? [{ id: 'legacy-attack-path', nodeIds: topology.attackPath }] : [];
};

const getPathEdgePairs = (nodeIds: readonly string[]) =>
    nodeIds.slice(0, -1).flatMap((sourceId, index) => {
        const targetId = nodeIds[index + 1];
        return sourceId && targetId && sourceId !== targetId ? [{ sourceId, targetId }] : [];
    });

const getUniqueEdgePairs = (topology: IRangeTopology) => {
    const seen = new Set<string>();
    return getAttackPaths(topology)
        .flatMap(({ nodeIds }) => getPathEdgePairs(nodeIds))
        .filter(({ sourceId, targetId }) => {
            const edgeId = `${sourceId}→${targetId}`;
            if (seen.has(edgeId)) return false;
            seen.add(edgeId);
            return true;
        });
};

const formatCoordinate = (value: number) => Number(value.toFixed(1));

const getZoneEdges = (topology: IRangeTopology, edgePairs: readonly { sourceId: string; targetId: string }[]) => {
    if (topology.zoneEdges && topology.zoneEdges.length > 0) return topology.zoneEdges;
    const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
    const edgeIds = new Set<string>();
    return edgePairs.flatMap<readonly [string, string]>(({ sourceId, targetId }) => {
        const sourceZoneId = nodeById.get(sourceId)?.zone;
        const targetZoneId = nodeById.get(targetId)?.zone;
        const edgeId = `${sourceZoneId}→${targetZoneId}`;
        if (!sourceZoneId || !targetZoneId || sourceZoneId === targetZoneId || edgeIds.has(edgeId)) return [];
        edgeIds.add(edgeId);
        return [[sourceZoneId, targetZoneId]];
    });
};

const getOrthogonalPath = (
    source: IWorkbenchTopologyNodeView,
    target: IWorkbenchTopologyNodeView,
    sourceZone: IWorkbenchTopologyZoneView,
    targetZone: IWorkbenchTopologyZoneView,
    edgeIndex: number,
) => {
    const nodeHalfWidth = (sourceZone.width - NODE_CARD_INSET * 2) / 2;
    if (sourceZone.column === targetZone.column) {
        const laneX = sourceZone.x + sourceZone.width + 12 + (edgeIndex % 3) * 4;
        const nodeEdgeX = source.x + nodeHalfWidth;
        return `M ${formatCoordinate(nodeEdgeX)} ${formatCoordinate(source.y)} H ${formatCoordinate(laneX)} V ${formatCoordinate(target.y)} H ${formatCoordinate(target.x + nodeHalfWidth)}`;
    }

    const direction = target.x >= source.x ? 1 : -1;
    const sourceX = formatCoordinate(source.x + direction * nodeHalfWidth);
    const targetX = formatCoordinate(target.x - direction * nodeHalfWidth);
    const laneX = formatCoordinate((sourceX + targetX) / 2 + ((edgeIndex % 3) - 1) * 4);
    return `M ${sourceX} ${formatCoordinate(source.y)} H ${laneX} V ${formatCoordinate(target.y)} H ${targetX}`;
};

const getStructuralPath = (source: IWorkbenchTopologyZoneView, target: IWorkbenchTopologyZoneView) => {
    if (source.column === target.column) {
        const direction = target.y >= source.y ? 1 : -1;
        const sourceY = direction > 0 ? source.y + source.height : source.y;
        const targetY = direction > 0 ? target.y : target.y + target.height;
        const x = formatCoordinate(source.x + source.width / 2);
        return `M ${x} ${formatCoordinate(sourceY)} V ${formatCoordinate(targetY)}`;
    }

    const direction = target.x >= source.x ? 1 : -1;
    const sourceX = direction > 0 ? source.x + source.width : source.x;
    const targetX = direction > 0 ? target.x : target.x + target.width;
    const sourceY = source.y + source.height / 2;
    const targetY = target.y + target.height / 2;
    const laneX = (sourceX + targetX) / 2;
    return `M ${formatCoordinate(sourceX)} ${formatCoordinate(sourceY)} H ${formatCoordinate(laneX)} V ${formatCoordinate(targetY)} H ${formatCoordinate(targetX)}`;
};

const getNetworkEdgePath = (node: IWorkbenchTopologyNodeView, zone: IWorkbenchTopologyZoneView, connector: IRangeTopologyNetworkConnectorLayout, side: IWorkbenchTopologyNetworkEdgeView['side']) => {
    const nodeHalfWidth = (zone.width - NODE_CARD_INSET * 2) / 2;
    const connectorCenterY = connector.y + connector.height / 2;
    const sourceX = side === 'source' ? node.x + nodeHalfWidth : connector.x + connector.width;
    const sourceY = side === 'source' ? node.y : connectorCenterY;
    const targetX = side === 'source' ? connector.x : node.x - nodeHalfWidth;
    const targetY = side === 'source' ? connectorCenterY : node.y;
    const laneX = (sourceX + targetX) / 2;
    return `M ${formatCoordinate(sourceX)} ${formatCoordinate(sourceY)} H ${formatCoordinate(laneX)} V ${formatCoordinate(targetY)} H ${formatCoordinate(targetX)}`;
};

export const getWorkbenchTopologyView = (topology: IRangeTopology): IWorkbenchTopologyView => {
    const attackPaths = getAttackPaths(topology);
    const attackOrder = new Map(attackPaths.flatMap(({ nodeIds }) => nodeIds).map((nodeId, index) => [nodeId, index]));
    const edgePairs = getUniqueEdgePairs(topology);
    const structuralSourceEdges = edgePairs.length > 0 ? edgePairs : topology.edges.map(([sourceId, targetId]) => ({ sourceId, targetId }));
    const zoneEdges = getZoneEdges(topology, structuralSourceEdges);
    const topologyLayout = getRangeTopologyLayout({ ...topology, zoneEdges });
    const zones = topologyLayout.zones.map<IWorkbenchTopologyZoneView>((zone) => ({
        ...zone,
        nodeCount: topology.nodes.filter((node) => node.zone === zone.id).length,
    }));
    const nodeViews = zones.flatMap((zone) =>
        topology.nodes
            .filter((node) => node.zone === zone.id)
            .sort((left, right) => {
                const attackDifference = (attackOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (attackOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER);
                if (attackDifference !== 0) return attackDifference;
                const roleDifference = getRoleOrder(left) - getRoleOrder(right);
                if (roleDifference !== 0) return roleDifference;
                const numericDifference = getNumericPrefix(left) - getNumericPrefix(right);
                return numericDifference !== 0 ? numericDifference : left.label.localeCompare(right.label);
            })
            .map<IWorkbenchTopologyNodeView>((node, row) => ({
                ...node,
                displayLabel: shortenLabel(node.label),
                row,
                x: formatCoordinate(zone.x + zone.width / 2),
                y: formatCoordinate(zone.y + ZONE_HEADER_HEIGHT + ZONE_NODE_TOP_GAP + NODE_CARD_HEIGHT / 2 + row * (NODE_CARD_HEIGHT + NODE_CARD_GAP)),
            })),
    );
    const nodeViewById = new Map(nodeViews.map((node) => [node.id, node]));
    const zoneViewById = new Map(zones.map((zone) => [zone.id, zone]));
    const nodes = topology.nodes.map((node) => nodeViewById.get(node.id)).filter((node): node is IWorkbenchTopologyNodeView => Boolean(node));
    const edgeIndexById = new Map(edgePairs.map(({ sourceId, targetId }, index) => [`${sourceId}→${targetId}`, index]));
    const getEdgeView = ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
        const source = nodeViewById.get(sourceId);
        const target = nodeViewById.get(targetId);
        const sourceZone = source ? zoneViewById.get(source.zone) : undefined;
        const targetZone = target ? zoneViewById.get(target.zone) : undefined;
        if (!source || !target || !sourceZone || !targetZone) return undefined;
        return { sourceId, targetId, path: getOrthogonalPath(source, target, sourceZone, targetZone, edgeIndexById.get(`${sourceId}→${targetId}`) ?? 0) };
    };
    const edges = edgePairs.map(getEdgeView).filter((edge): edge is IWorkbenchTopologyEdgeView => Boolean(edge));
    const attackRoutes = attackPaths.flatMap<IWorkbenchTopologyAttackRouteView>(({ id, nodeIds }) => {
        const segments = getPathEdgePairs(nodeIds)
            .map(getEdgeView)
            .filter((edge): edge is IWorkbenchTopologyEdgeView => Boolean(edge));
        return segments.length > 0 ? [{ id, nodeIds, segments }] : [];
    });
    const structuralEdges = zoneEdges.flatMap<IWorkbenchTopologyStructuralEdgeView>(([sourceZoneId, targetZoneId]) => {
        const source = zoneViewById.get(sourceZoneId);
        const target = zoneViewById.get(targetZoneId);
        if (!source || !target) return [];
        return [{ id: `${sourceZoneId}→${targetZoneId}`, path: getStructuralPath(source, target), sourceZoneId, targetZoneId }];
    });
    const networkEdges = topologyLayout.networkConnectors.flatMap<IWorkbenchTopologyNetworkEdgeView>((connector) => {
        const sourceNode = nodeViewById.get(connector.sourceNodeId);
        const sourceZone = sourceNode ? zoneViewById.get(sourceNode.zone) : undefined;
        const sourceEdge =
            sourceNode && sourceZone
                ? [
                      {
                          id: `${connector.id}:source:${sourceNode.id}`,
                          networkId: connector.id,
                          nodeId: sourceNode.id,
                          path: getNetworkEdgePath(sourceNode, sourceZone, connector, 'source'),
                          side: 'source' as const,
                      },
                  ]
                : [];
        const targetEdges = (connector.targetNodeIds ?? []).flatMap<IWorkbenchTopologyNetworkEdgeView>((targetNodeId) => {
            const targetNode = nodeViewById.get(targetNodeId);
            const targetZone = targetNode ? zoneViewById.get(targetNode.zone) : undefined;
            if (!targetNode || !targetZone) return [];
            return [
                {
                    id: `${connector.id}:target:${targetNode.id}`,
                    networkId: connector.id,
                    nodeId: targetNode.id,
                    path: getNetworkEdgePath(targetNode, targetZone, connector, 'target'),
                    side: 'target',
                },
            ];
        });
        return [...sourceEdge, ...targetEdges];
    });

    return {
        attackRoutes,
        canvasHeight: topologyLayout.canvasHeight,
        canvasWidth: topologyLayout.canvasWidth,
        edges,
        externalNodes: nodes.filter(isExternalNode),
        networkConnectors: topologyLayout.networkConnectors,
        networkEdges,
        nodes,
        structuralEdges,
        viewBox: topologyLayout.viewBox,
        zones,
    };
};
