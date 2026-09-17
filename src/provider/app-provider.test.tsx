import { useContext, useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import AppProvider from '@/provider/app-provider';
import { InfoContext } from '@/provider/global-provider';
import { queryClient } from '@/provider/query-client';

vi.mock('@/hooks/useLocale', () => ({
    default: () => ({
        lang: 'zh-CN',
        locale: {},
        setLocale: vi.fn(),
    }),
}));

vi.mock('@/hooks/useLogin', () => ({
    default: () => ({
        isLogin: false,
        userInfo: {},
        initUser: vi.fn(),
        doLoginOut: vi.fn(),
    }),
}));

interface ProviderProbeProps {
    onClient: (client: ReturnType<typeof useQueryClient>) => void;
    version: number;
}

function ProviderProbe({ onClient, version }: ProviderProbeProps) {
    const client = useQueryClient();
    const { lang } = useContext(InfoContext);

    useEffect(() => {
        onClient(client);
    }, [client, onClient, version]);

    return <span>{lang}</span>;
}

describe('AppProvider', () => {
    it('composes the query and global providers with a stable query client', () => {
        const onClient = vi.fn();
        const { rerender } = render(
            <AppProvider>
                <ProviderProbe onClient={onClient} version={1} />
            </AppProvider>,
        );

        rerender(
            <AppProvider>
                <ProviderProbe onClient={onClient} version={2} />
            </AppProvider>,
        );

        expect(screen.getByText('zh-CN')).toBeInTheDocument();
        expect(onClient).toHaveBeenNthCalledWith(1, queryClient);
        expect(onClient).toHaveBeenNthCalledWith(2, queryClient);
    });
});
