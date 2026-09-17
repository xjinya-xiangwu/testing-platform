import useDialogFocus from '@/hooks/useDialogFocus';
import type { IGatewaySession } from '@/pages/gateway/gateway-mock';
import style from '@/pages/gateway/gateway.module.less';

interface GatewaySessionDialogProps {
    language: string;
    onClose: () => void;
    session: IGatewaySession;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const GatewaySessionDialog = ({ language, onClose, session, translate }: GatewaySessionDialogProps) => {
    const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
    const time = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.time));

    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.dialog} role="dialog" aria-modal="true" aria-labelledby="gateway-session-title" tabIndex={-1}>
                <header className={style.dialogHeader}>
                    <div>
                        <h2 id="gateway-session-title">{translate('gateway.sessions.dialog.title')}</h2>
                        <p>
                            {session.id} · {translate(session.agentKey)}
                        </p>
                    </div>
                    <button type="button" aria-label={translate('common.close')} onClick={onClose}>
                        ×
                    </button>
                </header>
                <dl className={style.detailList}>
                    <div>
                        <dt>{translate('gateway.sessions.columns.time')}</dt>
                        <dd>{time}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.columns.task')}</dt>
                        <dd>{translate(session.taskKey)}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.columns.result')}</dt>
                        <dd>{translate(session.resultKey)}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.turns')}</dt>
                        <dd>{session.turns}</dd>
                    </div>
                </dl>
                <h3>{translate('gateway.sessions.summary')}</h3>
                <pre>{translate('gateway.sessions.summaryValue', { time, turns: session.turns, result: translate(session.resultKey) })}</pre>
                <footer className={style.dialogFooter}>
                    <button type="button" className={style.secondaryButton} onClick={onClose}>
                        {translate('common.close')}
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default GatewaySessionDialog;
