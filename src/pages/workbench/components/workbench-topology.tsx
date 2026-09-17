import classNames from 'classnames';
import { useId, useMemo } from 'react';
import useTranslate from '@/hooks/useTranslate';
import TopologyDeviceGlyph from '@/pages/dashboard/components/topology-device-glyph';
import { getWorkbenchAttackSegmentId } from '@/pages/workbench/components/workbench-attack-playback';
import { getWorkbenchTopologyView, type IWorkbenchTopologyZoneView } from '@/pages/workbench/components/workbench-topology-layout';
import useTopologyAttackPlayback from '@/pages/workbench/hooks/use-topology-attack-playback';
import useTopologyViewport from '@/pages/workbench/hooks/use-topology-viewport';
import style from '@/pages/workbench/workbench.module.less';
import type { IRangeTopology } from '@/api/range';

interface WorkbenchTopologyProps {
    environmentName: string;
    topology: IRangeTopology;
}

const MAX_ZONE_LABEL_LENGTH = 20;
const NODE_CARD_HEIGHT = 42;
const NODE_CARD_INSET = 14;
const NODE_ICON_COLUMN_WIDTH = 40;
const NETWORK_CONNECTOR_ICON_COLUMN_WIDTH = 36;
const ZONE_HEADER_HEIGHT = 42;

const formatCoordinate = (value: number) => Number(value.toFixed(1));

const shortenLabel = (label: string, maximumLength: number) => {
    const characters = [...label.trim()];
    return characters.length > maximumLength ? `${characters.slice(0, maximumLength - 1).join('')}…` : characters.join('');
};

const getZoneCode = ({ column, row }: IWorkbenchTopologyZoneView) => {
    if (column < 2) return `${String.fromCharCode(65 + column)}${row + 1}`;
    return `${String.fromCharCode(67 + row)}${column - 1}`;
};

