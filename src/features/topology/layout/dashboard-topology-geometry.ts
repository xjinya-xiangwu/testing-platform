interface ICanvasSize {
    height: number;
    width: number;
}

interface IRectLike {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
}

interface IProjectedRect {
    bottom: number;
    centerX: number;
    centerY: number;
    left: number;
    right: number;
    top: number;
}

export interface IDashboardTopologyGeometryInput {
    attackerRect: IRectLike;
    canvas: ICanvasSize;
    iconRects: Readonly<Record<string, IRectLike>>;
    svgRect: IRectLike;
    zoneRects: Readonly<Record<string, IRectLike>>;
}

export interface IDashboardTopologyGeometry {
    attackPaths: Readonly<Record<string, string>>;
    iconClearPath: string;
    zoneLinkPaths: Readonly<Record<string, string>>;
}

const format = (value: number) => String(Number(value.toFixed(1)));

const projectRect = (rect: IRectLike, svgRect: IRectLike, canvas: ICanvasSize): IProjectedRect => {
    const left = ((rect.left - svgRect.left) / svgRect.width) * canvas.width;
    const right = ((rect.right - svgRect.left) / svgRect.width) * canvas.width;
    const top = ((rect.top - svgRect.top) / svgRect.height) * canvas.height;
    const bottom = ((rect.bottom - svgRect.top) / svgRect.height) * canvas.height;
    return { left, right, top, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
};

export const getDashboardTopologyGeometry = ({ attackerRect, canvas, iconRects, svgRect, zoneRects }: IDashboardTopologyGeometryInput): IDashboardTopologyGeometry => {
    const zones = Object.fromEntries(Object.entries(zoneRects).map(([id, rect]) => [id, projectRect(rect, svgRect, canvas)]));
    const icons = Object.fromEntries(Object.entries(iconRects).map(([id, rect]) => [id, projectRect(rect, svgRect, canvas)]));
    const attacker = projectRect(attackerRect, svgRect, canvas);
    const publicAccess = zones['public-access'];
    const businessApplication = zones['business-application'];
    const gisService = zones['gis-service'];
    const gisData = zones['gis-data'];
    const opsMonitoring = zones['ops-monitoring'];
    const monitoringData = zones['monitoring-data'];
    const react = icons.react;
    const dubbo = icons.dubbo;
    const geoserver = icons.geoserver;
    const postgres = icons.postgres;
    const cacti = icons.cacti;
    const neo4j = icons.neo4j;
    const gisBranchX = businessApplication && gisService ? (businessApplication.right + gisService.left) / 2 : undefined;
    const opsBranchX = businessApplication && opsMonitoring ? (businessApplication.right + opsMonitoring.left) / 2 : undefined;
    const gisTurnX = dubbo ? dubbo.right + 37 : undefined;
    const dataTurnX = opsMonitoring ? opsMonitoring.right + 32 : undefined;

    const zoneLinkPaths = {
        ...(publicAccess && businessApplication ? { 'public-business': `M${format(publicAccess.right)} ${format(publicAccess.centerY)} H${format(businessApplication.left)}` } : {}),
        ...(businessApplication && gisService && gisBranchX !== undefined
            ? {
                  'business-gis-service': `M${format(businessApplication.right)} ${format(businessApplication.centerY)} H${format(gisBranchX)} V${format(gisService.centerY)} H${format(gisService.left)}`,
              }
            : {}),
        ...(gisService && gisData ? { 'gis-service-data': `M${format(gisService.right)} ${format(gisService.centerY)} H${format(gisData.left)}` } : {}),
        ...(businessApplication && opsMonitoring && opsBranchX !== undefined
            ? {
                  'business-ops': `M${format(businessApplication.right)} ${format(businessApplication.centerY)} H${format(opsBranchX)} V${format(opsMonitoring.centerY)} H${format(opsMonitoring.left)}`,
              }
            : {}),
        ...(opsMonitoring && monitoringData ? { 'ops-monitoring-data': `M${format(opsMonitoring.right)} ${format(opsMonitoring.centerY)} H${format(monitoringData.left)}` } : {}),
    };
    const attackPaths = {
        ...(react ? { 'attacker->react': `M${format(attacker.centerX)} ${format(attacker.bottom)} V${format(attacker.bottom + 30)} H${format(react.centerX)} V${format(react.top)}` } : {}),
        ...(react && dubbo ? { 'react->dubbo': `M${format(react.right)} ${format(react.centerY)} H${format(dubbo.left)}` } : {}),
        ...(dubbo && geoserver && gisTurnX !== undefined
            ? { 'dubbo->geoserver': `M${format(dubbo.right)} ${format(dubbo.centerY)} H${format(gisTurnX)} V${format(geoserver.centerY)} H${format(geoserver.left)}` }
            : {}),
        ...(geoserver && postgres ? { 'geoserver->postgres': `M${format(geoserver.right)} ${format(geoserver.centerY)} H${format(postgres.left)}` } : {}),
        ...(dubbo && cacti && gisTurnX !== undefined
            ? { 'dubbo->cacti': `M${format(dubbo.right)} ${format(dubbo.centerY)} H${format(gisTurnX)} V${format(cacti.centerY)} H${format(cacti.left)}` }
            : {}),
        ...(cacti && neo4j && dataTurnX !== undefined
            ? { 'cacti->neo4j': `M${format(cacti.right)} ${format(cacti.centerY)} H${format(dataTurnX)} V${format(neo4j.centerY)} H${format(neo4j.left)}` }
            : {}),
    };
    const iconCutouts = Object.values(icons).map((rect) => `M${format(rect.left)},${format(rect.top)} H${format(rect.right)} V${format(rect.bottom)} H${format(rect.left)} Z`);

    return {
        attackPaths,
        iconClearPath: [`M0,0 H${format(canvas.width)} V${format(canvas.height)} H0 Z`, ...iconCutouts].join(' '),
        zoneLinkPaths,
    };
};
