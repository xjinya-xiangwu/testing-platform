import classNames from 'classnames';
import { GATEWAY_FLOW, GATEWAY_QUOTAS } from '@/pages/gateway/gateway-mock';
import style from '@/pages/gateway/gateway.module.less';
import type { ApiTokenStatus, IApiTokenPage } from '@/api/api-tokens';

const TOKEN_STATUS_KEY: Readonly<Record<ApiTokenStatus, string>> = {
    ACTIVE: 'gateway.status.active',
    EXPIRED: 'gateway.status.expired',
    REVOKED: 'gateway.status.revoked',
};

interface GatewayTokenPanelProps {
    data?: IApiTokenPage;
    errorMessage: string | null;
    isLoading: boolean;
    language: string;
    onRefetch: () => void;
    onRevoke: (credentialId: string) => void;
    revokingId: string | null;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const formatDateTime = (value: string | undefined, language: string, fallback: string) => {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const GatewayTokenPanel = ({ data, errorMessage, isLoading, language, onRefetch, onRevoke, revokingId, translate }: GatewayTokenPanelProps) => (
    <>
        <section className={style.flowSection}>
            <header className={style.sectionHeader}>
                <div>
                    <h2>{translate('gateway.flow.title')}</h2>
                    <span>{translate('gateway.flow.subtitle')}</span>
                </div>
                <small>{translate('gateway.mockBadge')}</small>
            </header>
            <div className={style.flowGrid}>
                {GATEWAY_FLOW.map((item, index) => (
                    <article key={item}>
                        <strong>{translate(`gateway.flow.${item}.title`)}</strong>
                        <span>{translate(`gateway.flow.${item}.description`)}</span>
                        <small>{translate(`gateway.flow.${item}.caption`)}</small>
                        {index < GATEWAY_FLOW.length - 1 ? <i aria-hidden="true">→</i> : null}
                    </article>
                ))}
            </div>
        </section>

        <section className={style.quotaGrid} aria-label={translate('gateway.quota.title')}>
            {GATEWAY_QUOTAS.map((item) => (
                <article key={item} className={style.metricCard}>
                    <span>{translate(`gateway.quota.${item}.label`)}</span>
                    <strong>{translate(`gateway.quota.${item}.value`)}</strong>
                    <small>{translate(`gateway.quota.${item}.caption`)}</small>
                </article>
            ))}
        </section>

        {isLoading ? <div className={style.feedback}>{translate('common.loading')}</div> : null}
        {errorMessage ? (
            <div className={style.feedback} role="alert">
                <span>{errorMessage}</span>
                <button type="button" onClick={onRefetch}>
                    {translate('common.retry')}
                </button>
            </div>
        ) : null}
        {data?.list.length === 0 ? <div className={style.feedback}>{translate('gateway.keys.empty')}</div> : null}
        {data && data.list.length > 0 ? (
            <div className={style.tableWrap}>
                <table aria-label={translate('gateway.keys.table')}>
                    <thead>
                        <tr>
                            {['name', 'key', 'created', 'expires', 'revoked', 'status', 'actions'].map((column) => (
                                <th key={column}>{translate(`gateway.keys.columns.${column}`)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.list.map((token) => (
                            <tr key={token.credentialId}>
                                <td className={style.strongCell}>{token.name}</td>
                                <td>
                                    <code>{token.keyPrefix}••••••••</code>
                                </td>
                                <td>{formatDateTime(token.createdAt, language, translate('common.notAvailable'))}</td>
                                <td>{formatDateTime(token.expiresAt, language, translate('common.notAvailable'))}</td>
                                <td>{formatDateTime(token.revokedAt, language, translate('common.notAvailable'))}</td>
                                <td>
                                    <span className={classNames(style.status, token.status === 'ACTIVE' ? style.statusActive : token.status === 'EXPIRED' ? style.statusWarning : style.statusQuiet)}>
                                        {translate(TOKEN_STATUS_KEY[token.status])}
                                    </span>
                                </td>
                                <td>
                                    {token.status === 'ACTIVE' ? (
                                        <button
                                            type="button"
                                            className={style.dangerButton}
                                            disabled={revokingId === token.credentialId}
                                            aria-label={translate('gateway.keys.revokeLabel', { name: token.name })}
                                            onClick={() => onRevoke(token.credentialId)}
                                        >
                                            {translate('gateway.keys.revoke')}
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : null}
    </>
);

export default GatewayTokenPanel;
