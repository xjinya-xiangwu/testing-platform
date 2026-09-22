import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'app-theme';

const listeners = new Set<() => void>();

const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

const applyTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
    try {
        window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Storage may be unavailable (private mode); the attribute still drives the theme.
    }
    listeners.forEach((notify) => notify());
};

/**
 * Theme state backed by the `data-theme` attribute on <html> (set pre-paint by
 * index.html so the first frame already has the persisted palette). Light is the
 * default; the choice persists in localStorage under `app-theme`.
 */
export const useTheme = () => {
    const theme = useSyncExternalStore(
        (onStoreChange) => {
            listeners.add(onStoreChange);
            return () => listeners.delete(onStoreChange);
        },
        currentTheme,
        () => 'light' as Theme,
    );
    const setTheme = useCallback((next: Theme) => applyTheme(next), []);
    const toggleTheme = useCallback(() => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'), []);
    return { theme, setTheme, toggleTheme };
};
