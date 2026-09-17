import { Link } from 'react-router-dom';
import { useJobReportState } from '@/pages/workbench/hooks/use-job-detail';
import style from '@/pages/tasks/task-list.module.less';
import type { ICompletedTask } from '@/api/tasks';

interface TaskReportActionProps {
    task: ICompletedTask;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const TaskReportAction = ({ task, translate }: TaskReportActionProps) => {
    const report = useJobReportState({ jobId: task.jobId, reportId: task.reportId, reportStatus: task.reportStatus });

    if (task.reviewStatus === 'PENDING') {
        return (
            <Link className={style.reportAction} to={`/confirm?job=${encodeURIComponent(task.jobId)}&mode=review`} aria-label={translate('tasks.actions.reviewLabel', { job: task.jobId })}>
                {translate('tasks.actions.review')}
            </Link>
        );
    }

    if (task.reviewStatus === 'REJECTED' || task.reviewStatus === 'UNKNOWN') {
        return (
            <Link className={style.reportAction} to={`/confirm?job=${encodeURIComponent(task.jobId)}&mode=result`} aria-label={translate('tasks.actions.resultLabel', { job: task.jobId })}>
                {translate('tasks.actions.result')}
            </Link>
        );
    }

    if (report.isReportReady) {
        return (
            <Link className={style.reportAction} to={`/confirm?job=${encodeURIComponent(task.jobId)}`} aria-label={translate('tasks.actions.reportLabel', { job: task.jobId })}>
                {translate('tasks.actions.report')}
            </Link>
        );
    }

    return (
        <>
            <button
                type="button"
                className={style.reportAction}
                disabled={report.isGenerating}
                aria-label={translate(report.isGenerating ? 'tasks.actions.generatingReportLabel' : 'tasks.actions.generateReportLabel', { job: task.jobId })}
                onClick={report.generate}
            >
                {translate(report.isGenerating ? 'tasks.actions.generatingReport' : 'tasks.actions.generateReport')}
            </button>
            {report.isError ? (
                <span className={style.actionError} role="alert">
                    {translate('tasks.actions.reportGenerateError')}
                </span>
            ) : null}
        </>
    );
};

export default TaskReportAction;
