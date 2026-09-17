import type { IRangeTopology, IRangeTopologyNetworkConnector, IRangeTopologyZone } from '@/api/range';

const CANVAS_PADDING = 24;
const COLUMN_GAP = 52;
const CONNECTOR_GAP = 16;
const CONNECTOR_HEIGHT = 48;
const CONNECTOR_WIDTH = 154;
const MIN_CANVAS_HEIGHT = 360;
const MIN_CANVAS_WIDTH = 920;
const NODE_CARD_GAP = 6;
const NODE_CARD_HEIGHT = 42;
const ROW_GAP = 24;
const ZONE_BOTTOM_PADDING = 10;
const ZONE_HEADER_HEIGHT = 42;
const ZONE_NODE_TOP_GAP = 10;
const ZONE_WIDTH = 252;

export interface IRangeTopologyZoneLayout extends IRangeTopologyZone {
    column: number;
    height: number;
    row: number;
    y: number;
}

export interface IRangeTopologyNetworkConnectorLayout extends IRangeTopologyNetworkConnector {
    height: number;
    width: number;
    x: number;
    y: number;
}

export interface IRangeTopologyLayout {
    canvasHeight: number;
    canvasWidth: number;
    networkConnectors: readonly IRangeTopologyNetworkConnectorLayout[];
    viewBox: string;
    zones: readonly IRangeTopologyZoneLayout[];
}

const getZoneHeight = (nodeCount: number) => ZONE_HEADER_HEIGHT + ZONE_NODE_TOP_GAP + Math.max(1, nodeCount) * NODE_CARD_HEIGHT + Math.max(0, nodeCount - 1) * NODE_CARD_GAP + ZONE_BOTTOM_PADDING;

const getFallbackColumns = (zones: readonly IRangeTopologyZone[]) => {
    const columnXs = [...new Set(zones.map(({ x }) => x))].sort((left, right) => left - right);
    return new Map(zones.map(({ id, x }) => [id, columnXs.indexOf(x)]));
};

const getGraphColumns = (topology: IRangeTopology, visibleZoneIds: ReadonlySet<string>, fallbackColumns: ReadonlyMap<string, number>) => {
    const relationships = (topology.zoneEdges ?? []).filter(([sourceId, targetId]) => visibleZoneIds.has(sourceId) && visibleZoneIds.has(targetId) && sourceId !== targetId);
    if (relationships.length === 0) return fallbackColumns;

    const orderedZoneIds = topology.zones.map(({ id }) => id).filter((zoneId) => visibleZoneIds.has(zoneId));
    const incomingCountById = new Map(orderedZoneIds.map((zoneId) => [zoneId, relationships.filter(([, targetId]) => targetId === zoneId).length]));
    const adjacencyById = new Map(orderedZoneIds.map((zoneId) => [zoneId, relationships.filter(([sourceId]) => sourceId === zoneId).map(([, targetId]) => targetId)]));
    const rootZoneIds = orderedZoneIds.filter((zoneId) => incomingCountById.get(zoneId) === 0);
    if (rootZoneIds.length === 0) return fallbackColumns;

    const columnById = new Map(rootZoneIds.map((zoneId) => [zoneId, 0]));
    const remainingIncomingCountById = new Map(incomingCountById);
    const queue = [...rootZoneIds];
    while (queue.length > 0) {
        const sourceId = queue.shift();
        if (!sourceId) continue;
        const sourceColumn = columnById.get(sourceId) ?? 0;
        (adjacencyById.get(sourceId) ?? []).forEach((targetId) => {
            columnById.set(targetId, Math.max(columnById.get(targetId) ?? 0, sourceColumn + 1));
            const remainingIncomingCount = (remainingIncomingCountById.get(targetId) ?? 1) - 1;
            remainingIncomingCountById.set(targetId, remainingIncomingCount);
            if (remainingIncomingCount === 0) queue.push(targetId);
        });
    }

    orderedZoneIds.forEach((zoneId) => {
        if (columnById.has(zoneId)) return;
        columnById.set(zoneId, fallbackColumns.get(zoneId) ?? 0);
    });
    return columnById;
};

export const getRangeNodeDisplayLabel = (label: string) => {
    const normalizedLabel = label
        .trim()
        .replace(/\s*[（(][^()（）]*[）)]\s*$/, '')
        .trim();
    return normalizedLabel || label.trim();
};

