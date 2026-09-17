import classNames from 'classnames';
import { GATEWAY_STATS, type IGatewayAgent } from '@/pages/gateway/gateway-mock';
import style from '@/pages/gateway/gateway.module.less';

interface GatewayAgentPanelProps {
    agents: readonly IGatewayAgent[];
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const GatewayAgentPanel = ({ agents, translate }: GatewayAgentPanelProps) => (
    <>
        <section className={style.statsGrid} aria-label={translate('gateway.stats.title')}>
            {GATEWAY_STATS.map((stat) => (
                <article key={stat.labelKey} className={style.metricCard}>
                    <span>{translate(stat.labelKey)}</span>
                    <strong>{translate(stat.valueKey)}</strong>
                    <small>{translate('gateway.mockBadge')}</small>
                </article>
            ))}
        </section>

        <div className={style.tableWrap}>
            <table aria-label={translate('gateway.agents.table')}>
                <thead>
                    <tr>
                        {['name', 'kind', 'endpoint', 'status', 'tasks', 'tokens', 'trajectories', 'cost'].map((column) => (
                            <th key={column}>{translate(`gateway.agents.columns.${column}`)}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {agents.map((agent) => (
                        <tr key={agent.id}>
                            <td className={style.strongCell}>{translate(agent.nameKey)}</td>
                            <td>{translate(agent.kindKey)}</td>
                            <td>
                                <code>{agent.endpoint}</code>
                            </td>
                            <td>
                                <span className={classNames(style.status, agent.isVerified ? style.statusActive : style.statusFailed)}>
                                    {translate(agent.isVerified ? 'gateway.status.verified' : 'gateway.status.unverified')}
                                </span>
                            </td>
                            <td>{agent.tasks}</td>
                            <td>{translate(agent.tokensKey)}</td>
                            <td>{translate(agent.trajectoriesKey)}</td>
                            <td>{agent.cost}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <p className={style.panelNote}>{translate('gateway.agents.note')}</p>
    </>
);

export default GatewayAgentPanel;
