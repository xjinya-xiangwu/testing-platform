import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app';
import { init } from '@easycode/client-detector';
import ErrorBoundary from '@/components/error-boundary';

const serviceName = 'security-attack-defense-fe'; // 必填且唯一，找管理员查询

init(
    import.meta.env.VITE_BURY_HOST,
    {
        serviceName,
    },
    import.meta.env.MODE === 'production' ? 'production' : 'development',
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>,
);
