import { detector } from '@easycode/client-detector';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from '@/routes/routes';
import AppProvider from '@/provider/app-provider';

function App() {
    useEffect(() => {
        const init = async () => {
            detector.sendClientInfo();
        };

        init();
    }, []);

    return (
        <AppProvider>
            <div className="w-full h-full app" id="app">
                <RouterProvider router={router} />
            </div>
        </AppProvider>
    );
}

export default App;
