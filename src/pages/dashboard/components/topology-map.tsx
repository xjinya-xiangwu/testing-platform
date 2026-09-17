import classNames from 'classnames';
import { CSSProperties, useLayoutEffect, useRef } from 'react';
import { AttackNodeState, AttackSegmentState, buildAttackDashedReveal, getAttackAnimationDurationMs, getAttackPlaybackStep } from '@/features/topology/playback/attack-playback';
import { getDashboardTopologyGeometry } from '@/features/topology/layout/dashboard-topology-geometry';
import { IDashboardTopologyView } from '@/features/topology/layout/dashboard-range3-layout';
import DashboardTopologyDeviceGlyph from '@/pages/dashboard/components/dashboard-topology-device-glyph';
import useTopologyAttackPlayback from '@/pages/dashboard/hooks/use-topology-attack-playback';
import style from '@/pages/dashboard/components/dashboard-charts.module.less';

interface TopologyMapProps {
    view: IDashboardTopologyView;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

interface IAnimateMotionElement extends SVGElement {
    beginElement: () => void;
}

const ATTACK_ROUTE_NAMES: Readonly<Record<string, string>> = {
    'attacker->react': 'ExternalReact',
    'react->dubbo': 'ReactDubbo',
    'dubbo->geoserver': 'DubboGis',
    'geoserver->postgres': 'GisData',
    'dubbo->cacti': 'DubboOps',
    'cacti->neo4j': 'OpsData',
};

const getSegmentStateClass = (state: AttackSegmentState) => classNames(state === 'active' && style.topologyAttackPathActive, state === 'complete' && style.topologyAttackPathComplete);

const getNodeStateClass = (state: AttackNodeState) => classNames(state === 'hit' && style.topologyAttackNodeHit, state === 'compromised' && style.topologyAttackNodeCompromised);

const buildIconClearPath = (view: IDashboardTopologyView) => {
    const cutouts = view.zones.flatMap((zone) => zone.nodes.map(({ position }) => `M${position.x - 25} ${position.y - 25} H${position.x + 25} V${position.y + 25} H${position.x - 25} Z`));
    return [`M0 0 H${view.canvas.width} V${view.canvas.height} H0 Z`, ...cutouts].join(' ');
};

const getGridClass = (nodeCount: number) => {
    if (nodeCount === 6) return style.topologyGrid6;
    if (nodeCount === 4) return style.topologyGrid4;
    return style.topologyGrid3;
};

const TopologyMap = ({ view, translate }: TopologyMapProps) => {
    const playback = useTopologyAttackPlayback();
    const flowNetworkRef = useRef<SVGSVGElement>(null);
    const iconClearPathRef = useRef<SVGPathElement>(null);
    const attackerRef = useRef<HTMLDivElement>(null);
    const zoneRefs = useRef(new Map<string, HTMLElement>());
    const nodeIconRefs = useRef(new Map<string, HTMLElement>());
    const zoneLinkRefs = useRef(new Map<string, SVGPathElement>());
    const normalFlowRefs = useRef(new Map<string, SVGPathElement>());
    const attackPathRefs = useRef(new Map<string, SVGPathElement>());
    const motionRefs = useRef(new Map<string, IAnimateMotionElement>());
    const activeSegment = view.attackSegments.find(({ id }) => id === playback.activeSegmentId);
    const activeStep = activeSegment ? getAttackPlaybackStep(activeSegment.id) : undefined;
    const activeAnimationDurationMs = activeStep ? getAttackAnimationDurationMs(activeStep) : undefined;
    const iconClearClipId = 'dashboard-topology-icon-clear';
    const attackNodeIds = new Set(view.attackNodeIds);

    useLayoutEffect(() => {
        const flowNetwork = flowNetworkRef.current;
        const attacker = attackerRef.current;
        if (!flowNetwork || !attacker) return undefined;

        let fontFrame = 0;
        let isDisposed = false;
        const syncTopologyPaths = () => {
            const svgRect = flowNetwork.getBoundingClientRect();
            if (svgRect.width <= 0 || svgRect.height <= 0) return;

            const zoneRects = Object.fromEntries(
                view.zones.flatMap((zone) => (zoneRefs.current.get(zone.zone.id) ? [[zone.zone.id, zoneRefs.current.get(zone.zone.id)!.getBoundingClientRect()]] : [])),
            );
            const iconRects = Object.fromEntries(
                view.zones.flatMap((zone) => zone.nodes.flatMap(({ node }) => (nodeIconRefs.current.get(node.id) ? [[node.id, nodeIconRefs.current.get(node.id)!.getBoundingClientRect()]] : []))),
            );
            if (Object.keys(zoneRects).length !== view.zones.length || Object.keys(iconRects).length !== view.zones.flatMap((zone) => zone.nodes).length) return;

            const geometry = getDashboardTopologyGeometry({ attackerRect: attacker.getBoundingClientRect(), canvas: view.canvas, iconRects, svgRect, zoneRects });
            Object.entries(geometry.zoneLinkPaths).forEach(([id, path]) => zoneLinkRefs.current.get(id)?.setAttribute('d', path));
            Object.entries(geometry.attackPaths).forEach(([id, path]) => {
                normalFlowRefs.current.get(id)?.setAttribute('d', path);
                attackPathRefs.current.get(id)?.setAttribute('d', path);
            });
            iconClearPathRef.current?.setAttribute('d', geometry.iconClearPath);
        };
        const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(syncTopologyPaths);

        syncTopologyPaths();
        resizeObserver?.observe(flowNetwork);
        window.addEventListener('resize', syncTopologyPaths, { passive: true });
        void document.fonts?.ready.then(() => {
            if (!isDisposed) fontFrame = window.requestAnimationFrame(syncTopologyPaths);
        });

        return () => {
            isDisposed = true;
            window.cancelAnimationFrame(fontFrame);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', syncTopologyPaths);
        };
    }, [view]);

    useLayoutEffect(() => {
        if (!activeSegment || !activeAnimationDurationMs) return undefined;

        const attackPath = attackPathRefs.current.get(activeSegment.id);
        const motion = motionRefs.current.get(activeSegment.id);
        if (!attackPath) return undefined;

        const totalLength = attackPath.getTotalLength?.() || 420;
        const startedAt = performance.now();
        let revealFrame = 0;
        const revealPath = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / activeAnimationDurationMs);
            attackPath.style.strokeDasharray = buildAttackDashedReveal(totalLength * progress, totalLength);
            if (progress < 1) revealFrame = window.requestAnimationFrame(revealPath);
        };

        attackPath.style.strokeDasharray = buildAttackDashedReveal(0, totalLength);
        motion?.beginElement?.();
        revealFrame = window.requestAnimationFrame(revealPath);
        return () => {
            window.cancelAnimationFrame(revealFrame);
            attackPath.style.removeProperty('stroke-dasharray');
        };
    }, [activeAnimationDurationMs, activeSegment, playback.cycleIndex]);

    return (
        <div className={style.topologyMap} role="img" aria-label={translate('dashboard.topology.mapLabel')}>
            <svg ref={flowNetworkRef} className={style.topologyFlowNetwork} viewBox={`0 0 ${view.canvas.width} ${view.canvas.height}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <clipPath id={iconClearClipId} clipPathUnits="userSpaceOnUse">
                        <path ref={iconClearPathRef} d={buildIconClearPath(view)} fillRule="evenodd" clipRule="evenodd" />
                    </clipPath>
                </defs>

                <g className={style.topologyZoneLinkLayer} aria-hidden="true">
                    {view.zoneLinks.map((link) => (
                        <path
                            key={link.id}
                            ref={(path) => {
                                if (path) zoneLinkRefs.current.set(link.id, path);
                                else zoneLinkRefs.current.delete(link.id);
                            }}
                            className={style.topologyZoneLink}
                            d={link.path}
                            data-testid="topology-zone-link"
                        />
                    ))}
                </g>

                <g className={style.topologyNormalFlowLayer} clipPath={`url(#${iconClearClipId})`}>
                    {view.attackSegments.map((segment) => {
                        const routeName = ATTACK_ROUTE_NAMES[segment.id];
                        const segmentState = playback.segmentStates[segment.id] ?? 'idle';
                        return (
                            <path
                                key={segment.id}
                                ref={(path) => {
                                    if (path) normalFlowRefs.current.set(segment.id, path);
                                    else normalFlowRefs.current.delete(segment.id);
                                }}
                                id={`flow${routeName}`}
                                className={classNames(style.topologyNormalFlow, segmentState === 'complete' && style.topologyNormalFlowAttacked)}
                                d={segment.path}
                            />
                        );
                    })}
                </g>

                <g className={style.topologyAttackLayer} clipPath={`url(#${iconClearClipId})`}>
                    {view.attackSegments.map((segment) => {
                        const segmentState = playback.segmentStates[segment.id] ?? 'idle';
                        const isActive = segmentState === 'active';
                        return (
                            <path
                                key={segment.id}
                                ref={(path) => {
                                    if (path) attackPathRefs.current.set(segment.id, path);
                                    else attackPathRefs.current.delete(segment.id);
                                }}
                                id={`attack${ATTACK_ROUTE_NAMES[segment.id]}`}
                                className={classNames(style.topologyAttackPath, getSegmentStateClass(segmentState))}
                                d={segment.path}
                                data-testid="topology-attack-segment"
                                data-segment-id={segment.id}
                                data-attack-state={segmentState}
                                style={isActive ? ({ strokeDasharray: '0 420' } satisfies CSSProperties) : undefined}
                            />
                        );
                    })}
                </g>

                <g className={style.topologyAttackArrowLayer} clipPath={`url(#${iconClearClipId})`}>
                    {view.attackSegments.map((segment) => {
                        const step = getAttackPlaybackStep(segment.id);
                        const isActive = playback.activeSegmentId === segment.id;
                        const durationMs = step ? getAttackAnimationDurationMs(step) : 1_500;
                        return (
                            <g
                                key={`${playback.cycleIndex}-${segment.id}`}
                                className={classNames(style.topologyAttackArrow, isActive && style.topologyAttackArrowActive)}
                                data-testid={isActive ? 'topology-attack-arrow' : undefined}
                                data-segment-id={segment.id}
                            >
                                <path className={style.topologyAttackArrowSolid} d="M-10,-5 L-3,0 L-10,5 L-6.5,5 L0.5,0 L-6.5,-5 Z" />
                                <path className={classNames(style.topologyAttackArrowOutline, style.topologyAttackArrowMid)} d="M-3.5,-5.2 L3.6,0 L-3.5,5.2" />
                                <path className={classNames(style.topologyAttackArrowOutline, style.topologyAttackArrowFront)} d="M2.2,-5.2 L9.3,0 L2.2,5.2" />
                                <animateMotion
                                    ref={(motion) => {
                                        if (motion) motionRefs.current.set(segment.id, motion as IAnimateMotionElement);
                                        else motionRefs.current.delete(segment.id);
                                    }}
                                    begin="indefinite"
                                    dur={`${(durationMs / 1_000).toFixed(2)}s`}
                                    repeatCount="1"
                                    rotate="auto"
                                    fill="freeze"
                                >
                                    <mpath href={`#flow${ATTACK_ROUTE_NAMES[segment.id]}`} />
                                </animateMotion>
                            </g>
                        );
                    })}
                </g>
            </svg>

            <div ref={attackerRef} className={style.topologyExternalAttacker} aria-label="External Attacker" data-testid="topology-node" data-node-id={view.attacker.id} data-attack-state="idle">
                <i className={style.topologyDeviceIcon}>
                    <DashboardTopologyDeviceGlyph nodeId={view.attacker.id} />
                </i>
                <em>{translate(`dashboard.topology.node.${view.attacker.id}`)}</em>
            </div>

            {view.zones.map((zone) => (
                <article
                    key={zone.zone.id}
                    ref={(element) => {
                        if (element) zoneRefs.current.set(zone.zone.id, element);
                        else zoneRefs.current.delete(zone.zone.id);
                    }}
                    className={style.topologyZone}
                    data-testid="topology-zone"
                    data-zone-id={zone.zone.id}
                    style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }}
                >
                    <div className={style.topologyZoneHead}>
                        <b>{zone.code}</b>
                        <span>{translate(`dashboard.topology.zone.${zone.zone.id}`)}</span>
                    </div>
                    <div className={classNames(style.topologyNodeGrid, getGridClass(zone.nodes.length))}>
                        {zone.nodes.map(({ node }) => {
                            const nodeState = playback.nodeStates[node.id] ?? 'idle';
                            return (
                                <span
                                    key={node.id}
                                    className={classNames(style.topologyDevice, attackNodeIds.has(node.id) && style.topologyAttackNode, getNodeStateClass(nodeState))}
                                    data-testid="topology-node"
                                    data-node-id={node.id}
                                    data-attack-state={nodeState}
                                >
                                    <i
                                        ref={(element) => {
                                            if (element) nodeIconRefs.current.set(node.id, element);
                                            else nodeIconRefs.current.delete(node.id);
                                        }}
                                        className={style.topologyDeviceIcon}
                                    >
                                        <DashboardTopologyDeviceGlyph nodeId={node.id} />
                                    </i>
                                    <em>{translate(`dashboard.topology.node.${node.id}`)}</em>
                                </span>
                            );
                        })}
                    </div>
                </article>
            ))}
        </div>
    );
};

export default TopologyMap;
