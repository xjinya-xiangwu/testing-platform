import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDashboardFallbackData } from '@/api/dashboard';
import { ZH } from '@/locale/zh';
import DashboardAgentCapability from '@/pages/dashboard/components/dashboard-agent-capability';

const messages: Readonly<Record<string, string>> = ZH;
const translate = (key: string, values: Readonly<Record<string, string | number>> = {}) => {
    return Object.entries(values).reduce((message, [name, value]) => message.replace(`{${name}}`, String(value)), messages[key] ?? key);
};

const matchMedia = (matches: boolean) =>
    vi.fn().mockReturnValue({
        matches,
        media: '(prefers-reduced-motion: reduce)',
    } as MediaQueryList);

describe('DashboardAgentCapability', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('rotates Agents every 4.2 seconds and clears its timer on unmount', async () => {
        vi.stubGlobal('matchMedia', matchMedia(false));
        const data = createDashboardFallbackData();
        const view = render(<DashboardAgentCapability capabilities={data.capabilities} radar={data.radar} translate={translate} />);

        expect(screen.getByText('DoGNAVY')).toBeInTheDocument();
        expect(vi.getTimerCount()).toBe(1);

        act(() => vi.advanceTimersByTime(4200));
        expect(screen.getByText('Claude Mythos Preview')).toBeInTheDocument();

        view.unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('stays static when reduced motion is requested', async () => {
        vi.stubGlobal('matchMedia', matchMedia(true));
        const data = createDashboardFallbackData();
        render(<DashboardAgentCapability capabilities={data.capabilities} radar={data.radar} translate={translate} />);

        expect(screen.getByText('DoGNAVY')).toBeInTheDocument();
        expect(vi.getTimerCount()).toBe(0);
        act(() => vi.advanceTimersByTime(8400));
        expect(screen.queryByText('Claude Mythos Preview')).not.toBeInTheDocument();
    });
});
