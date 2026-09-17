import { useEffect, useState } from 'react';
import { IDashboardCapability, IDashboardRadar } from '@/api/dashboard';
import RadarChart from '@/pages/dashboard/components/radar-chart';
import style from '@/pages/dashboard/components/dashboard-panels.module.less';

interface DashboardAgentCapabilityProps {
    capabilities: readonly IDashboardCapability[];
    radar: IDashboardRadar;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const AGENT_ROTATION_MS = 4200;

const DashboardAgentCapability = ({ capabilities, radar, translate }: DashboardAgentCapabilityProps) => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (capabilities.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

        const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % capabilities.length), AGENT_ROTATION_MS);
        return () => window.clearInterval(timer);
    }, [capabilities.length]);

    const capability = capabilities[activeIndex] ?? capabilities[0];
    if (!capability) return null;

    const labels = radar.dimensionKeys.map((key) => translate(key));

    return (
        <div className={style.capabilityPanel}>
            <header className={style.agentHeader}>
                <div>
                    <small>{translate('dashboard.capability.current')}</small>
                    <strong>{capability.name}</strong>
                </div>
                <span className={style.agentScenario}>{translate(capability.scenarioKey)}</span>
                <div className={style.agentDots} aria-label={translate('dashboard.capability.rotation')}>
                    {capabilities.map((agent, index) => (
                        <span className={index === activeIndex ? style.activeAgentDot : undefined} key={agent.name} title={agent.name} />
                    ))}
                </div>
            </header>

            <section className={style.capabilityRadar} aria-label={translate('dashboard.radar.title')}>
                <h3>{translate('dashboard.radar.title')}</h3>
                <div className={style.radarPlot}>
                    <RadarChart baseline={radar.baseline} current={capability.radar} labels={labels} />
                    <div className={style.radarLabels}>
                        {labels.map((label, index) => (
                            <span key={label}>
                                {label} <b>{capability.radar[index]}</b>
                            </span>
                        ))}
                    </div>
                    <div className={style.radarKey}>
                        <span>{translate('dashboard.radar.current')}</span>
                        <span>{translate('dashboard.radar.baseline')}</span>
                    </div>
                </div>
            </section>

            <section className={style.costEfficiency} aria-label={translate('dashboard.efficiency.title')}>
                <h3>{translate('dashboard.efficiency.title')}</h3>
                <dl className={style.costMetrics}>
                    <div>
                        <dt>{translate('dashboard.efficiency.time')}</dt>
                        <dd>{translate('dashboard.efficiency.timeValue', { value: capability.efficiency.timeSeconds.toFixed(1) })}</dd>
                    </div>
                    <div>
                        <dt>{translate('dashboard.efficiency.tokens')}</dt>
                        <dd>{translate('dashboard.efficiency.tokenValue', { value: capability.efficiency.tokenThousands })}</dd>
                    </div>
                    <div>
                        <dt>{translate('dashboard.efficiency.amount')}</dt>
                        <dd>{translate('dashboard.efficiency.amountValue', { value: capability.efficiency.costYuan.toFixed(2) })}</dd>
                    </div>
                </dl>
                <ul className={style.efficiencyBars}>
                    {capability.efficiency.bars.map((bar) => (
                        <li key={bar.labelKey}>
                            <span>{translate(bar.labelKey)}</span>
                            <progress max={100} value={bar.value} />
                            <b>{bar.value}%</b>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export default DashboardAgentCapability;
