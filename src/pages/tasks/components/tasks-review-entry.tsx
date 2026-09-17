import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useDialogFocus from '@/hooks/useDialogFocus';
import useTranslate from '@/hooks/useTranslate';
import ReviewPanel from '@/pages/review/review-panel';
import { usePendingReviewSummary } from '@/pages/workbench/hooks/use-job-detail';
import listStyle from '@/pages/tasks/task-list.module.less';
import taskStyle from '@/pages/tasks/tasks.module.less';

const TasksReviewEntry = () => {
    const translate = useTranslate();
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(search);
    const requestedJobId = searchParams.get('job');
    const requestMode = searchParams.get('mode');
    const isSingleResultRequest = pathname === '/confirm' && Boolean(requestedJobId) && (requestMode === 'result' || requestMode === 'review');
    const isReportRequest = pathname === '/confirm' && Boolean(requestedJobId) && !isSingleResultRequest;
    const isTaskPage = pathname === '/tasks';
    const pendingReview = usePendingReviewSummary(isTaskPage);
    const [isOpen, setIsOpen] = useState(pathname === '/confirm' && !isReportRequest);
    const dismissDialog = () => {
        setIsOpen(false);
        if (pathname === '/confirm') navigate('/tasks', { replace: true });
        return true;
    };
    const requestDialogClose = () => {
        const focusedDialog = document.activeElement instanceof HTMLElement ? document.activeElement.closest('[role="dialog"]') : null;
        if (focusedDialog && focusedDialog !== dialogRef.current) return false;
        return dismissDialog();
    };
    const isResultDialogOpen = isOpen || isSingleResultRequest;
    const dialogRef = useDialogFocus<HTMLElement>(isResultDialogOpen, requestDialogClose);

    useEffect(() => {
        setIsOpen(pathname === '/confirm' && !isReportRequest && !isSingleResultRequest);
    }, [isReportRequest, isSingleResultRequest, pathname]);

    const renderReviewEntry = () => {
        if (!isTaskPage) return null;
        if (pendingReview.isLoading) return <div className={listStyle.reviewEntry}>{translate('common.loading')}</div>;
        if (pendingReview.error || !pendingReview.data) return <div className={listStyle.reviewEntry}>{translate('common.error')}</div>;
        const pendingCount = pendingReview.data.count;
        const pendingCountLabel = pendingReview.data.hasMore ? `${pendingCount}+` : pendingCount;
        const messageKey = pendingCount > 0 ? 'tasks.review.pending' : 'tasks.review.ready';
        const actionKey = pendingCount > 0 ? 'tasks.review.actionPending' : 'tasks.review.actionReady';
        return (
            <section className={listStyle.reviewEntry} role="region" aria-label={translate('tasks.review.entryLabel')}>
                <p>{translate(messageKey, { count: pendingCountLabel })}</p>
                <button type="button" onClick={() => setIsOpen(true)}>
                    {translate(actionKey)}
                </button>
            </section>
        );
    };

    const dialogTitleKey = isSingleResultRequest ? 'confirm.single.title' : 'confirm.title';
    const dialogDescriptionKey = isSingleResultRequest ? 'confirm.single.description' : 'tasks.review.dialogDescription';

    return (
        <>
            {renderReviewEntry()}

            {isReportRequest ? <ReviewPanel reportOnly initialReportJobId={requestedJobId} onInitialReportClose={dismissDialog} /> : null}

            {isResultDialogOpen && !isReportRequest ? (
                <div className={`${taskStyle.dialogBackdrop} ${listStyle.reviewDialogBackdrop}`}>
                    <section ref={dialogRef} className={listStyle.reviewDialog} role="dialog" aria-modal="true" aria-labelledby="tasks-review-dialog-title" tabIndex={-1}>
                        <header className={listStyle.reviewDialogHeader}>
                            <div>
                                <h2 id="tasks-review-dialog-title">{translate(dialogTitleKey)}</h2>
                                <p>{translate(dialogDescriptionKey)}</p>
                            </div>
                            <button type="button" aria-label={translate('common.close')} onClick={requestDialogClose}>
                                ×
                            </button>
                        </header>
                        <div className={listStyle.reviewDialogBody}>
                            <ReviewPanel jobId={isSingleResultRequest ? requestedJobId : null} jobView={requestMode === 'review' ? 'pending_review' : 'finished'} />
                        </div>
                        <footer className={listStyle.reviewDialogFooter}>
                            <button type="button" onClick={requestDialogClose}>
                                {translate('common.close')}
                            </button>
                        </footer>
                    </section>
                </div>
            ) : null}
        </>
    );
};

export default TasksReviewEntry;
