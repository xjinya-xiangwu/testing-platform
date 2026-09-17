import { useJobReportState } from '@/pages/workbench/hooks/use-job-detail';
import style from '@/pages/review/review-panel.module.less';
import type { IReviewReport, IReviewTicket } from '@/api/review';

interface ReviewTicketReportActionProps {
    onOpenReport: (report: IReviewReport) => void;
    ticket: IReviewTicket;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const createReportSummary = (ticket: IReviewTicket, reportId: string): IReviewReport => ({
    reportNo: reportId,
    jobId: ticket.jobId,
    title: ticket.scene || ticket.jobId,
    category: ticket.taskType === 'RANGE' ? 'range' : 'evaluation',
    verdict: 'approved',
    score: ticket.score,
    elapsed: '',
    completedAt: ticket.sealedAt,
});

const ReviewTicketReportAction = ({ onOpenReport, ticket, translate }: ReviewTicketReportActionProps) => {
    const reportState = useJobReportState({ jobId: ticket.jobId, reportId: ticket.reportId, reportStatus: ticket.reportStatus });

    if (ticket.status === 'pending' || ticket.status === 'rejected') return null;

    if (reportState.isReportReady && reportState.reportId) {
        const report = reportState.report ?? createReportSummary(ticket, reportState.reportId);
        return (
            <button type="button" className={style.primaryButton} onClick={() => onOpenReport(report)}>
                {translate('confirm.actions.viewReport')}
            </button>
        );
    }

    return (
        <>
            <button type="button" className={style.primaryButton} disabled={reportState.isGenerating} onClick={reportState.generate}>
                {translate(reportState.isGenerating ? 'confirm.actions.generating' : 'confirm.actions.generate')}
            </button>
            {reportState.isError ? (
                <span className={style.actionError} role="alert">
                    {translate('tasks.actions.reportGenerateError')}
                </span>
            ) : null}
        </>
    );
};

export default ReviewTicketReportAction;
