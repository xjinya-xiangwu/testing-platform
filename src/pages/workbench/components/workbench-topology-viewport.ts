export interface IWorkbenchTopologySize {
    height: number;
    width: number;
}

export interface IWorkbenchTopologyViewport extends IWorkbenchTopologySize {
    x: number;
    y: number;
}

interface IWorkbenchTopologyWheelInput {
    anchor: { x: number; y: number };
    containerHeight: number;
    containerWidth: number;
    deltaX: number;
    deltaY: number;
    isZoomGesture: boolean;
}

export const DEFAULT_WORKBENCH_TOPOLOGY_ZOOM = 0.9;
const MIN_WORKBENCH_TOPOLOGY_ZOOM = 0.55;
const MAX_WORKBENCH_TOPOLOGY_ZOOM = 2.4;
const WHEEL_ZOOM_SENSITIVITY = 0.002;

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const roundCoordinate = (value: number) => Number(value.toFixed(2));

const clampViewport = (viewport: IWorkbenchTopologyViewport, contentSize: IWorkbenchTopologySize): IWorkbenchTopologyViewport => {
    const overscrollX = viewport.width * 0.15;
    const overscrollY = viewport.height * 0.15;
    const minimumX = Math.min(0, contentSize.width - viewport.width) - overscrollX;
    const maximumX = Math.max(0, contentSize.width - viewport.width) + overscrollX;
    const minimumY = Math.min(0, contentSize.height - viewport.height) - overscrollY;
    const maximumY = Math.max(0, contentSize.height - viewport.height) + overscrollY;
    return {
        ...viewport,
        x: roundCoordinate(clamp(viewport.x, minimumX, maximumX)),
        y: roundCoordinate(clamp(viewport.y, minimumY, maximumY)),
    };
};

export const getWorkbenchTopologyZoom = (viewport: IWorkbenchTopologyViewport, contentSize: IWorkbenchTopologySize) => contentSize.width / viewport.width;

const getViewportForZoom = (contentSize: IWorkbenchTopologySize, zoom: number, anchor: { x: number; y: number }, anchorRatio: { x: number; y: number }) => {
    const width = contentSize.width / zoom;
    const height = contentSize.height / zoom;
    return clampViewport(
        {
            height: roundCoordinate(height),
            width: roundCoordinate(width),
            x: roundCoordinate(anchor.x - width * anchorRatio.x),
            y: roundCoordinate(anchor.y - height * anchorRatio.y),
        },
        contentSize,
    );
};

export const getDefaultWorkbenchTopologyViewport = (contentSize: IWorkbenchTopologySize): IWorkbenchTopologyViewport =>
    getViewportForZoom(contentSize, DEFAULT_WORKBENCH_TOPOLOGY_ZOOM, { x: contentSize.width / 2, y: contentSize.height / 2 }, { x: 0.5, y: 0.5 });

export const applyWorkbenchTopologyWheel = (viewport: IWorkbenchTopologyViewport, contentSize: IWorkbenchTopologySize, input: IWorkbenchTopologyWheelInput): IWorkbenchTopologyViewport => {
    if (input.isZoomGesture) {
        const currentZoom = getWorkbenchTopologyZoom(viewport, contentSize);
        const nextZoom = clamp(currentZoom * Math.exp(-input.deltaY * WHEEL_ZOOM_SENSITIVITY), MIN_WORKBENCH_TOPOLOGY_ZOOM, MAX_WORKBENCH_TOPOLOGY_ZOOM);
        const anchorRatio = {
            x: clamp((input.anchor.x - viewport.x) / viewport.width, 0, 1),
            y: clamp((input.anchor.y - viewport.y) / viewport.height, 0, 1),
        };
        return getViewportForZoom(contentSize, nextZoom, input.anchor, anchorRatio);
    }

    const containerScale = Math.min(input.containerWidth / viewport.width, input.containerHeight / viewport.height);
    if (!Number.isFinite(containerScale) || containerScale <= 0) return viewport;
    return clampViewport(
        {
            ...viewport,
            x: roundCoordinate(viewport.x + input.deltaX / containerScale),
            y: roundCoordinate(viewport.y + input.deltaY / containerScale),
        },
        contentSize,
    );
};

export const formatWorkbenchTopologyViewBox = (viewport: IWorkbenchTopologyViewport) => `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`;
