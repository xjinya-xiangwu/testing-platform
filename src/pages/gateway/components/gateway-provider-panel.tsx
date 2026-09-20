import classNames from 'classnames';
import { aggregateGatewayMetrics, summarizeGatewayHealth } from '@/features/gateway/domain/gateway-catalog';
import type { IGatewayProvider } from '@/features/gateway/domain/gateway-provider';
import style from '@/pages/gateway/gateway.module.less';
import type { IApiToken } from '@/api/api-tokens';

interface GatewayProviderPanelProps {
    busyProviderId: string | null;
    errorMessage: string | null;
    isLoading: boolean;
    language: string;
    onRegister: () => void;
    onRemove: (providerId: string) => void;
    onRetry: () => void;
    onReverify: (providerId: string) => void;
    providers: readonly IGatewayProvider[];
    tokens: readonly IApiToken[];
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const formatCompact = (value: number, language: string) => new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatCurrency = (value: number, language: string) => new Intl.NumberFormat(language, { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);

const formatDateTime = (value: string | null, language: string, fallback: string) => {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const GATEWAY_PROVIDER_COLUMNS = ['name', 'kind', 'endpoint', 'protocol', 'harness', 'key', 'status', 'health', 'verifiedAt', 'tasks', 'actions'] as const;

const healthCell = (provider: IGatewayProvider) => {
    if (provider.status === 'unverified') return { className: style.statusQuiet, key: 'gateway.providers.health.unverified' } as const;
    return provider.health === 'healthy'
        ? ({ className: style.statusActive, key: 'gateway.providers.health.healthy' } as const)
        : ({ className: style.statusFailed, key: 'gateway.providers.health.impaired' } as const);
};

const GatewayProviderPanel = ({ busyProviderId, errorMessage, isLoading, language, onRegister, onRemove, onRetry, onReverify, providers, tokens, translate }: GatewayProviderPanelProps) => {
    const totals = aggregateGatewayMetrics(providers);
    const health = summarizeGatewayHealth(providers);
    const tokenName = (credentialId: string | null) => (credentialId ? (tokens.find((token) => token.credentialId === credentialId)?.name ?? credentialId) : null);
    const stats = [
        { label: translate('gateway.stats.tasks'), value: formatCompact(totals.tasks, language) },
        { label: translate('gateway.stats.tokens'), value: formatCompact(totals.tokensTotal, language) },
        { label: translate('gateway.stats.trajectories'), value: formatCompact(totals.trajectories, language) },
        { label: translate('gateway.stats.cost'), value: formatCurrency(totals.costCny, language) },
    ];
    const healthChips = [
        { className: style.statusActive, count: health.healthy, label: translate('gateway.providers.health.healthy') },
        { className: style.statusFailed, count: health.impaired, label: translate('gateway.providers.health.impaired') },
        { className: style.statusQuiet, count: health.unverified, label: translate('gateway.providers.health.unverified') },
    ];

    return (
        <>
            <section className={style.statsGrid} aria-label={translate('gateway.stats.title')}>
                {stats.map((stat) => (
                    <article key={stat.label} className={style.metricCard}>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                        <small>{translate('gateway.stats.source')}</small>
                    </article>
                ))}
            </section>

            <div className={style.healthStrip}>
                <span>{translate('gateway.providers.health.title')}</span>
                {healthChips.map((chip) => (
                    <span key={chip.label} className={classNames(style.status, chip.className)}>
                        {chip.label} · {chip.count}
                    </span>
                ))}
            </div>

            {isLoading ? <div className={style.feedback}>{translate('common.loading')}</div> : null}
            {errorMessage ? (
                <div className={style.feedback} role="alert">
                    <span>{errorMessage}</span>
                    <button type="button" onClick={onRetry}>
                        {translate('common.retry')}
                    </button>
                </div>
            ) : null}
            {!isLoading && !errorMessage && providers.length === 0 ? (
                <div className={style.feedback}>
                    <span>{translate('gateway.providers.empty')}</span>
                    <button type="button" className={style.primaryButton} onClick={onRegister}>
                        {translate('gateway.providers.register')}
                    </button>
                </div>
            ) : null}
            {providers.length > 0 ? (
                <div className={classNames(style.tableWrap, style.providerTable)}>
                    <table aria-label={translate('gateway.providers.title')}>
                        <thead>
                            <tr>
                                {GATEWAY_PROVIDER_COLUMNS.map((column) => (
                                    <th key={column}>{translate(`gateway.providers.columns.${column}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {providers.map((provider) => {
                                const healthInfo = healthCell(provider);
                                return (
                                    <tr key={provider.id}>
                                        <td className={style.strongCell}>{provider.name}</td>
                                        <td>{translate(`gateway.agent.kind.${provider.kind}`)}</td>
                                        <td>
                                            <code>{provider.endpoint}</code>
                                        </td>
                                        <td>
                                            <code>{provider.protocol}</code>
                                        </td>
                                        <td>
                                            <code>{provider.harness}</code>
                                        </td>
                                        <td>{tokenName(provider.keyCredentialId) ?? <span className={style.quietCell}>{translate('gateway.providers.keyNone')}</span>}</td>
                                        <td>
                                            <span className={classNames(style.status, provider.status === 'verified' ? style.statusActive : style.statusFailed)}>
                                                {translate(provider.status === 'verified' ? 'gateway.status.verified' : 'gateway.status.unverified')}
                                            </span>
                                        </td>
                                        <td title={provider.lastErrorCode ?? undefined}>
                                            <span className={classNames(style.status, healthInfo.className)}>{translate(healthInfo.key)}</span>
                                        </td>
                                        <td>{formatDateTime(provider.verifiedAt, language, '—')}</td>
                                        <td>{provider.metrics.tasks}</td>
                                        <td>
                                            <div className={style.rowActions}>
                                                <button type="button" className={style.secondaryButton} disabled={busyProviderId === provider.id} onClick={() => onReverify(provider.id)}>
                                                    {translate('gateway.providers.reverify')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={style.dangerButton}
                                                    disabled={busyProviderId === provider.id}
                                                    aria-label={translate('gateway.providers.removeLabel', { name: provider.name })}
                                                    onClick={() => onRemove(provider.id)}
                                                >
                                                    {translate('gateway.providers.remove')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : null}
            <p className={style.panelNote}>{translate('gateway.providers.note')}</p>
        </>
    );
};

export default GatewayProviderPanel;
