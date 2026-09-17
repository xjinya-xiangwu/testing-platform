import { Link } from 'react-router-dom';
import { useMemo, useRef } from 'react';
import { createDashboardFallbackData } from '@/api/dashboard';
import MetricStrip from '@/pages/dashboard/components/metric-strip';
import { useDashboard } from '@/pages/dashboard/hooks/use-dashboard';
import useDashboardStageFit from '@/pages/dashboard/hooks/use-dashboard-stage-fit';
import useTranslate from '@/hooks/useTranslate';
import style from '@/pages/dashboard/dashboard.module.less';

const formatCount = (value?: number) => (value === undefined ? '—' : value.toLocaleString());

const Dashboard = () => {
    const dashboardRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLElement>(null);
    const translate = useTranslate();
    const { data } = useDashboard();
    const fallbackData = useMemo(() => createDashboardFallbackData(), []);
    const dashboardData = data ?? fallbackData;
    const { taskRing } = dashboardData;
    const total = taskRing.total ?? 0;
    const completed = taskRing.doneToday ?? 0;
    const running = taskRing.running ?? 0;
    const queued = taskRing.queued ?? 0;
    const completion = taskRing.completionPercent ?? (total ? (completed / total) * 100 : 0);

    useDashboardStageFit(dashboardRef, stageRef);

    return (
        <main ref={dashboardRef} className={style.dashboard} aria-label={translate('dashboard.home.title')}>
            <section ref={stageRef} className={style.stage}>
                <div className={style.scanGrid} aria-hidden="true" />

                <header className={style.titlePlate}>
                    <span className={style.cornerLine} aria-hidden="true" />
                    <p>{translate('dashboard.home.eyebrow')}</p>
                    <h1>{translate('dashboard.home.title')}</h1>
                </header>

                <MetricStrip metrics={dashboardData.metrics} translate={translate} />

                <section className={style.codeProgress} aria-label={translate('dashboard.home.progressTitle')}>
                    <header className={style.progressHeader}>
                        <div>
                            <p>{translate('dashboard.home.eyebrow')}</p>
                            <h2>{translate('dashboard.home.progressTitle')}</h2>
                            <span>{translate('dashboard.home.progressDescription')}</span>
                        </div>
                        <Link to="/tasks?type=code">{translate('dashboard.tasks.link')}</Link>
                    </header>

                    <div className={style.progressSummary}>
                        <div>
                            <span>{translate('dashboard.home.totalTasks')}</span>
                            <strong>{formatCount(total)}</strong>
                        </div>
                        <div>
                            <span>{translate('dashboard.tasks.running')}</span>
                            <strong>{formatCount(running)}</strong>
                        </div>
                        <div>
                            <span>{translate('dashboard.tasks.queued')}</span>
                            <strong>{formatCount(queued)}</strong>
                        </div>
                        <div>
                            <span>{translate('dashboard.home.completedTasks')}</span>
                            <strong>{formatCount(completed)}</strong>
                        </div>
                    </div>

                    <div className={style.progressBar}>
                        <div>
                            <span>{translate('dashboard.tasks.progress')}</span>
                            <strong>{completion.toFixed(1)}%</strong>
                        </div>
                        <progress value={completion} max="100" aria-label={translate('dashboard.tasks.summary', { total, percent: `${completion.toFixed(1)}%` })} />
                    </div>
                </section>
            </section>
        </main>
    );
};

export default Dashboard;
