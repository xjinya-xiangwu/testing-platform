import { useEffect, useMemo, useRef, useState } from 'react';
import { createDashboardFallbackData } from '@/api/dashboard';
import DashboardCenterColumn from '@/pages/dashboard/components/dashboard-center-column';
import DashboardLeftColumn from '@/pages/dashboard/components/dashboard-left-column';
import DashboardRightColumn from '@/pages/dashboard/components/dashboard-right-column';
import MetricStrip from '@/pages/dashboard/components/metric-strip';
import { useDashboard } from '@/pages/dashboard/hooks/use-dashboard';
import useDashboardStageFit from '@/pages/dashboard/hooks/use-dashboard-stage-fit';
import { useSimulationStore } from '@/stores/simulation-store';
import useTranslate from '@/hooks/useTranslate';
import sceneMap from '@/assets/dashboard/scene-map.png';
import style from '@/pages/dashboard/dashboard.module.less';

const Dashboard = () => {
    const dashboardRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLElement>(null);
    const translate = useTranslate();
    const { data } = useDashboard();
    const fallbackData = useMemo(() => createDashboardFallbackData(), []);
    const dashboardData = data ?? fallbackData;
    const eventCursor = useSimulationStore((state) => state.eventCursor);
    const [clock, setClock] = useState(() => new Date());
    const [eventTimeline] = useState(() => ({
        enteredAt: Date.now(),
        seed: Math.floor(Math.random() * 0xffffffff),
        startCursor: eventCursor,
    }));
    const registerTimer = useSimulationStore((state) => state.registerTimer);

    useDashboardStageFit(dashboardRef, stageRef);

    useEffect(() => {
        const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
        return () => window.clearInterval(clockTimer);
    }, []);

    useEffect(() => {
        const hasReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        if (hasReducedMotion) return undefined;

        const tickTimer = window.setInterval(() => useSimulationStore.getState().tick(), 2000);
        registerTimer(tickTimer);

        return () => useSimulationStore.getState().stopTimers();
    }, [registerTimer]);

    const clockLabel = clock.toLocaleTimeString(undefined, { hour12: false });
    const dateLabel = [clock.getFullYear(), `${clock.getMonth() + 1}`.padStart(2, '0'), `${clock.getDate()}`.padStart(2, '0')].join('.');

    return (
        <main ref={dashboardRef} className={style.dashboard} aria-label={translate('dashboard.title')}>
            <section ref={stageRef} className={style.stage}>
                <img className={style.sceneMap} src={sceneMap} alt="" />
                <div className={style.depthVignette} aria-hidden="true" />
                <div className={style.scanGrid} aria-hidden="true" />

                <header className={style.titlePlate}>
                    <span className={style.cornerLine} aria-hidden="true" />
                    <h1>{translate('dashboard.title')}</h1>
                    <p>{translate('dashboard.subtitle')}</p>
                </header>

                <nav className={style.systemRibbon} aria-label={translate('dashboard.system.label')}>
                    <span className={style.liveStatus}>{translate('dashboard.status.service')}</span>
                    <span>
                        {translate('dashboard.status.threat')} <strong>{translate('dashboard.status.medium')}</strong>
                    </span>
                    <span>
                        {translate('dashboard.status.alerts')} <strong>3</strong>
                    </span>
                    <span>
                        {translate('dashboard.status.blockRate')} <strong>99.6%</strong>
                    </span>
                    <span>
                        {translate('dashboard.status.nodes')} <strong>5/5</strong>
                    </span>
                    <time dateTime={clock.toISOString()}>
                        <strong>{clockLabel}</strong>
                        <small>{dateLabel}</small>
                    </time>
                </nav>

                <MetricStrip metrics={dashboardData.metrics} translate={translate} />

                <div className={style.dashboardGrid}>
                    <DashboardLeftColumn translate={translate} />
                    <DashboardCenterColumn
                        data={dashboardData}
                        eventCursor={eventCursor}
                        eventTimelineEnteredAt={eventTimeline.enteredAt}
                        eventTimelineSeed={eventTimeline.seed}
                        eventTimelineStartCursor={eventTimeline.startCursor}
                        translate={translate}
                    />
                    <DashboardRightColumn data={dashboardData} translate={translate} />
                </div>
            </section>
        </main>
    );
};

export default Dashboard;
