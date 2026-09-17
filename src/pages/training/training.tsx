import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import useTranslate from '@/hooks/useTranslate';
import TrainingTaskDetail from '@/pages/training/components/training-task-detail';
import TrainingTaskTable from '@/pages/training/components/training-task-table';
import TrainingTaskWizard from '@/pages/training/components/training-task-wizard';
import { useCreateTrainingTask, useTerminateTrainingTask, useTrainingTasks } from '@/pages/training/hooks/use-training-tasks';
import { TRAINING_PIPELINE, TRAINING_STATUSES } from '@/pages/training/training-options';
import style from '@/pages/training/training.module.less';
import { TrainingTaskApiError } from '@/api/training-tasks';
import type { ITrainingTaskDraft, TrainingStatus } from '@/api/training-tasks';

type TrainingFilter = 'all' | TrainingStatus;

const PAGE_SIZE = 10;
const FILTER_STATUS_ORDER: readonly TrainingStatus[] = [1, 0, 2, 3, 4];

const getTerminateErrorKey = (error: unknown) => {
    if (!(error instanceof TrainingTaskApiError)) return 'training.errors.terminate';
    const code = String(error.code).toUpperCase();
    if (code === 'NOT_FOUND' || code === '404') return 'training.errors.terminateNotAllowed';
    if (code === 'CONFLICT' || code === '409') return 'training.errors.terminateCompleted';
    return 'training.errors.terminate';
};

const Training = () => {
    const translate = useTranslate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState<TrainingFilter>('all');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [actionError, setActionError] = useState('');
    const query = useMemo(() => ({ page, pageSize: PAGE_SIZE, keyword, ...(status === 'all' ? {} : { status }) }), [keyword, page, status]);
    const tasksQuery = useTrainingTasks(query);
    const createTask = useCreateTrainingTask();
    const terminateTask = useTerminateTrainingTask();

    const pageCount = Math.max(1, Math.ceil((tasksQuery.data?.page.total ?? 0) / PAGE_SIZE));
    const requestedTaskId = searchParams.get('task') ?? '';
    const fallbackTask = tasksQuery.data?.list.find((task) => task.featured && task.status === 1) ?? tasksQuery.data?.list.find((task) => task.status === 1);
    const detailTaskId = requestedTaskId || (location.pathname === '/training-live' ? (fallbackTask?.id ?? '') : '');

    const handleCreate = async (draft: ITrainingTaskDraft) => {
        setActionError('');
        try {
            await createTask.mutateAsync(draft);
            setIsWizardOpen(false);
        } catch {
            setActionError(translate('training.errors.create'));
        }
    };

    const handleTerminate = async (taskId: string) => {
        setActionError('');
        try {
            await terminateTask.mutateAsync(taskId);
        } catch (error) {
            setActionError(translate(getTerminateErrorKey(error)));
        }
    };

    return (
        <main className={style.trainingPage}>
            <Link className={style.pageBack} to="/dashboard">
                {translate('training.back')}
            </Link>
            <header className={style.pageHeader}>
                <div>
                    <h1>{translate('training.title')}</h1>
                    <p>{translate('training.subtitle')}</p>
                </div>
                <button
                    type="button"
                    className={style.primaryButton}
                    onClick={() => {
                        createTask.reset();
                        setActionError('');
                        setIsWizardOpen(true);
                    }}
                >
                    {translate('training.actions.new')}
                </button>
            </header>

            <section className={style.pipelineCard} aria-labelledby="training-pipeline-title">
                <header>
                    <h2 id="training-pipeline-title">{translate('training.pipeline.title')}</h2>
                    <span>{translate('training.pipeline.caption')}</span>
                </header>
                <ol>
                    {TRAINING_PIPELINE.map((stage, index) => (
                        <li key={stage}>
                            <i>{String(index + 1).padStart(2, '0')}</i>
                            <div>
                                <strong>{translate(`training.pipeline.${stage}.title`)}</strong>
                                <span>{translate(`training.pipeline.${stage}.description`)}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            {actionError ? (
                <div className={style.actionError} role="alert">
                    <span>{actionError}</span>
                    <button type="button" aria-label={translate('common.close')} onClick={() => setActionError('')}>
                        ×
                    </button>
                </div>
            ) : null}

            <section className={style.listCard} aria-label={translate('training.table.title')}>
                <div className={style.toolbar}>
                    <div className={style.statusFilters} role="group" aria-label={translate('training.filters.status')}>
                        <button
                            type="button"
                            className={status === 'all' ? style.activeFilter : undefined}
                            aria-pressed={status === 'all'}
                            onClick={() => {
                                setStatus('all');
                                setPage(1);
                            }}
                        >
                            {translate('training.filters.all')}
                        </button>
                        {FILTER_STATUS_ORDER.map((statusValue) => {
                            const option = TRAINING_STATUSES.find((item) => item.value === statusValue);
                            if (!option) return null;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={status === option.value ? style.activeFilter : undefined}
                                    aria-pressed={status === option.value}
                                    onClick={() => {
                                        setStatus(option.value);
                                        setPage(1);
                                    }}
                                >
                                    {translate(option.labelKey)}
                                </button>
                            );
                        })}
                    </div>
                    <label className={style.searchField}>
                        <span>{translate('training.filters.search')}</span>
                        <input
                            type="search"
                            value={keyword}
                            placeholder={translate('training.filters.placeholder')}
                            onChange={(event) => {
                                setKeyword(event.target.value);
                                setPage(1);
                            }}
                        />
                    </label>
                </div>

                {tasksQuery.isLoading ? <p className={style.feedback}>{translate('common.loading')}</p> : null}
                {tasksQuery.error ? (
                    <div className={style.feedback} role="alert">
                        <span>{translate('training.errors.load')}</span>
                        <button type="button" onClick={() => tasksQuery.refetch()}>
                            {translate('common.retry')}
                        </button>
                    </div>
                ) : null}
                {tasksQuery.data?.list.length ? (
                    <TrainingTaskTable tasks={tasksQuery.data.list} translate={translate} onTerminate={handleTerminate} isTerminatePending={terminateTask.isPending} />
                ) : null}
                {tasksQuery.data && tasksQuery.data.list.length === 0 ? <p className={style.empty}>{translate('training.empty')}</p> : null}

                {tasksQuery.data ? (
                    <footer className={style.paginationFooter}>
                        <span>{translate('training.pagination.summary', { count: tasksQuery.data.page.total, pageSize: PAGE_SIZE })}</span>
                        <nav aria-label={translate('training.pagination.label')}>
                            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    className={page === pageNumber ? style.activePage : undefined}
                                    aria-current={page === pageNumber ? 'page' : undefined}
                                    aria-label={translate('training.pagination.page', { page: pageNumber })}
                                    onClick={() => setPage(pageNumber)}
                                >
                                    {pageNumber}
                                </button>
                            ))}
                        </nav>
                    </footer>
                ) : null}
            </section>

            {isWizardOpen ? (
                <TrainingTaskWizard
                    translate={translate}
                    isSubmitting={createTask.isPending}
                    errorMessage={createTask.error ? translate('training.errors.create') : undefined}
                    onClose={() => setIsWizardOpen(false)}
                    onSubmit={handleCreate}
                />
            ) : null}
            {detailTaskId ? <TrainingTaskDetail taskId={detailTaskId} /> : null}
        </main>
    );
};

export default Training;
