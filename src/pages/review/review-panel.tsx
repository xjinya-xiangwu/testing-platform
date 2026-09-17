import { useEffect, useRef, useState } from 'react';
import useDialogFocus from '@/hooks/useDialogFocus';
import useTranslate from '@/hooks/useTranslate';
import { exportReportElementAsPdf } from '@/pages/review/export-report-pdf';
import ReportMarkdownContent from '@/pages/review/report-markdown-content';
import ReviewTicketReportAction from '@/pages/review/review-ticket-report-action';
import { useConfirmation, useJobConfirmation, useReviewAction, useSettledConfirmation } from '@/pages/workbench/hooks/use-job-detail';
import style from '@/pages/review/review-panel.module.less';
import type { IReportContent, IReviewReport, IReviewTicket, JobReviewDataView } from '@/api/review';

type ReviewDialog = 'detail' | 'report' | 'revision' | null;
type ReviewSummaryTab = 'pending' | 'settled';

interface ReviewPanelProps {
    initialReportJobId?: string | null;
    jobId?: string | null;
    jobView?: JobReviewDataView;
    onInitialReportClose?: () => void;
    reportOnly?: boolean;
}

const REPORT_VERDICT_KEYS: Readonly<Record<string, string>> = {
    pass: 'confirm.report.verdict.pass',
    passed: 'confirm.report.verdict.pass',
    partial: 'confirm.report.verdict.partial',
    failed: 'confirm.report.verdict.failed',
    fail: 'confirm.report.verdict.failed',
    approved: 'confirm.report.verdict.archived',
    overridden: 'confirm.report.verdict.archived',
};

const getPdfFileName = (fileName: string) => {
    const stem = fileName
        .replace(/\.(?:md|markdown|pdf)$/i, '')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .trim();
    return `${stem || 'report'}.pdf`;
};

const mergeTicketsByJobId = (...groups: readonly (readonly IReviewTicket[])[]) =>
    groups.flatMap((group) => group).filter((ticket, index, tickets) => tickets.findIndex((candidate) => candidate.jobId === ticket.jobId) === index);

const mergeResolvedTicket = (ticket: IReviewTicket, updated: IReviewTicket, fallbackScore?: number): IReviewTicket => ({
    ...ticket,
    ...updated,
    id: ticket.id,
    jobId: ticket.jobId,
    advice: updated.advice || ticket.advice,
    confidence: updated.confidence || ticket.confidence,
    dispute: updated.dispute || ticket.dispute,
    evidence: updated.evidence || ticket.evidence,
    milestones: updated.milestones.length > 0 ? updated.milestones : ticket.milestones,
    scene: updated.scene || ticket.scene,
    score: fallbackScore ?? (updated.score > 0 ? updated.score : ticket.score),
    sha: updated.sha || ticket.sha,
    taskType: updated.taskType || ticket.taskType,
});

