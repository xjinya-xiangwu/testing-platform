import { KeyboardEvent, useMemo, useState } from 'react';
import useTranslate from '@/hooks/useTranslate';
import TopologyDeviceGlyph from '@/pages/dashboard/components/topology-device-glyph';
import { getRangeNodeDisplayLabel, getRangeTopologyLayout, type IRangeTopologyZoneLayout } from '@/pages/range/components/range-topology-layout';
import style from '@/pages/range/range.module.less';
import type { IRangeTopology } from '@/api/range';

interface RangeTopologyProps {
    environmentName: string;
    topology: IRangeTopology;
}

const MAX_NODE_LABEL_LENGTH = 26;
const MAX_ZONE_LABEL_LENGTH = 20;
const NODE_CARD_GAP = 6;
const NODE_CARD_HEIGHT = 42;
const NODE_CARD_INSET = 14;
const NODE_ICON_COLUMN_WIDTH = 40;
const ZONE_HEADER_HEIGHT = 42;
const ZONE_NODE_TOP_GAP = 10;

interface INodeCardGeometry {
    centerX: number;
    centerY: number;
    leftX: number;
    rightX: number;
}

const formatCoordinate = (value: number) => Number(value.toFixed(1));
const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);

const shortenLabel = (label: string, maximumLength: number) => {
    const characters = [...label.trim()];
    return characters.length > maximumLength ? `${characters.slice(0, maximumLength - 1).join('')}…` : characters.join('');
};

const getNodeCardGeometry = (nodeId: string, zone: IRangeTopologyZoneLayout, zoneNodeIds: readonly string[]): INodeCardGeometry | undefined => {
    const row = zoneNodeIds.indexOf(nodeId);
    if (row < 0) return undefined;
    const cardWidth = zone.width - NODE_CARD_INSET * 2;
    const centerX = zone.x + zone.width / 2;
    return {
        centerX,
        centerY: zone.y + ZONE_HEADER_HEIGHT + ZONE_NODE_TOP_GAP + NODE_CARD_HEIGHT / 2 + row * (NODE_CARD_HEIGHT + NODE_CARD_GAP),
        leftX: centerX - cardWidth / 2,
        rightX: centerX + cardWidth / 2,
    };
};

const getNodeZoneLinkPath = (source: INodeCardGeometry, sourceZone: IRangeTopologyZoneLayout, targetZone: IRangeTopologyZoneLayout, linkIndex: number) => {
    if (sourceZone.column === targetZone.column) {
        const laneX = sourceZone.x + sourceZone.width + 12 + (linkIndex % 3) * 4;
        const targetY = targetZone.y + targetZone.height / 2;
        return `M ${formatCoordinate(source.rightX)} ${formatCoordinate(source.centerY)} H ${formatCoordinate(laneX)} V ${formatCoordinate(targetY)} H ${formatCoordinate(targetZone.x + targetZone.width)}`;
    }

    const isTargetRight = source.centerX < targetZone.x + targetZone.width / 2;
    const sourceX = isTargetRight ? source.rightX : source.leftX;
    const targetX = isTargetRight ? targetZone.x : targetZone.x + targetZone.width;
    const targetY = clamp(source.centerY, targetZone.y + ZONE_HEADER_HEIGHT + 8, targetZone.y + targetZone.height - 8);
    const laneOffset = ((linkIndex % 3) - 1) * 4;
    const laneX = (sourceX + targetX) / 2 + laneOffset;
    return `M ${formatCoordinate(sourceX)} ${formatCoordinate(source.centerY)} H ${formatCoordinate(laneX)} V ${formatCoordinate(targetY)} H ${formatCoordinate(targetX)}`;
};

const getZoneCode = ({ column, row }: IRangeTopologyZoneLayout) => {
    if (column < 2) return `${String.fromCharCode(65 + column)}${row + 1}`;
    return `${String.fromCharCode(67 + row)}${column - 1}`;
};

