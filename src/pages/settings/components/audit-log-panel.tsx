import { useRef } from 'react';
import classNames from 'classnames';
import type { AuditLogResult, IAuditLog } from '@/api/audit-logs';
import useTranslate from '@/hooks/useTranslate';
import { useAuditLogs } from '@/pages/settings/hooks/use-audit-logs';
import style from '@/pages/settings/settings.module.less';

const AUDIT_RESULT_KEY: Readonly<Record<AuditLogResult, string>> = {
    success: 'settings.activity.result.success',
    failure: 'settings.activity.result.failure',
};

const AUDIT_RESULT_CLASS: Readonly<Record<AuditLogResult, string>> = {
    success: style.statusActive,
    failure: style.statusFailure,
};

const formatDateTime = (value: string, language: string) =>
    new Intl.DateTimeFormat(language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(new Date(value));

interface AuditLogTableProps {
    language: string;
    logs: readonly IAuditLog[];
    translate: ReturnType<typeof useTranslate>;
}

const AuditLogTable = ({ language, logs, translate }: AuditLogTableProps) => (
    <table>
        <thead>
            <tr>
                <th>{translate('settings.activity.columns.time')}</th>
                <th>{translate('settings.activity.columns.summary')}</th>
                <th>{translate('settings.activity.columns.result')}</th>
            </tr>
        </thead>
        <tbody>
            {logs.map((log) => (
                <tr key={log.id}>
                    <td>
                        <time dateTime={log.createdAt}>{formatDateTime(log.createdAt, language)}</time>
                    </td>
                    <td>{log.summary}</td>
                    <td>
                        <span className={classNames(style.status, AUDIT_RESULT_CLASS[log.result])}>{translate(AUDIT_RESULT_KEY[log.result])}</span>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);

interface AuditLogPanelProps {
    language: string;
}

const AuditLogPanel = ({ language }: AuditLogPanelProps) => {
    const translate = useTranslate();
    const scrollTargetRef = useRef<HTMLDivElement>(null);
    const auditLogQuery = useAuditLogs(language, scrollTargetRef);
    const logs = auditLogQuery.data?.list ?? [];
    const isInitialLoading = auditLogQuery.loading && logs.length === 0;
    const hasInitialError = Boolean(auditLogQuery.error && logs.length === 0);
    const hasLoadMoreError = Boolean(auditLogQuery.error && logs.length > 0);

    return (
        <section className={classNames(style.card, style.activityCard)} aria-labelledby="settings-activity-title" aria-busy={auditLogQuery.loading || auditLogQuery.loadingMore}>
            <div className={style.sectionHeader}>
                <div>
                    <h2 id="settings-activity-title">{translate('settings.activity.title')}</h2>
                    <span>{translate('settings.activity.subtitle')}</span>
                </div>
                <button
                    type="button"
                    className={style.refreshButton}
                    aria-label={translate('settings.activity.refreshAria')}
                    disabled={auditLogQuery.loading || auditLogQuery.loadingMore}
                    onClick={() => void auditLogQuery.reload()}
                >
                    {auditLogQuery.loading && logs.length > 0 ? translate('settings.activity.refreshing') : translate('settings.activity.refresh')}
                </button>
            </div>

            <div
                ref={scrollTargetRef}
                className={classNames(style.tableWrap, style.auditTableWrap, style.auditScroll)}
                role="region"
                aria-label={translate('settings.activity.scrollAria')}
                data-testid="audit-log-scroll"
            >
                {isInitialLoading ? <div className={style.feedback}>{translate('common.loading')}</div> : null}
                {hasInitialError ? (
                    <div className={style.feedback} role="alert" aria-label={translate('settings.activity.error')}>
                        <span>{translate('settings.activity.error')}</span>
                        <button type="button" aria-label={translate('settings.activity.retryAria')} onClick={() => void auditLogQuery.reload()}>
                            {translate('common.retry')}
                        </button>
                    </div>
                ) : null}
                {auditLogQuery.data && logs.length === 0 && !hasInitialError ? <div className={style.feedback}>{translate('settings.activity.empty')}</div> : null}
                {logs.length > 0 ? <AuditLogTable language={language} logs={logs} translate={translate} /> : null}
                {auditLogQuery.loadingMore ? <div className={style.scrollFeedback}>{translate('settings.activity.loadingMore')}</div> : null}
                {hasLoadMoreError ? (
                    <div className={style.scrollFeedback} role="alert">
                        <span>{translate('settings.activity.loadMoreError')}</span>
                        <button type="button" aria-label={translate('settings.activity.retryLoadMoreAria')} onClick={() => void auditLogQuery.loadMore()}>
                            {translate('common.retry')}
                        </button>
                    </div>
                ) : null}
                {auditLogQuery.noMore && logs.length > 0 && !hasLoadMoreError ? <div className={style.scrollFeedback}>{translate('settings.activity.noMore')}</div> : null}
            </div>
        </section>
    );
};

export default AuditLogPanel;