export const getRangeTopologyLayout = (topology: IRangeTopology): IRangeTopologyLayout => {
    const nodeCountByZoneId = new Map(topology.zones.map(({ id }) => [id, topology.nodes.filter(({ zone }) => zone === id).length]));
    const visibleZones = topology.zones.filter(({ id }) => (nodeCountByZoneId.get(id) ?? 0) > 0);
    const visibleZoneIds = new Set(visibleZones.map(({ id }) => id));
    const fallbackColumns = getFallbackColumns(visibleZones);
    const columnById = getGraphColumns(topology, visibleZoneIds, fallbackColumns);
    const maximumColumn = Math.max(0, ...columnById.values());
    const columnZoneIds = Array.from({ length: maximumColumn + 1 }, (_, column) =>
        visibleZones
            .filter(({ id }) => columnById.get(id) === column)
            .sort((left, right) => (left.y ?? 0) - (right.y ?? 0))
            .map(({ id }) => id),
    );
    const heightByZoneId = new Map(visibleZones.map(({ id }) => [id, getZoneHeight(nodeCountByZoneId.get(id) ?? 0)]));
    const columnHeights = columnZoneIds.map((zoneIds) => zoneIds.reduce((height, zoneId) => height + (heightByZoneId.get(zoneId) ?? 0), 0) + Math.max(0, zoneIds.length - 1) * ROW_GAP);
    const canvasHeight = Math.max(MIN_CANVAS_HEIGHT, Math.max(0, ...columnHeights) + CANVAS_PADDING * 2);
    const sourceConnectors = topology.networkConnectors ?? [];
    const hasConnectors = sourceConnectors.some(({ targetZoneId }) => visibleZoneIds.has(targetZoneId));
    const interColumnGap = hasConnectors ? CONNECTOR_WIDTH + CONNECTOR_GAP * 2 : COLUMN_GAP;
    const hasEntryConnector = sourceConnectors.some(
        ({ sourceZoneId, targetZoneId }) => !visibleZoneIds.has(sourceZoneId) && visibleZoneIds.has(targetZoneId) && (columnById.get(targetZoneId) ?? -1) === 0,
    );
    const entryConnectorSpace = hasEntryConnector ? CONNECTOR_WIDTH + CONNECTOR_GAP : 0;
    const contentWidth = entryConnectorSpace + columnZoneIds.length * ZONE_WIDTH + Math.max(0, columnZoneIds.length - 1) * interColumnGap;
    const canvasWidth = Math.max(MIN_CANVAS_WIDTH, contentWidth + CANVAS_PADDING * 2);
    const startX = (canvasWidth - contentWidth) / 2 + entryConnectorSpace;
    const sourceZoneById = new Map(visibleZones.map((zone) => [zone.id, zone]));
    const zones = columnZoneIds.flatMap((zoneIds, column) => {
        const columnHeight = columnHeights[column];
        const startY = (canvasHeight - columnHeight) / 2;
        return zoneIds.flatMap<IRangeTopologyZoneLayout>((zoneId, row) => {
            const sourceZone = sourceZoneById.get(zoneId);
            if (!sourceZone) return [];
            const precedingHeight = zoneIds.slice(0, row).reduce((height, precedingZoneId) => height + (heightByZoneId.get(precedingZoneId) ?? 0) + ROW_GAP, 0);
            return [
                {
                    ...sourceZone,
                    column,
                    height: heightByZoneId.get(zoneId) ?? getZoneHeight(0),
                    row,
                    width: ZONE_WIDTH,
                    x: startX + column * (ZONE_WIDTH + interColumnGap),
                    y: startY + precedingHeight,
                },
            ];
        });
    });
    const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
    const networkConnectors = sourceConnectors.flatMap<IRangeTopologyNetworkConnectorLayout>((connector) => {
        const targetZone = zoneById.get(connector.targetZoneId);
        const sourceZone = zoneById.get(connector.sourceZoneId);
        if (!targetZone || (sourceZone && sourceZone.column >= targetZone.column)) return [];
        return [
            {
                ...connector,
                height: CONNECTOR_HEIGHT,
                width: CONNECTOR_WIDTH,
                x: targetZone.x - CONNECTOR_GAP - CONNECTOR_WIDTH,
                y: targetZone.y + (targetZone.height - CONNECTOR_HEIGHT) / 2,
            },
        ];
    });

    return {
        canvasHeight,
        canvasWidth,
        networkConnectors,
        viewBox: `0 0 ${canvasWidth} ${canvasHeight}`,
        zones,
    };
};