const WorkbenchTopology = ({ environmentName, topology }: WorkbenchTopologyProps) => {
    const translate = useTranslate();
    const attackAnimationIdPrefix = useId().replace(/:/g, '');
    const topologyView = useMemo(() => getWorkbenchTopologyView(topology), [topology]);
    const topologySize = useMemo(() => ({ height: topologyView.canvasHeight, width: topologyView.canvasWidth }), [topologyView.canvasHeight, topologyView.canvasWidth]);
    const { handlePointerDown, handlePointerEnd, handlePointerMove, handleWheel, isPanning, resetViewport, viewBox, zoom, zoomIn, zoomOut } = useTopologyViewport(topologySize);
    const playbackPaths = useMemo(
        () =>
            topologyView.attackRoutes.map(({ id, segments }) => ({
                id,
                nodeIds: segments.length > 0 ? [segments[0].sourceId, ...segments.map(({ targetId }) => targetId)] : [],
            })),
        [topologyView.attackRoutes],
    );
    const playback = useTopologyAttackPlayback(playbackPaths);
    const activeRoute = topologyView.attackRoutes.find(({ id }) => id === playback.activePathId);
    const externalNodeIds = useMemo(() => new Set(topologyView.externalNodes.map(({ id }) => id)), [topologyView.externalNodes]);
    const activeSegments =
        activeRoute?.segments.map((segment, segmentIndex) => ({
            ...segment,
            id: getWorkbenchAttackSegmentId(activeRoute.id, segmentIndex, segment.sourceId, segment.targetId),
            state: playback.segmentStates[getWorkbenchAttackSegmentId(activeRoute.id, segmentIndex, segment.sourceId, segment.targetId)] ?? 'idle',
        })) ?? [];
    const attackingEdge = activeSegments.find(({ state }) => state === 'active');
    const attackingEdgeIndex = attackingEdge ? activeSegments.indexOf(attackingEdge) : -1;
    const attackingEdgeElementId = attackingEdgeIndex >= 0 ? `${attackAnimationIdPrefix}-workbench-attack-edge-${attackingEdgeIndex}` : undefined;

    return (
        <div
            className={classNames(style.topologyCanvas, isPanning && style.isTopologyPanning)}
            data-testid="workbench-topology-canvas"
            data-visual-source="range-center"
            data-attack-path-count={topologyView.attackRoutes.length}
            data-active-attack-path={playback.activePathId}
        >
            <span className={style.liveBadge}>{translate('workbench.topology.live')}</span>
            <div className={style.topologyControls} role="group" aria-label={translate('workbench.topology.controls')}>
                <button type="button" onClick={zoomOut} aria-label={translate('workbench.topology.zoomOut')} title={translate('workbench.topology.zoomOut')}>
                    −
                </button>
                <button type="button" onClick={resetViewport} aria-label={translate('workbench.topology.resetView')} title={translate('workbench.topology.resetView')}>
                    {Math.round(zoom * 100)}%
                </button>
                <button type="button" onClick={zoomIn} aria-label={translate('workbench.topology.zoomIn')} title={translate('workbench.topology.zoomIn')}>
                    +
                </button>
            </div>
            <svg
                data-testid="workbench-topology-map"
                data-zoom={zoom.toFixed(2)}
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={translate('range.topology.aria', { name: environmentName })}
                onDoubleClick={resetViewport}
                onPointerCancel={handlePointerEnd}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onWheel={handleWheel}
            >
                <defs>
                    <linearGradient id="workbench-zone-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#082130" />
                        <stop offset="100%" stopColor="#04111b" />
                    </linearGradient>
                </defs>

                <g className={style.topologyEdges} aria-hidden="true">
                    {topologyView.structuralEdges.map((edge) => (
                        <path
                            key={edge.id}
                            d={edge.path}
                            data-testid="workbench-topology-edge"
                            data-edge-id={edge.id}
                            data-edge-kind="structural"
                            data-source-zone={edge.sourceZoneId}
                            data-target-zone={edge.targetZoneId}
                        />
                    ))}
                </g>

                <g className={style.topologyNetworkEdges} aria-hidden="true">
                    {topologyView.networkEdges.map((edge) => (
                        <path
                            key={edge.id}
                            d={edge.path}
                            data-testid="workbench-topology-network-edge"
                            data-edge-id={edge.id}
                            data-network-id={edge.networkId}
                            data-node-id={edge.nodeId}
                            data-edge-side={edge.side}
                        />
                    ))}
                </g>

                {topologyView.zones.map((zone) => (
                    <g key={zone.id} className={style.topologyZone} data-testid="workbench-topology-zone" data-zone-id={zone.id}>
                        <title>{zone.cidr ? `${zone.label} · ${zone.cidr}` : zone.label}</title>
                        <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx={3} />
                        <path className={style.topologyZoneAccent} d={`M ${zone.x} ${zone.y + 14} V ${zone.y} H ${zone.x + 18}`} />
                        <line className={style.topologyZoneHeaderDivider} x1={zone.x} x2={zone.x + zone.width} y1={zone.y + ZONE_HEADER_HEIGHT} y2={zone.y + ZONE_HEADER_HEIGHT} />
                        <text className={style.topologyZoneLabel} x={zone.x + 12} y={zone.y + 26}>
                            {getZoneCode(zone)} · {shortenLabel(zone.label, Math.min(MAX_ZONE_LABEL_LENGTH, Math.max(8, Math.floor((zone.width - 112) / 6.5))))}
                        </text>
                        <text className={style.topologyZoneSummary} x={zone.x + zone.width - 12} y={zone.y + 26} textAnchor="end">
                            {translate('range.topology.zoneNodeCount', { count: zone.nodeCount })}
                        </text>
                    </g>
                ))}

                {topologyView.networkConnectors.map((connector) => (
                    <g
                        key={connector.id}
                        className={style.topologyNetworkConnector}
                        data-testid="workbench-topology-network-connector"
                        data-network-id={connector.id}
                        transform={`translate(${formatCoordinate(connector.x)} ${formatCoordinate(connector.y)})`}
                    >
                        <title>{connector.cidr ? `${connector.label} · ${connector.cidr}` : connector.label}</title>
                        <rect width={connector.width} height={connector.height} rx={2} />
                        <line className={style.topologyNetworkConnectorAccent} x1={1} x2={1} y1={4} y2={connector.height - 4} />
                        <line className={style.topologyNetworkConnectorDivider} x1={NETWORK_CONNECTOR_ICON_COLUMN_WIDTH} x2={NETWORK_CONNECTOR_ICON_COLUMN_WIDTH} y1={7} y2={connector.height - 7} />
                        <g className={style.topologyNetworkConnectorGlyph} transform={`translate(${NETWORK_CONNECTOR_ICON_COLUMN_WIDTH / 2} ${connector.height / 2}) scale(0.54)`} aria-hidden="true">
                            <TopologyDeviceGlyph nodeId={connector.id} />
                        </g>
                        <text className={style.topologyNetworkConnectorLabel} x={NETWORK_CONNECTOR_ICON_COLUMN_WIDTH + 8} y={connector.cidr ? 20 : 29}>
                            {shortenLabel(connector.label, 18)}
                        </text>
                        {connector.cidr ? (
                            <text className={style.topologyNetworkConnectorCidr} x={NETWORK_CONNECTOR_ICON_COLUMN_WIDTH + 8} y={35}>
                                {connector.cidr}
                            </text>
                        ) : null}
                    </g>
                ))}

                <g className={style.topologyAttackLayer} aria-hidden="true">
                    {activeSegments
                        .filter(({ state }) => state !== 'idle')
                        .map((edge, segmentIndex) => (
                            <path
                                key={edge.id}
                                id={`${attackAnimationIdPrefix}-workbench-attack-edge-${segmentIndex}`}
                                className={classNames(style.topologyAttackPath, edge.state === 'complete' ? style.topologyAttackPathCompleted : style.topologyAttackPathAttacking)}
                                d={edge.path}
                                pathLength="100"
                                strokeDasharray={edge.state === 'active' ? '100' : undefined}
                                strokeDashoffset={edge.state === 'active' ? '100' : undefined}
                                data-testid="workbench-topology-attack-path"
                                data-edge-id={`${edge.sourceId}->${edge.targetId}`}
                                data-attack-state={edge.state}
                                data-path-id={activeRoute?.id}
                            >
                                {edge.state === 'active' ? (
                                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur={`${playback.activeSegment?.durationMs ?? 1_600}ms`} fill="freeze" />
                                ) : null}
                            </path>
                        ))}
                    {attackingEdge && attackingEdgeElementId ? (
                        <g
                            key={`${playback.cycleIndex}-${attackingEdge.id}`}
                            className={style.topologyAttackArrow}
                            data-testid="workbench-topology-attack-arrow"
                            data-edge-id={`${attackingEdge.sourceId}->${attackingEdge.targetId}`}
                            data-path-id={activeRoute?.id}
                        >
                            <path className={style.topologyAttackArrowSolid} d="M-10 -5 L-3 0 L-10 5 L-6.5 5 L0.5 0 L-6.5 -5 Z" />
                            <path className={style.topologyAttackArrowMid} d="M-3.5 -5.2 L3.6 0 L-3.5 5.2" />
                            <path className={style.topologyAttackArrowFront} d="M2.2 -5.2 L9.3 0 L2.2 5.2" />
                            <animateMotion dur={`${playback.activeSegment?.durationMs ?? 1_600}ms`} repeatCount="1" rotate="auto" fill="freeze">
                                <mpath href={`#${attackingEdgeElementId}`} />
                            </animateMotion>
                        </g>
                    ) : null}
                </g>

                {topologyView.nodes.map((node) => {
                    const attackState = playback.nodeStates[node.id] ?? 'idle';
                    const isCompromised = attackState === 'compromised';
                    const isDetected = attackState === 'hit';
                    const isAttacking = playback.activeSegment?.targetId === node.id;
                    const isExternal = externalNodeIds.has(node.id);
                    const zone = topologyView.zones.find(({ id }) => id === node.zone);
                    if (!zone) return null;
                    const cardWidth = zone.width - NODE_CARD_INSET * 2;
                    const cardX = -cardWidth / 2;
                    const dividerX = cardX + NODE_ICON_COLUMN_WIDTH;
                    const labelX = (dividerX + cardWidth / 2) / 2;
                    return (
                        <g
                            key={node.id}
                            className={classNames(
                                style.topologyNode,
                                isExternal && style.topologyNodeExternal,
                                isCompromised && style.topologyNodeCompromised,
                                isDetected && style.topologyNodeDetected,
                                isAttacking && style.topologyNodeAttacking,
                            )}
                            transform={`translate(${node.x} ${node.y})`}
                            data-testid="workbench-topology-node"
                            data-node-id={node.id}
                            data-node-state={isAttacking ? 'attacking' : isDetected ? 'detected' : isCompromised ? 'compromised' : 'idle'}
                        >
                            <title>{`${node.label}${node.ip ? ` · ${node.ip}` : ''}`}</title>
                            <rect data-testid="workbench-topology-node-card" x={cardX} y={-NODE_CARD_HEIGHT / 2} width={cardWidth} height={NODE_CARD_HEIGHT} rx={2} />
                            <line className={style.topologyNodeAccent} x1={cardX + 1} x2={cardX + 1} y1={-NODE_CARD_HEIGHT / 2 + 3} y2={NODE_CARD_HEIGHT / 2 - 3} />
                            <line className={style.topologyNodeDivider} x1={dividerX} x2={dividerX} y1={-NODE_CARD_HEIGHT / 2 + 7} y2={NODE_CARD_HEIGHT / 2 - 7} />
                            <g className={style.topologyGlyph} transform={`translate(${formatCoordinate(cardX + NODE_ICON_COLUMN_WIDTH / 2)} 0) scale(0.58)`} aria-hidden="true">
                                <TopologyDeviceGlyph nodeId={node.id} />
                            </g>
                            <text className={style.topologyNodeLabel} x={formatCoordinate(labelX)} y={4} textAnchor="middle">
                                {node.displayLabel}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default WorkbenchTopology;
