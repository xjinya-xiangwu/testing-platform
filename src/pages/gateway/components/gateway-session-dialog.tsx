import useDialogFocus from '@/hooks/useDialogFocus';
import type { IGatewaySession } from '@/features/gateway/domain/gateway-session';
import style from '@/pages/gateway/gateway.module.less';

interface GatewaySessionDialogProps {
    language: string;
    onClose: () => void;
    session: IGatewaySession;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const compact = (value: number, language: string) => new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const currency = (value: number, language: string) => new Intl.NumberFormat(language, { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 }).format(value);

const GatewaySessionDialog = ({ language, onClose, session, translate }: GatewaySessionDialogProps) => {
    const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
    const format = (value: string) => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.dialog} role="dialog" aria-modal="true" aria-labelledby="gateway-session-title" tabIndex={-1}>
                <header className={style.dialogHeader}>
                    <div>
                        <h2 id="gateway-session-title">{translate('gateway.sessions.dialog.title')}</h2>
                        <p>
                            {session.id} · {session.providerName}
                        </p>
                    </div>
                    <button type="button" aria-label={translate('common.close')} onClick={onClose}>
                        ×
                    </button>
                </header>
                <dl className={style.detailList}>
                    <div>
                        <dt>{translate('gateway.sessions.columns.time')}</dt>
                        <dd>{format(session.startedAt)}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.finishedAt')}</dt>
                        <dd>{session.finishedAt ? format(session.finishedAt) : translate('common.notAvailable')}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.columns.task')}</dt>
                        <dd>{session.taskName}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.columns.result')}</dt>
                        <dd>{session.resultSummary}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.turns')}</dt>
                        <dd>{session.turns}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.tokens')}</dt>
                        <dd>{compact(session.tokensTotal, language)}</dd>
                    </div>
                    <div>
                        <dt>{translate('gateway.sessions.cost')}</dt>
                        <dd>{currency(session.costCny, language)}</dd>
                    </div>
                </dl>
                <h3>{translate('gateway.sessions.timeline')}</h3>
                <ol className={style.timeline}>
                    {session.steps.map((step) => (
                        <li key={step.seq}>
                            <span className={style.timelineKind}>{translate(`gateway.sessions.stepKind.${step.kind}`)}</span>
                            <span>{step.summary}</span>
                            <span className={style.timelineMeta}>
                                {format(step.at)}
                                {step.latencyMs !== null ? ` · ${step.latencyMs} ms` : ''}
                            </span>
                        </li>
                    ))}
                </ol>
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
