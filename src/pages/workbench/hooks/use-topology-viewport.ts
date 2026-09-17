import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
    applyWorkbenchTopologyWheel,
    formatWorkbenchTopologyViewBox,
    getDefaultWorkbenchTopologyViewport,
    getWorkbenchTopologyZoom,
    type IWorkbenchTopologySize,
    type IWorkbenchTopologyViewport,
} from '@/pages/workbench/components/workbench-topology-viewport';

interface IDragState {
    clientX: number;
    clientY: number;
    viewport: IWorkbenchTopologyViewport;
}

const getPointerAnchor = (viewport: IWorkbenchTopologyViewport, element: SVGSVGElement, clientX: number, clientY: number) => {
    const bounds = element.getBoundingClientRect();
    const scale = Math.min(bounds.width / viewport.width, bounds.height / viewport.height);
    const renderedWidth = viewport.width * scale;
    const renderedHeight = viewport.height * scale;
    const offsetX = (bounds.width - renderedWidth) / 2;
    const offsetY = (bounds.height - renderedHeight) / 2;
    const ratioX = renderedWidth > 0 ? Math.min(1, Math.max(0, (clientX - bounds.left - offsetX) / renderedWidth)) : 0.5;
    const ratioY = renderedHeight > 0 ? Math.min(1, Math.max(0, (clientY - bounds.top - offsetY) / renderedHeight)) : 0.5;
    return {
        anchor: { x: viewport.x + viewport.width * ratioX, y: viewport.y + viewport.height * ratioY },
        containerHeight: bounds.height,
        containerWidth: bounds.width,
    };
};

const useTopologyViewport = (contentSize: IWorkbenchTopologySize) => {
    const [viewport, setViewport] = useState(() => getDefaultWorkbenchTopologyViewport(contentSize));
    const [isPanning, setIsPanning] = useState(false);
    const dragState = useRef<IDragState>();

    useEffect(() => {
        setViewport(getDefaultWorkbenchTopologyViewport(contentSize));
    }, [contentSize.height, contentSize.width]);

    const resetViewport = useCallback(() => setViewport(getDefaultWorkbenchTopologyViewport(contentSize)), [contentSize]);

    const zoomFromCenter = useCallback(
        (deltaY: number) => {
            setViewport((current) =>
                applyWorkbenchTopologyWheel(current, contentSize, {
                    anchor: { x: current.x + current.width / 2, y: current.y + current.height / 2 },
                    containerHeight: current.height,
                    containerWidth: current.width,
                    deltaX: 0,
                    deltaY,
                    isZoomGesture: true,
                }),
            );
        },
        [contentSize],
    );

    const handleWheel = useCallback(
        (event: ReactWheelEvent<SVGSVGElement>) => {
            const isZoomGesture = event.ctrlKey || event.metaKey;
            const isHorizontalPan = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
            if (!isZoomGesture && !isHorizontalPan) return;

            event.preventDefault();
            const element = event.currentTarget;
            const clientX = event.clientX;
            const clientY = event.clientY;
            const deltaX = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
            const deltaY = isZoomGesture ? event.deltaY : 0;
            setViewport((current) => {
                const pointer = getPointerAnchor(current, element, clientX, clientY);
                return applyWorkbenchTopologyWheel(current, contentSize, { ...pointer, deltaX, deltaY, isZoomGesture });
            });
        },
        [contentSize],
    );

    const handlePointerDown = useCallback(
        (event: ReactPointerEvent<SVGSVGElement>) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragState.current = { clientX: event.clientX, clientY: event.clientY, viewport };
            setIsPanning(true);
        },
        [viewport],
    );

    const handlePointerMove = useCallback(
        (event: ReactPointerEvent<SVGSVGElement>) => {
            const drag = dragState.current;
            if (!drag) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setViewport(
                applyWorkbenchTopologyWheel(drag.viewport, contentSize, {
                    anchor: { x: drag.viewport.x, y: drag.viewport.y },
                    containerHeight: bounds.height,
                    containerWidth: bounds.width,
                    deltaX: drag.clientX - event.clientX,
                    deltaY: drag.clientY - event.clientY,
                    isZoomGesture: false,
                }),
            );
        },
        [contentSize],
    );

    const handlePointerEnd = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        dragState.current = undefined;
        setIsPanning(false);
    }, []);

    return {
        handlePointerDown,
        handlePointerEnd,
        handlePointerMove,
        handleWheel,
        isPanning,
        resetViewport,
        viewBox: formatWorkbenchTopologyViewBox(viewport),
        zoom: getWorkbenchTopologyZoom(viewport, contentSize),
        zoomIn: useCallback(() => zoomFromCenter(-120), [zoomFromCenter]),
        zoomOut: useCallback(() => zoomFromCenter(120), [zoomFromCenter]),
    };
};

export default useTopologyViewport;
