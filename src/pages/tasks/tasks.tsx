import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import TaskTable, { TaskListItem } from '@/pages/tasks/components/task-table';
import TasksReviewEntry from '@/pages/tasks/components/tasks-review-entry';
import TaskWizard from '@/pages/tasks/components/task-wizard';
import { useEnqueueTask, useTaskCenter, useTaskCreationData, useTerminateTask } from '@/pages/tasks/hooks/use-task-center';
import useDialogFocus from '@/hooks/useDialogFocus';
import { useTaskDraftStore } from '@/stores/task-draft-store';
import useTranslate from '@/hooks/useTranslate';
import listStyle from '@/pages/tasks/task-list.module.less';
import taskStyle from '@/pages/tasks/tasks.module.less';
import { TASK_LIST_PAGE_SIZE } from '@/api/tasks';
import type { ICompletedTask, ITaskDraftPayload, TaskListFilter, TaskType } from '@/api/tasks';

const FILTERS: readonly TaskListFilter[] = ['all', 'running', 'queued', 'completed'];

const Tasks = () => {
    const translate = useTranslate();
    const location = useLocation();
    const requestedTaskType = new URLSearchParams(location.search).get('type');
    const taskType: TaskType = requestedTaskType === 'range' ? 'range' : 'evaluation';
    const taskTypeLabel = requestedTaskType === 'range' ? translate('nav.rangeEvaluation') : requestedTaskType === 'code' ? translate('nav.codeEvaluation') : translate('tasks.title');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<TaskListFilter>('all');
    const taskQuery = useMemo(() => ({ filter: status, keyword: search.trim(), page, pageSize: TASK_LIST_PAGE_SIZE }), [page, search, status]);
    const { data, error, isLoading, refetch } = useTaskCenter(taskQuery);
    const enqueueTask = useEnqueueTask();
    const terminateTask = useTerminateTask();
    const isWizardOpen = useTaskDraftStore((state) => state.isOpen);
    const taskCreation = useTaskCreationData(isWizardOpen);
    const openWizard = useTaskDraftStore((state) => state.openWizard);
    const closeWizard = useTaskDraftStore((state) => state.closeWizard);
    const loadCompletedTask = useTaskDraftStore((state) => state.loadCompletedTask);
    const successDialogRef = useDialogFocus<HTMLElement>(Boolean(!isWizardOpen && enqueueTask.data), enqueueTask.reset);

    const items = useMemo<readonly TaskListItem[]>(() => {
        if (!data) return [];

        const activeItems: readonly TaskListItem[] = data.active.map((task) => ({ kind: 'active' as const, task }));
        const completedItems: readonly TaskListItem[] = data.completed.map((task) => ({ kind: 'completed' as const, task }));
        const query = search.trim().toLocaleLowerCase();
        const statusItems =
            status === 'completed' ? completedItems : status === 'all' ? [...activeItems, ...completedItems] : activeItems.filter((item) => item.kind === 'active' && item.task.status === status);

        return statusItems.filter((item) => {
            if ((requestedTaskType === 'code' || requestedTaskType === 'range') && item.task.type !== taskType) return false;
            const searchableText =
                item.kind === 'active'
                    ? `${item.task.jobId} ${translate(item.task.titleKey)} ${translate(item.task.sceneKey)} ${item.task.agent}`
                    : `${item.task.jobId} ${translate(item.task.titleKey)} ${translate(item.task.sceneKey)} ${item.task.agentKey ? translate(item.task.agentKey) : item.task.agent}`;
            return !query || searchableText.toLocaleLowerCase().includes(query);
        });
    }, [data, requestedTaskType, search, status, taskType, translate]);

    const pageCount = Math.max(1, Math.ceil((data?.page.total ?? 0) / TASK_LIST_PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);

    useEffect(() => {
        if (page > pageCount) setPage(pageCount);
    }, [page, pageCount]);

    const handleSubmit = (draft: ITaskDraftPayload) => {
        enqueueTask.mutate(draft, { onSuccess: closeWizard });
    };

    const handleRestart = (task: ICompletedTask) => {
        enqueueTask.reset();
        loadCompletedTask(task);
    };

    if (isLoading) return <div className={taskStyle.feedback}>{translate('common.loading')}</div>;
    if (error || !data) {
        return (
            <div className={taskStyle.feedback} role="alert">
                <span>{translate('common.error')}</span>
                <button type="button" onClick={() => refetch()}>
                    {translate('common.retry')}
                </button>
            </div>
        );
    }

    return (
        <main className={listStyle.tasksPage}>
            <header className={listStyle.pageHeader}>
                <div>
                    <h1>{taskTypeLabel}</h1>
                    <p>{translate('tasks.subtitle')}</p>
                </div>
                <button
                    type="button"
                    className={listStyle.primaryButton}
                    onClick={() => {
                        enqueueTask.reset();
                        openWizard(requestedTaskType === 'code' || requestedTaskType === 'range' ? taskType : undefined);
                    }}
                >
                    {translate('tasks.actions.new')}
                </button>
            </header>

            <TasksReviewEntry />

            <section className={listStyle.taskListCard} role="region" aria-label={translate('tasks.table.title')}>
                <div className={listStyle.taskToolbar}>
                    <div className={listStyle.segmented} role="group" aria-label={translate('tasks.filters.group')}>
                        {FILTERS.map((filter) => (
                            <button
                                key={filter}
                                type="button"
                                className={status === filter ? listStyle.activeSegment : undefined}
                                aria-pressed={status === filter}
                                onClick={() => {
                                    setStatus(filter);
                                    setPage(1);
                                }}
                            >
                                {translate(`tasks.filters.${filter}`)}
                            </button>
                        ))}
                    </div>
                    <label className={listStyle.searchField}>
                        <span>{translate('tasks.filters.search')}</span>
                        <input
                            type="search"
                            value={search}
                            aria-label={translate('tasks.filters.search')}
                            placeholder={translate('tasks.filters.placeholder')}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </label>
                </div>

                {items.length > 0 ? (
                    <TaskTable items={items} translate={translate} onRestart={handleRestart} onTerminate={(jobId) => terminateTask.mutate(jobId)} isTerminatePending={terminateTask.isPending} />
                ) : (
                    <p className={taskStyle.empty}>{translate('tasks.empty')}</p>
                )}

                <footer className={listStyle.tableFooter}>
                    <span>{translate('tasks.pagination.summary', { count: data.page.total, pageSize: TASK_LIST_PAGE_SIZE })}</span>
                    <nav className={listStyle.pagination} aria-label={translate('tasks.pagination.label')}>
                        {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                            <button
                                key={pageNumber}
                                type="button"
                                className={currentPage === pageNumber ? listStyle.activePage : undefined}
                                aria-current={currentPage === pageNumber ? 'page' : undefined}
                                aria-label={translate('tasks.pagination.page', { page: pageNumber })}
                                onClick={() => setPage(pageNumber)}
                            >
                                {pageNumber}
                            </button>
                        ))}
                    </nav>
                </footer>
            </section>

            {isWizardOpen && taskCreation.data ? (
                <TaskWizard
                    data={taskCreation.data}
                    isSubmitting={enqueueTask.isPending}
                    submitErrorKey={enqueueTask.isError ? 'tasks.wizard.submitError' : null}
                    translate={translate}
                    onSubmit={handleSubmit}
                />
            ) : null}

            {isWizardOpen && taskCreation.isLoading ? (
                <div className={taskStyle.dialogBackdrop}>
                    <div className={taskStyle.feedback} role="status">
                        {translate('common.loading')}
                    </div>
                </div>
            ) : null}

            {isWizardOpen && taskCreation.error ? (
                <div className={taskStyle.dialogBackdrop}>
                    <div className={taskStyle.feedback} role="alert">
                        <span>{translate('common.error')}</span>
                        <button type="button" onClick={() => taskCreation.refetch()}>
                            {translate('common.retry')}
                        </button>
                    </div>
                </div>
            ) : null}

            {!isWizardOpen && enqueueTask.data ? (
                <div className={taskStyle.dialogBackdrop}>
                    <section ref={successDialogRef} className={taskStyle.successDialog} role="dialog" aria-modal="true" aria-labelledby="task-success-title" tabIndex={-1}>
                        <span>{enqueueTask.data.jobId}</span>
                        <h2 id="task-success-title">{translate('tasks.success.title')}</h2>
                        <p>{translate('tasks.success.description')}</p>
                        <footer>
                            <button type="button" onClick={() => enqueueTask.reset()}>
                                {translate('tasks.success.back')}
                            </button>
                            <Link to={`/workbench?job=${encodeURIComponent(enqueueTask.data.jobId)}`}>{translate('tasks.success.details')}</Link>
                        </footer>
                    </section>
                </div>
            ) : null}
        </main>
    );
};

export default Tasks;
