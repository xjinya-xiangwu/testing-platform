import { IDashboardMetric } from '@/api/dashboard';
import environmentsIcon from '@/assets/icons/dashboard-environments.svg';
import evaluationsIcon from '@/assets/icons/dashboard-evaluations.svg';
import eventsIcon from '@/assets/icons/dashboard-events.svg';
import exercisesIcon from '@/assets/icons/dashboard-exercises.svg';
import instancesIcon from '@/assets/icons/dashboard-instances.svg';
import trainingIcon from '@/assets/icons/dashboard-training.svg';
import style from '@/pages/dashboard/dashboard.module.less';

interface MetricStripProps {
    metrics: readonly IDashboardMetric[];
    translate: (key: string) => string;
}

const METRIC_ICONS: Readonly<Record<string, string>> = {
    sandboxes: environmentsIcon,
    benchmarks: exercisesIcon,
    subjects: instancesIcon,
    runs: evaluationsIcon,
    reviews: eventsIcon,
    reports: trainingIcon,
};

const MetricStrip = ({ metrics, translate }: MetricStripProps) => {
    return (
        <section className={style.metricStrip} aria-label={translate('dashboard.title')}>
            {metrics.map((metric) => (
                <article key={metric.id} className={style.metric} data-testid="dashboard-metric">
                    <span className={style.metricIcon} aria-hidden="true">
                        <img src={METRIC_ICONS[metric.id]} alt="" />
                    </span>
                    <span>{translate(metric.labelKey)}</span>
                    <strong>{metric.value === undefined ? translate('common.notAvailable') : metric.value.toLocaleString()}</strong>
                    <small>
                        {translate(metric.unitKey)} · {translate(metric.trendKey)}
                    </small>
                </article>
            ))}
        </section>
    );
};

export default MetricStrip;
