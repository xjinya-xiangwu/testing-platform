import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import GlobalProvider from '@/provider/global-provider';
import { queryClient } from '@/provider/query-client';

interface AppProviderProps {
    children: ReactNode;
}

function AppProvider({ children }: AppProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <GlobalProvider>{children}</GlobalProvider>
        </QueryClientProvider>
    );
}

export default AppProvider;
