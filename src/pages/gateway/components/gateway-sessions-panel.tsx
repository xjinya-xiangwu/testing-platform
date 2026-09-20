import { useState } from 'react';
import classNames from 'classnames';
import GatewaySessionDialog from '@/pages/gateway/components/gateway-session-dialog';
import { GATEWAY_SESSION_RESULTS, type GatewaySessionResult, type IGatewaySession } from '@/features/gateway/domain/gateway-session';
import { useGatewaySessions } from '@/hooks/useGatewaySessions';
import type { IGatewayProvider } from '@/features/gateway/domain/gateway-provider';
import style from '@/pages/gateway/gateway.module.less';

interface GatewaySessionsPanelProps {
    language: string;
    providers: readonly IGatewayProvider[];
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const resultChip = (result: IGatewaySession['result']) => (result === 'completed' || result === 'verified' ? { className: style.statusActive } : { className: style.statusFailed });

const GatewaySessionsPanel = ({ language, providers, translate }: GatewaySessionsPanelProps) => {
    const [providerId, setProviderId] = useState<string | null>(null);
    const [result, setResult] = useState<GatewaySessionResult | 'all'>('all');
    const [selectedSession, setSelectedSession] = useState<IGatewaySession | null>(null);
    const sessionsQuery = useGatewaySessions({ providerId, result });
    const sessions = sessionsQuery.data?.list ?? [];
    const formatDateTime = (value: string) => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

    return (
        <>
            <div className={style.filterBar}>
                <label>
                    <span>{translate('gateway.sessions.filter.provider')}</span>
                    <select
                        value={providerId ?? ''}
                        onChange={(event) => {
                            setProviderId(event.target.value || null);
                            setSelectedSession(null);
                        }}
                    >
                        <option value="">{translate('gateway.sessions.filter.allProviders')}</option>
                        {providers.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                                {provider.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>{translate('gateway.sessions.filter.result')}</span>
                    <select
                        value={result}
                        onChange={(event) => {
                            setResult(event.target.value as GatewaySessionResult | 'all');
                            setSelectedSession(null);
                        }}
                    >
                        {GATEWAY_SESSION_RESULTS.map((option) => (
                            <option key={option} value={option}>
                                {option === 'all' ? translate('gateway.sessions.filter.allResults') : translate(`gateway.sessions.results.${option}`)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {sessionsQuery.isLoading ? <div className={style.feedback}>{translate('common.loading')}</div> : null}
            {sessionsQuery.isError ? (
                <div className={style.feedback} role="alert">
                    <span>{translate('common.error')}</span>
                    <button type="button" onClick={() => void sessionsQuery.refetch()}>
                        {translate('common.retry')}
                    </button>
                </div>
            ) : null}
            {!sessionsQuery.isLoading && !sessionsQuery.isError && sessions.length === 0 ? <div className={style.feedback}>{translate('gateway.sessions.empty')}</div> : null}
            {sessions.length > 0 ? (
                <div className={style.tableWrap}>
                    <table aria-label={translate('gateway.sessions.title')}>
                        <thead>
                            <tr>
                                {['id', 'agent', 'time', 'task', 'result', 'turns', 'actions'].map((column) => (
                                    <th key={column}>{translate(`gateway.sessions.columns.${column}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session) => {
                                const chip = resultChip(session.result);
                                return (
                                    <tr key={session.id}>
                                        <td>
                                            <code>{session.id}</code>
                                        </td>
                                        <td className={style.strongCell}>{session.providerName}</td>
                                        <td>{formatDateTime(session.startedAt)}</td>
                                        <td>{session.taskName}</td>
                                        <td>
                                            <span className={classNames(style.status, chip.className)}>{session.resultSummary}</span>
                                        </td>
                                        <td>{session.turns}</td>
                                        <td>
                                            <button type="button" className={style.secondaryButton} onClick={() => setSelectedSession(session)}>
                                                {translate('gateway.sessions.detail')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : null}
            {selectedSession ? <GatewaySessionDialog language={language} session={selectedSession} translate={translate} onClose={() => setSelectedSession(null)} /> : null}
        </>
    );
};

export default GatewaySessionsPanel;
