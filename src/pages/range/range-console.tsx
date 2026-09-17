import { useMemo, useState } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import useTranslate from '@/hooks/useTranslate';
import RangeTopology from '@/pages/range/components/range-topology';
import { useRangeHall } from '@/pages/range/hooks/use-range';
import style from '@/pages/range/range.module.less';

const RangeConsole = () => {
    const translate = useTranslate();
    const { data, error, isLoading, refetch } = useRangeHall();
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('SCN-01');
    const availableEnvironments = useMemo(() => data?.environments.filter(({ status }) => status === 'available') ?? [], [data]);
    const selectedEnvironment = availableEnvironments.find(({ id }) => id === selectedEnvironmentId) ?? availableEnvironments[0];

    if (isLoading) return <div className={style.feedback}>{translate('common.loading')}</div>;
    if (error || !selectedEnvironment) {
        return (
            <div className={style.feedback} role="alert">
                <span>{translate('common.error')}</span>
                <button type="button" onClick={() => refetch()}>
                    {translate('common.retry')}
                </button>
            </div>
        );
    }

    return (
        <main className={classNames(style.rangePage, style.consolePage)}>
            <header className={style.pageHeader}>
                <div>
                    <span>{translate('range.eyebrow')}</span>
                    <h1>{translate('range.console.title')}</h1>
                    <p>{translate('range.console.subtitle')}</p>
                </div>
                <Link className={style.secondaryButton} to="/range-hall">
                    {translate('range.actions.backHall')}
                </Link>
            </header>

            <div className={style.sceneTabs} role="tablist" aria-label={translate('range.console.scenes')}>
                {availableEnvironments.map((environment) => {
                    const isSelected = environment.id === selectedEnvironment.id;
                    return (
                        <button
                            key={environment.id}
                            id={`range-tab-${environment.id}`}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            aria-controls="range-console-panel"
                            tabIndex={isSelected ? 0 : -1}
                            className={isSelected ? style.activeSceneTab : undefined}
                            onClick={() => setSelectedEnvironmentId(environment.id)}
                        >
                            {environment.name}
                        </button>
                    );
                })}
            </div>

            <div id="range-console-panel" role="tabpanel" aria-labelledby={`range-tab-${selectedEnvironment.id}`} className={style.consoleLayout}>
                <section className={style.panel} aria-label={translate('range.console.topology')}>
                    <RangeTopology environmentName={selectedEnvironment.name} topology={selectedEnvironment.topology} />
                </section>

                <aside className={style.consoleSidebar}>
                    <section className={style.panel} aria-label={translate('range.console.killChain')}>
                        <h2>{translate('range.console.killChain')}</h2>
                        <ol className={style.killChain}>
                            {selectedEnvironment.killChain.map((stage, index) => (
                                <li key={stage}>
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    {stage}
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section className={style.panel} aria-label={translate('range.console.telemetry')}>
                        <h2>{translate('range.console.telemetry')}</h2>
                        <dl className={style.telemetryGrid}>
                            {selectedEnvironment.telemetry.map((item) => (
                                <div key={item.label} className={item.isAlert ? style.alertTelemetry : undefined}>
                                    <dt>{item.label}</dt>
                                    <dd>{item.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                </aside>
            </div>
        </main>
    );
};

export default RangeConsole;
