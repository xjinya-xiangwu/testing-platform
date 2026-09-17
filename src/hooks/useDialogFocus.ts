import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'].join(',');

const getFocusableElements = (dialog: HTMLElement) => {
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
};

const useDialogFocus = <T extends HTMLElement>(isOpen: boolean, onClose: () => boolean | void): RefObject<T> => {
    const dialogRef = useRef<T>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen || !dialogRef.current) return undefined;

        const dialog = dialogRef.current;
        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const focusableElements = getFocusableElements(dialog);
        (focusableElements[0] ?? dialog).focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;
            const activeElement = document.activeElement;
            const focusedDialog = activeElement instanceof HTMLElement ? activeElement.closest<HTMLElement>('[role="dialog"]') : null;
            if (focusedDialog && focusedDialog !== dialog && dialog.contains(focusedDialog)) return;

            if (event.key === 'Escape') {
                const isHandled = onCloseRef.current() !== false;
                if (isHandled) event.preventDefault();
                return;
            }
            if (event.key !== 'Tab') return;

            const currentFocusableElements = getFocusableElements(dialog);
            const firstElement = currentFocusableElements[0];
            const lastElement = currentFocusableElements.at(-1);
            if (!firstElement || !lastElement) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            if (event.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && (activeElement === lastElement || !dialog.contains(activeElement))) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus();
        };
    }, [isOpen]);

    return dialogRef;
};

export default useDialogFocus;
