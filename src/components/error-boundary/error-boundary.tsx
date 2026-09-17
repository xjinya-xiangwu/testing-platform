import { ReactNode, Component, ErrorInfo } from 'react';
import { detector } from '@easycode/client-detector';

export interface ErrorBoundaryProps {
    children?: ReactNode;
}

export interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    static getDerivedStateFromError(error: Error) {
        console.log(error);
        // 更新 state 使下一次渲染能够显示降级后的 UI
        return { hasError: true };
    }

    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // errorInfo是以组件为单位的调用栈
        detector.sendError0(error, errorInfo.componentStack || '');
    }

    render() {
        if (this.state.hasError) {
            // 你可以自定义降级后的 UI 并渲染
            return <h1>Something went wrong.</h1>;
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
