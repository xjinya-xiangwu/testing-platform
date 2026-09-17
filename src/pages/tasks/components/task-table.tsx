import { Link } from 'react-router-dom';
import TaskReportAction from '@/pages/tasks/components/task-report-action';
import style from '@/pages/tasks/task-list.module.less';
import type { ICompletedTask, ITaskRecord } from '@/api/tasks';

export type TaskListItem = { kind: 'active'; task: ITaskRecord } | { kind: 'completed'; task: ICompletedTask };

const BEIJING_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
});

const formatBeijingDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const parts = Object.fromEntries(BEIJING_DATE_TIME_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

interface TaskTableProps {
    isTerminatePending: boolean;
    items: readonly TaskListItem[];
    onRestart: (task: ICompletedTask) => void;
    onTerminate: (jobId: string) => void;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const ActiveTaskRow = ({ isTerminatePending, onTerminate, task, translate }: Omit<TaskTableProps, 'items' | 'onRestart'> & { task: ITaskRecord }) => (
    <tr>
        <td data-label={translate('tasks.table.job')}>
            <strong className={style.jobId}>{task.jobId}</strong>
            <small>
                <time dateTime={task.created}>{formatBeijingDateTime(task.created)}</time>
            </small>
        </td>
        <td data-label={translate('tasks.table.task')}>
            <strong>{translate(task.titleKey)}</strong>
            <small>{translate(task.sceneKey)}</small>
        </td>
        <td data-label={translate('tasks.table.executor')}>
            <strong>{task.agent}</strong>
        </td>
        <td data-label={translate('tasks.table.progress')}>
            <div className={style.progressCell}>
                <progress max={100} value={task.progress} aria-label={translate('tasks.actions.progressLabel', { job: task.jobId })} />
                <span>{task.progress}%</span>
            </div>
        </td>
        <td data-label={translate('tasks.table.status')}>
            <span className={task.status === 'running' ? style.runningStatus : style.queuedStatus}>{translate(`tasks.status.${task.status}`)}</span>
        </td>
        <td data-label={translate('tasks.table.actions')}>
            <div className={style.taskActions}>
                <button
                    type="button"
                    disabled={isTerminatePending}
                    aria-label={translate(task.status === 'queued' ? 'tasks.actions.cancelLabel' : 'tasks.actions.terminateLabel', { job: task.jobId })}
                    onClick={() => onTerminate(task.jobId)}
                >
                    {translate(task.status === 'queued' ? 'tasks.actions.cancel' : 'tasks.actions.terminate')}
                </button>
                <Link to={`/workbench?job=${encodeURIComponent(task.jobId)}`} aria-label={translate('tasks.actions.detailsLabel', { job: task.jobId })}>
                    {translate('tasks.actions.detailsShort')}
                </Link>
            </div>
        </td>
    </tr>
);

const CompletedTaskRow = ({ onRestart, task, translate }: Pick<TaskTableProps, 'onRestart' | 'translate'> & { task: ICompletedTask }) => {
    return (
        <tr>
            <td data-label={translate('tasks.table.job')}>
                <strong className={style.jobId}>{task.jobId}</strong>
                <small>
                    <time dateTime={task.completedAt}>{formatBeijingDateTime(task.completedAt)}</time>
                </small>
            </td>
            <td data-label={translate('tasks.table.task')}>
                <strong>{translate(task.titleKey)}</strong>
                <small>{translate(task.sceneKey)}</small>
            </td>
            <td data-label={translate('tasks.table.executor')}>
                <strong>{task.agentKey ? translate(task.agentKey) : task.agent}</strong>
            </td>
            <td data-label={translate('tasks.table.progress')}>
                <div className={style.progressCell}>
                    <progress max={100} value={100} aria-label={translate('tasks.actions.progressLabel', { job: task.jobId })} />
                    <span>100%</span>
                </div>
            </td>
            <td data-label={translate('tasks.table.status')}>
                <span className={style.completedStatus}>{translate('tasks.status.completed')}</span>
            </td>
            <td data-label={translate('tasks.table.actions')}>
                <div className={style.taskActions}>
                    <Link to={`/workbench?job=${encodeURIComponent(task.jobId)}`} aria-label={translate('tasks.actions.detailsLabel', { job: task.jobId })}>
                        {translate('tasks.actions.detailsShort')}
                    </Link>
                    <button type="button" aria-label={translate('tasks.actions.restartLabel', { job: task.jobId })} onClick={() => onRestart(task)}>
                        {translate('tasks.actions.restart')}
                    </button>
                    <TaskReportAction task={task} translate={translate} />
                </div>
            </td>
        </tr>
    );
};

const TaskTable = ({ isTerminatePending, items, onRestart, onTerminate, translate }: TaskTableProps) => (
    <div className={style.tableWrap}>
        <table className={style.taskTable} aria-label={translate('tasks.table.title')}>
            <thead>
                <tr>
                    <th>{translate('tasks.table.job')}</th>
                    <th>{translate('tasks.table.task')}</th>
                    <th>{translate('tasks.table.executor')}</th>
                    <th>{translate('tasks.table.progress')}</th>
                    <th>{translate('tasks.table.status')}</th>
                    <th aria-label={translate('tasks.table.actions')} />
                </tr>
            </thead>
            <tbody>
                {items.map((item) =>
                    item.kind === 'active' ? (
                        <ActiveTaskRow key={item.task.jobId} task={item.task} isTerminatePending={isTerminatePending} onTerminate={onTerminate} translate={translate} />
                    ) : (
                        <CompletedTaskRow key={item.task.jobId} task={item.task} onRestart={onRestart} translate={translate} />
                    ),
                )}
            </tbody>
        </table>
    </div>
);

export default TaskTable;
