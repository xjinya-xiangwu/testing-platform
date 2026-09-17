import { useState } from 'react';
import GatewaySessionDialog from '@/pages/gateway/components/gateway-session-dialog';
import { GATEWAY_SESSIONS, type IGatewaySession } from '@/pages/gateway/gateway-mock';
import style from '@/pages/gateway/gateway.module.less';

interface GatewaySessionsPanelProps {
    language: string;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const GatewaySessionsPanel = ({ language, translate }: GatewaySessionsPanelProps) => {
    const [selectedSession, setSelectedSession] = useState<IGatewaySession | null>(null);
    const formatDate = (value: string) => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

    return (
        <>
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
                        {GATEWAY_SESSIONS.map((session) => (
                            <tr key={session.id}>
                                <td>
                                    <code>{session.id}</code>
                                </td>
                                <td className={style.strongCell}>{translate(session.agentKey)}</td>
                                <td>{formatDate(session.time)}</td>
                                <td>{translate(session.taskKey)}</td>
                                <td>{translate(session.resultKey)}</td>
                                <td>{session.turns}</td>
                                <td>
                                    <button type="button" className={style.secondaryButton} onClick={() => setSelectedSession(session)}>
                                        {translate('gateway.sessions.detail')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedSession ? <GatewaySessionDialog language={language} session={selectedSession} translate={translate} onClose={() => setSelectedSession(null)} /> : null}
        </>
    );
};

export default GatewaySessionsPanel;
