import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InfoContext } from '@/provider/global-provider';
import { LocaleLanguage, LocaleMessages } from '@/locale';
import { ZH } from '@/locale/zh';

export const renderRangePage = (element: ReactElement, initialPath = '/dashboard', locale: LocaleMessages = ZH, lang: LocaleLanguage = 'zh-CN') => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    });

    return {
        queryClient,
        ...render(
            <InfoContext.Provider
                value={{
                    lang,
                    locale,
                    setLocale: () => undefined,
                    isLogin: true,
                    userInfo: { ssoUid: 'test-user' },
                    initUser: () => undefined,
                    loginOut: () => undefined,
                }}
            >
                <QueryClientProvider client={queryClient}>
                    <MemoryRouter initialEntries={[initialPath]}>{element}</MemoryRouter>
                </QueryClientProvider>
            </InfoContext.Provider>,
        ),
    };
};