const RangeTopology = ({ environmentName, topology }: RangeTopologyProps) => {
    const translate = useTranslate();
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const nodeById = useMemo(() => new Map(topology.nodes.map((node) => [node.id, node])), [topology.nodes]);
    const zoneById = useMemo(() => new Map(topology.zones.map((zone) => [zone.id, zone])), [topology.zones]);
    const nodesByZoneId = useMemo(() => new Map(topology.zones.map(({ id }) => [id, topology.nodes.filter(({ zone }) => zone === id)])), [topology.nodes, topology.zones]);
    const topologyLayout = useMemo(() => getRangeTopologyLayout(topology), [topology]);
    const zones = topologyLayout.zones;
    const networkConnectors = topologyLayout.networkConnectors;
    const zoneGeometryById = new Map(zones.map((zone) => [zone.id, zone]));
    const connectorLinkIds = new Set(networkConnectors.map(({ sourceNodeId, targetZoneId }) => `${sourceNodeId}→${targetZoneId}`));
    const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;

    const selectNodeWithKeyboard = (event: KeyboardEvent<SVGGElement>, nodeId: string) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        setSelectedNodeId(nodeId);
    };

    const getDisplayValue = (value: string) => value || translate('range.topology.notAvailable');

    return (
        <div className={style.topologyLayout}>
            <div className={style.topologyViewport} data-testid="range-topology-canvas">
                <svg
                    className={style.topology}
                    viewBox={topologyLayout.viewBox}
                    preserveAspectRatio="xMidYMid meet"
                    role="group"
                    aria-label={translate('range.topology.aria', { name: environmentName })}
                >
                    <defs>
                        <linearGradient id="range-static-zone-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#082130" />
                            <stop offset="100%" stopColor="#04111b" />
                        </linearGradient>
                        <marker id="range-node-zone-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                            <path className={style.topologyNodeZoneArrow} d="M 0 0 L 6 3 L 0 6 Z" />
                        </marker>
                    </defs>

                    {zones.map((zone) => {
                        const sourceZone = zoneById.get(zone.id);
                        const zoneNodeCount = nodesByZoneId.get(zone.id)?.length ?? 0;
                        return (
                            <g key={zone.id} className={style.topologyZone} data-testid="range-topology-zone" data-zone-id={zone.id}>
                                <title>{sourceZone?.cidr ? `${zone.label} · ${sourceZone.cidr}` : zone.label}</title>
                                <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx={3} />
                                <path className={style.topologyZoneAccent} d={`M ${zone.x} ${zone.y + 14} V ${zone.y} H ${zone.x + 18}`} />
                                <line className={style.topologyZoneHeaderDivider} x1={zone.x} x2={zone.x + zone.width} y1={zone.y + ZONE_HEADER_HEIGHT} y2={zone.y + ZONE_HEADER_HEIGHT} />
                                <text className={style.topologyZoneLabel} x={zone.x + 12} y={zone.y + 26}>
                                    {getZoneCode(zone)} · {shortenLabel(zone.label, Math.min(MAX_ZONE_LABEL_LENGTH, Math.max(8, Math.floor((zone.width - 112) / 6.5))))}
                                </text>
                                <text className={style.topologyZoneSummary} x={zone.x + zone.width - 12} y={zone.y + 26} textAnchor="end">
                                    {translate('range.topology.zoneNodeCount', { count: zoneNodeCount })}
                                </text>
                            </g>
                        );
                    })}

                    <g className={style.topologyNodeZoneLinks} aria-hidden="true">
                        {(topology.nodeZoneLinks ?? [])
                            .filter(({ sourceNodeId, targetZoneId }) => !connectorLinkIds.has(`${sourceNodeId}→${targetZoneId}`))
                            .map((link, linkIndex) => {
                                const sourceNode = nodeById.get(link.sourceNodeId);
                                const sourceZone = sourceNode ? zoneGeometryById.get(sourceNode.zone) : undefined;
                                const targetZone = zoneGeometryById.get(link.targetZoneId);
                                if (!sourceNode || !sourceZone || !targetZone) return null;
                                const sourceGeometry = getNodeCardGeometry(
                                    sourceNode.id,
                                    sourceZone,
                                    (nodesByZoneId.get(sourceNode.zone) ?? []).map(({ id }) => id),
                                );
                                if (!sourceGeometry) return null;
                                return (
                                    <path
                                        key={link.id}
                                        d={getNodeZoneLinkPath(sourceGeometry, sourceZone, targetZone, linkIndex)}
                                        markerEnd="url(#range-node-zone-arrow)"
                                        data-testid="range-topology-node-zone-link"
                                        data-source-node-id={link.sourceNodeId}
                                        data-target-zone-id={link.targetZoneId}
                                    />
                                );
                            })}
                    </g>

                    <g className={style.topologyNetworkLinks} aria-hidden="true">
                        {networkConnectors.map((connector, connectorIndex) => {
                            const sourceNode = nodeById.get(connector.sourceNodeId);
                            const sourceZone = sourceNode ? zoneGeometryById.get(sourceNode.zone) : undefined;
                            const targetZone = zoneGeometryById.get(connector.targetZoneId);
                            const sourceGeometry =
                                sourceNode && sourceZone
                                    ? getNodeCardGeometry(
                                          sourceNode.id,
                                          sourceZone,
                                          (nodesByZoneId.get(sourceNode.zone) ?? []).map(({ id }) => id),
                                      )
                                    : undefined;
                            if (!targetZone) return null;
                            const connectorCenterY = connector.y + connector.height / 2;
                            const targetY = clamp(connectorCenterY, targetZone.y + ZONE_HEADER_HEIGHT + 8, targetZone.y + targetZone.height - 8);
                            const targetLaneX = (connector.x + connector.width + targetZone.x) / 2;
                            const targetPath = `M ${formatCoordinate(connector.x + connector.width)} ${formatCoordinate(connectorCenterY)} H ${formatCoordinate(targetLaneX)} V ${formatCoordinate(targetY)} H ${formatCoordinate(targetZone.x)}`;
                            const sourcePath = sourceGeometry
                                ? `M ${formatCoordinate(sourceGeometry.rightX)} ${formatCoordinate(sourceGeometry.centerY)} H ${formatCoordinate((sourceGeometry.rightX + connector.x) / 2 + (connectorIndex % 2) * 3)} V ${formatCoordinate(connectorCenterY)} H ${formatCoordinate(connector.x)}`
                                : undefined;
                            return (
                                <g key={connector.id} data-testid="range-topology-network-link" data-network-id={connector.id}>
                                    {sourcePath ? <path d={sourcePath} /> : null}
                                    <path d={targetPath} />
                                </g>
                            );
                        })}
                    </g>

                    {networkConnectors.map((connector) => {
                        const centerX = connector.x + connector.width / 2;
                        const centerY = connector.y + connector.height / 2;
                        const cardX = -connector.width / 2;
                        const labelX = 18;
                        return (
                            <g
                                key={connector.id}
                                className={style.topologyNetworkConnector}
                                transform={`translate(${formatCoordinate(centerX)} ${formatCoordinate(centerY)})`}
                                data-testid="range-topology-network-connector"
                                data-network-id={connector.id}
                            >
                                <title>{connector.cidr ? `${connector.label} · ${connector.cidr}` : connector.label}</title>
                                <rect x={cardX} y={-connector.height / 2} width={connector.width} height={connector.height} rx={2} />
                                <line className={style.topologyNetworkConnectorAccent} x1={cardX + 1} x2={cardX + 1} y1={-connector.height / 2 + 3} y2={connector.height / 2 - 3} />
                                <line className={style.topologyNetworkConnectorDivider} x1={cardX + 38} x2={cardX + 38} y1={-connector.height / 2 + 8} y2={connector.height / 2 - 8} />
                                <g className={style.topologyNetworkConnectorGlyph} transform={`translate(${formatCoordinate(cardX + 20)} 0) scale(0.52)`} aria-hidden="true">
                                    <TopologyDeviceGlyph nodeId="squid" />
                                </g>
                                <text className={style.topologyNetworkConnectorLabel} x={labelX} y={connector.cidr ? -3 : 4} textAnchor="middle">
                                    {shortenLabel(connector.label, 18)}
                                </text>
                                {connector.cidr ? (
                                    <text className={style.topologyNetworkConnectorCidr} x={labelX} y={13} textAnchor="middle">
                                        {connector.cidr}
                                    </text>
                                ) : null}
                            </g>
                        );
                    })}

                    {topology.nodes.map((node) => {
                        const zone = zoneGeometryById.get(node.zone);
                        if (!zone) return null;
                        const zoneNodes = nodesByZoneId.get(node.zone) ?? [];
                        const row = zoneNodes.findIndex(({ id }) => id === node.id);
                        const cardWidth = zone.width - NODE_CARD_INSET * 2;
                        const cardX = -cardWidth / 2;
                        const nodeY = zone.y + ZONE_HEADER_HEIGHT + ZONE_NODE_TOP_GAP + NODE_CARD_HEIGHT / 2 + row * (NODE_CARD_HEIGHT + NODE_CARD_GAP);
                        const dividerX = cardX + NODE_ICON_COLUMN_WIDTH;
                        const labelX = (dividerX + cardWidth / 2) / 2;
                        const maximumLabelLength = Math.min(MAX_NODE_LABEL_LENGTH, Math.max(8, Math.floor((cardWidth - NODE_ICON_COLUMN_WIDTH - 20) / 6.5)));
                        return (
                            <g
                                key={node.id}
                                className={style.topologyNode}
                                transform={`translate(${formatCoordinate(zone.x + zone.width / 2)} ${formatCoordinate(nodeY)})`}
                                role="button"
                                tabIndex={0}
                                aria-label={translate('range.topology.viewNode', { name: node.label })}
                                data-testid="range-topology-node"
                                data-node-id={node.id}
                                data-node-role={node.role ?? 'primary'}
                                onClick={() => setSelectedNodeId(node.id)}
                                onKeyDown={(event) => selectNodeWithKeyboard(event, node.id)}
                            >
                                <title>{`${node.label}${node.ip ? ` · ${node.ip}` : ''}`}</title>
                                <rect data-testid="range-topology-node-card" x={cardX} y={-NODE_CARD_HEIGHT / 2} width={cardWidth} height={NODE_CARD_HEIGHT} rx={2} />
                                <line className={style.topologyNodeAccent} x1={cardX + 1} x2={cardX + 1} y1={-NODE_CARD_HEIGHT / 2 + 3} y2={NODE_CARD_HEIGHT / 2 - 3} />
                                <line className={style.topologyNodeDivider} x1={dividerX} x2={dividerX} y1={-NODE_CARD_HEIGHT / 2 + 7} y2={NODE_CARD_HEIGHT / 2 - 7} />
                                <g className={style.topologyGlyph} transform={`translate(${formatCoordinate(cardX + NODE_ICON_COLUMN_WIDTH / 2)} 0) scale(0.58)`} aria-hidden="true">
                                    <TopologyDeviceGlyph nodeId={node.id} />
                                </g>
                                <text className={style.topologyNodeLabel} x={formatCoordinate(labelX)} y={4} textAnchor="middle">
                                    {shortenLabel(getRangeNodeDisplayLabel(node.label), maximumLabelLength)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {selectedNode ? (
                <section className={style.nodeDetails} aria-label={translate('range.topology.nodeDetails', { name: selectedNode.label })}>
                    <h3>{selectedNode.label}</h3>
                    <dl>
                        <div>
                            <dt>{translate('range.topology.ip')}</dt>
                            <dd>{getDisplayValue(selectedNode.ip)}</dd>
                        </div>
                        <div>
                            <dt>{translate('range.topology.os')}</dt>
                            <dd>{getDisplayValue(selectedNode.os)}</dd>
                        </div>
                        <div>
                            <dt>{translate('range.topology.services')}</dt>
                            <dd>{selectedNode.services.join(' / ') || translate('range.topology.notAvailable')}</dd>
                        </div>
                        <div>
                            <dt>{translate('range.topology.vulnerabilities')}</dt>
                            <dd>{selectedNode.vulnerabilities.join(' / ') || translate('range.topology.noVulnerability')}</dd>
                        </div>
                    </dl>
                </section>
            ) : null}
        </div>
    );
};

export default RangeTopology;