const ReviewPanel = ({ initialReportJobId, jobId = null, jobView = 'finished', onInitialReportClose, reportOnly = false }: ReviewPanelProps) => {
    const translate = useTranslate();
    const queryJobId = jobId ?? (reportOnly ? (initialReportJobId ?? null) : null);
    const [activeSummaryTab, setActiveSummaryTab] = useState<ReviewSummaryTab>('pending');
    const aggregateConfirmation = useConfirmation(!queryJobId);
    const jobConfirmation = useJobConfirmation(queryJobId, Boolean(queryJobId), false, reportOnly ? 'reported' : jobView);
    const settledConfirmation = useSettledConfirmation(!jobId && activeSummaryTab === 'settled');
    const confirmation = queryJobId ? jobConfirmation : aggregateConfirmation;
    const reviewAction = useReviewAction(jobId, jobView);
    const [activeDialog, setActiveDialog] = useState<ReviewDialog>(null);
    const [activeReport, setActiveReport] = useState<IReviewReport | null>(null);
    const [activeTicket, setActiveTicket] = useState<IReviewTicket | null>(null);
    const [note, setNote] = useState('');
    const [score, setScore] = useState('86');
    const [isExportingActiveReport, setIsExportingActiveReport] = useState(false);
    const [hasActiveReportExportError, setHasActiveReportExportError] = useState(false);
    const [loadedReportContent, setLoadedReportContent] = useState<IReportContent | null>(null);
    const [openedInitialReportJobId, setOpenedInitialReportJobId] = useState<string | null>(null);
    const [recentlySettledTickets, setRecentlySettledTickets] = useState<readonly IReviewTicket[]>([]);
    const reportBodyRef = useRef<HTMLDivElement>(null);
    const closeActiveDialog = () => {
        if (reportOnly) {
            onInitialReportClose?.();
            return;
        }
        const isInitialReport =
            activeDialog === 'report' && Boolean(initialReportJobId) && Boolean(activeReport) && (activeReport?.jobId === initialReportJobId || activeReport?.reportNo === initialReportJobId);
        setActiveDialog(null);
        if (isInitialReport) onInitialReportClose?.();
    };
    const activeDialogRef = useDialogFocus<HTMLDivElement>(Boolean(activeDialog) || (reportOnly && Boolean(initialReportJobId)), closeActiveDialog);

    useEffect(() => {
        if (reportOnly || !initialReportJobId || openedInitialReportJobId === initialReportJobId || !confirmation.data) return;
        const report = confirmation.data.reports.find((item) => item.jobId === initialReportJobId || item.reportNo === initialReportJobId);
        if (!report) return;
        setLoadedReportContent(null);
        setHasActiveReportExportError(false);
        setActiveReport(report);
        setActiveDialog('report');
        setOpenedInitialReportJobId(initialReportJobId);
    }, [confirmation.data, initialReportJobId, openedInitialReportJobId, reportOnly]);

    if (confirmation.isLoading) return <div className={style.feedback}>{translate('common.loading')}</div>;
    if (confirmation.error || !confirmation.data) return <div className={style.feedback}>{translate('common.error')}</div>;

    const { pendingCount, reports, tickets } = confirmation.data;
    const recentlySettledIds = new Set(recentlySettledTickets.map((ticket) => ticket.id));
    const pendingTickets = tickets.filter((ticket) => ticket.status === 'pending' && !recentlySettledIds.has(ticket.id));
    const settledTickets = jobId ? tickets.filter((ticket) => ticket.status !== 'pending') : mergeTicketsByJobId(settledConfirmation.data?.tickets ?? [], recentlySettledTickets);
    const visibleTickets = jobId ? tickets : activeSummaryTab === 'pending' ? pendingTickets : settledTickets;
    const displayPendingCount = jobId ? pendingCount : pendingTickets.length;
    const revisedScore = Number(score);
    const canSubmitRevision = Number.isFinite(revisedScore) && revisedScore >= 0 && revisedScore <= 100 && note.trim().length > 0;

    const getTaskTypeLabel = (taskType: string) => translate(taskType === 'RANGE' ? 'tasks.type.rangeShort' : 'tasks.type.evaluationShort');
    const getReportVerdict = (verdict: string) => {
        const key = REPORT_VERDICT_KEYS[verdict.trim().toLowerCase()];
        return key ? translate(key) : verdict || translate('confirm.report.verdict.archived');
    };
    const getTicketStatusClass = (ticket: IReviewTicket, isPending: boolean) => {
        if (ticket.status === 'rejected') return style.rejectedBadge;
        return isPending ? style.pendingBadge : style.doneBadge;
    };
    const openDetail = (ticket: IReviewTicket) => {
        setActiveTicket(ticket);
        setActiveDialog('detail');
    };

    const openRevision = (ticket: IReviewTicket) => {
        setActiveTicket(ticket);
        setScore(String(Math.max(0, ticket.score - 2.5)));
        setNote('');
        setActiveDialog('revision');
    };

    const submitRevision = async () => {
        if (!activeTicket || !canSubmitRevision) return;
        try {
            const updatedTicket = await reviewAction.mutateAsync({ action: 'revise', note: note.trim(), score: revisedScore, ticketId: activeTicket.id });
            if (!jobId) {
                const resolvedTicket = mergeResolvedTicket(activeTicket, updatedTicket, revisedScore);
                setRecentlySettledTickets((value) => mergeTicketsByJobId([resolvedTicket], value));
                setActiveSummaryTab('settled');
            }
            setActiveDialog(null);
        } catch {
            // React Query owns the visible error state.
        }
    };

    const submitTicketAction = async (ticket: IReviewTicket, action: 'confirm' | 'reject') => {
        try {
            const updatedTicket = await reviewAction.mutateAsync({ action, ticketId: ticket.id });
            if (!jobId) {
                const resolvedTicket = mergeResolvedTicket(ticket, updatedTicket);
                setRecentlySettledTickets((value) => mergeTicketsByJobId([resolvedTicket], value));
                setActiveSummaryTab('settled');
            }
        } catch {
            // React Query owns the visible error state.
        }
    };

    const exportActiveReport = async (report: IReviewReport) => {
        if (!loadedReportContent || isExportingActiveReport) return;
        setIsExportingActiveReport(true);
        setHasActiveReportExportError(false);
        try {
            if (loadedReportContent.contentType === 'pdf' && loadedReportContent.downloadUrl) {
                const link = document.createElement('a');
                link.href = loadedReportContent.downloadUrl;
                link.download = loadedReportContent.fileName;
                link.rel = 'noopener noreferrer';
                link.click();
                return;
            }

            if (!reportBodyRef.current) throw new Error('Report content is unavailable');
            await exportReportElementAsPdf({
                element: reportBodyRef.current,
                fileName: getPdfFileName(loadedReportContent.fileName || report.reportNo),
            });
        } catch {
            setHasActiveReportExportError(true);
        } finally {
            setIsExportingActiveReport(false);
        }
    };

    const renderReportDialog = (report?: IReviewReport | null) => {
        const description = report
            ? translate('confirm.report.description', { report: report.reportNo, title: report.title })
            : translate('confirm.report.requestDescription', { job: initialReportJobId ?? '' });
        const reportContent = report ? (
            <>
                <div className={style.reportSummary}>
                    <span>{getReportVerdict(report.verdict)}</span>
                    <strong>{translate('confirm.report.totalScore', { score: report.score })}</strong>
                </div>
                <ReportMarkdownContent onContentChange={setLoadedReportContent} reportId={report.reportNo} translate={translate} />
            </>
        ) : (
            <div className={style.reportUnavailable}>
                <h3>{translate('confirm.report.unavailableTitle')}</h3>
                <p>{translate('confirm.report.unavailableDescription')}</p>
            </div>
        );

        return (
            <div className={style.subdialogBackdrop}>
                <div ref={activeDialogRef} role="dialog" aria-modal="true" aria-labelledby="evaluation-report-title" className={`${style.dialog} ${style.reportDialog}`} tabIndex={-1}>
                    <header className={style.dialogHeader}>
                        <div>
                            <h2 id="evaluation-report-title">{translate('confirm.dialogs.report')}</h2>
                            <p>{description}</p>
                        </div>
                        <button type="button" className={style.dialogClose} aria-label={translate('common.close')} onClick={closeActiveDialog}>
                            ×
                        </button>
                    </header>
                    <div className={style.reportBody}>
                        <div ref={reportBodyRef} className={style.reportExportContent} data-report-pdf-root="true">
                            {reportContent}
                        </div>
                    </div>
                    <footer className={style.dialogFooter}>
                        <button type="button" onClick={closeActiveDialog}>
                            {translate('common.close')}
                        </button>
                        {hasActiveReportExportError ? (
                            <span className={style.reportExportError} role="alert">
                                {translate('confirm.report.exportError')}
                            </span>
                        ) : null}
                        {report ? (
                            <button type="button" className={style.primaryButton} disabled={!loadedReportContent || isExportingActiveReport} onClick={() => void exportActiveReport(report)}>
                                {translate(isExportingActiveReport ? 'confirm.actions.exportingPdf' : 'confirm.actions.exportPdf')}
                            </button>
                        ) : null}
                    </footer>
                </div>
            </div>
        );
    };

    if (reportOnly && initialReportJobId) {
        const requestedReport = reports.find((report) => report.jobId === initialReportJobId || report.reportNo === initialReportJobId);
        return renderReportDialog(requestedReport);
    }

    const openReport = (report: IReviewReport) => {
        setLoadedReportContent(null);
        setHasActiveReportExportError(false);
        setActiveReport(report);
        setActiveDialog('report');
    };

    const renderTicket = (ticket: IReviewTicket, isPending: boolean) => (
        <li key={ticket.id} className={style.ticket}>
            <div className={style.ticketHead}>
                <span>{ticket.id}</span>
                <strong>{ticket.scene || ticket.jobId}</strong>
                <em>{getTaskTypeLabel(ticket.taskType)}</em>
                <b>{ticket.score.toFixed(1)}</b>
            </div>
            <p>
                <span>{translate('confirm.ticket.advice')}</span>
                {ticket.advice || translate('confirm.ticket.noAdvice')}
            </p>
            <small>
                <span>{translate('confirm.ticket.evidence')}</span>
                {ticket.evidence || translate('confirm.ticket.noEvidence')}
            </small>
            <footer>
                <button type="button" onClick={() => openDetail(ticket)}>
                    {translate('tasks.actions.detailsShort')}
                </button>
                {isPending ? (
                    <button type="button" className={style.primaryButton} disabled={reviewAction.isPending} onClick={() => void submitTicketAction(ticket, 'confirm')}>
                        {translate('confirm.actions.confirmFinal')}
                    </button>
                ) : null}
                {isPending ? (
                    <>
                        <button type="button" disabled={reviewAction.isPending} onClick={() => openRevision(ticket)}>
                            {translate('confirm.actions.submitRevision')}
                        </button>
                        <button type="button" className={style.ghostButton} disabled={reviewAction.isPending} onClick={() => void submitTicketAction(ticket, 'reject')}>
                            {translate('confirm.actions.rejectFinal')}
                        </button>
                    </>
                ) : null}
                {!jobId ? <span className={getTicketStatusClass(ticket, isPending)}>{translate(`confirm.status.${ticket.status}`)}</span> : null}
                {!isPending ? <ReviewTicketReportAction ticket={ticket} translate={translate} onOpenReport={openReport} /> : null}
            </footer>
        </li>
    );

    return (
        <section className={style.reviewPanel} role="region" aria-label={translate('confirm.title')}>
            {jobId ? (
                <div className={style.singleReviewStatus}>
                    <span>{translate('confirm.single.reviewStatus')}</span>
                    {tickets[0] ? (
                        <strong className={getTicketStatusClass(tickets[0], tickets[0].status === 'pending')}>{translate(`confirm.status.${tickets[0].status}`)}</strong>
                    ) : (
                        <strong>-</strong>
                    )}
                </div>
            ) : (
                <div className={style.reviewSummary} role="tablist" aria-label={translate('confirm.summary.tabs')}>
                    <button type="button" role="tab" aria-selected={activeSummaryTab === 'pending'} onClick={() => setActiveSummaryTab('pending')}>
                        {translate('confirm.summary.pending', { count: displayPendingCount })}
                    </button>
                    <button type="button" role="tab" aria-selected={activeSummaryTab === 'settled'} onClick={() => setActiveSummaryTab('settled')}>
                        {settledConfirmation.data ? translate('confirm.summary.done', { count: settledTickets.length }) : translate('confirm.summary.doneTab')}
                    </button>
                </div>
            )}

            <ul className={style.tickets}>
                {!jobId && activeSummaryTab === 'settled' && settledConfirmation.isLoading && visibleTickets.length === 0 ? (
                    <li className={style.emptyReview}>{translate('common.loading')}</li>
                ) : !jobId && activeSummaryTab === 'settled' && settledConfirmation.error && visibleTickets.length === 0 ? (
                    <li className={style.emptyReview}>{translate('common.error')}</li>
                ) : visibleTickets.length > 0 ? (
                    visibleTickets.map((ticket) => renderTicket(ticket, ticket.status === 'pending'))
                ) : (
                    <li className={style.emptyReview}>{translate(activeSummaryTab === 'settled' ? 'confirm.summary.noDone' : 'confirm.noPending')}</li>
                )}
            </ul>

            {reviewAction.error ? <p role="alert">{translate('confirm.errors.action')}</p> : null}

            {activeDialog === 'revision' && activeTicket ? (
                <div className={style.subdialogBackdrop}>
                    <div ref={activeDialogRef} role="dialog" aria-modal="true" aria-label={translate('confirm.dialogs.revision')} className={style.dialog} tabIndex={-1}>
                        <header className={style.dialogHeader}>
                            <h2>{translate('confirm.dialogs.revision')}</h2>
                        </header>
                        <div className={style.dialogBody}>
                            <label>
                                <span>{translate('confirm.fields.revisedScore')}</span>
                                <input type="number" min={0} max={100} step={0.5} value={score} onChange={(event) => setScore(event.target.value)} />
                            </label>
                            <label>
                                <span>{translate('confirm.fields.revisionNote')}</span>
                                <textarea value={note} onChange={(event) => setNote(event.target.value)} />
                            </label>
                        </div>
                        <footer className={style.dialogFooter}>
                            <button type="button" onClick={() => setActiveDialog(null)}>
                                {translate('common.cancel')}
                            </button>
                            <button type="button" className={style.primaryButton} disabled={!canSubmitRevision || reviewAction.isPending} onClick={submitRevision}>
                                {translate('confirm.actions.submitRevisionConfirm')}
                            </button>
                        </footer>
                    </div>
                </div>
            ) : null}

            {activeDialog === 'detail' && activeTicket ? (
                <div className={style.subdialogBackdrop}>
                    <div ref={activeDialogRef} role="dialog" aria-modal="true" aria-label={translate('confirm.dialogs.detail')} className={style.dialog} tabIndex={-1}>
                        <header className={style.dialogHeader}>
                            <h2>{translate('confirm.dialogs.detail')}</h2>
                            <button type="button" className={style.dialogClose} aria-label={translate('common.close')} onClick={closeActiveDialog}>
                                ×
                            </button>
                        </header>
                        <div className={style.dialogBody}>
                            <dl className={style.detailList}>
                                <dt>{translate('confirm.details.evidence')}</dt>
                                <dd>{activeTicket.evidence}</dd>
                                <dt>{translate('confirm.details.shaVerified')}</dt>
                                <dd>{activeTicket.sha}</dd>
                                <dt>{translate('confirm.details.dispute')}</dt>
                                <dd>{activeTicket.dispute}</dd>
                                <dt>{translate('confirm.details.replay')}</dt>
                                <dd>{activeTicket.milestones.join(' / ')}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            ) : null}

            {activeDialog === 'report' && activeReport ? renderReportDialog(activeReport) : null}
        </section>
    );
};

export default ReviewPanel;
