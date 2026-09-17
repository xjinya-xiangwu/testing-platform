import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import { getOptionLabelKey, TRAINING_DATASETS, TRAINING_STATUSES, TRAINING_TYPES } from '@/pages/training/training-options';
import style from '@/pages/training/training.module.less';
import type { ITrainingTask } from '@/api/training-tasks';

interface TrainingTaskTableProps {
    isTerminatePending: boolean;
    onTerminate: (taskId: string) => void;
    tasks: readonly ITrainingTask[];
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const ExportPlaceholder = ({ actionKey, taskId, translate }: { actionKey: 'dataset' | 'model'; taskId: string; translate: TrainingTaskTableProps['translate'] }) => {
    const label = translate(`training.actions.export.${actionKey}`);
    const developmentMessage = translate('training.actions.development');
    return (
        <Tooltip title={developmentMessage}>
            <span className={style.disabledAction} title={developmentMessage}>
                <button type="button" disabled aria-label={`${label} ${taskId}`}>
                    {label}
                </button>
            </span>
        </Tooltip>
    );
};

const TrainingTaskActions = ({ isTerminatePending, onTerminate, task, translate }: Omit<TrainingTaskTableProps, 'tasks'> & { task: ITrainingTask }) => {
    const terminateLabel = task.status === 0 ? translate('training.actions.cancelQueue') : translate('training.actions.terminate');
    if (task.status === 0 || task.status === 1 || task.status === 2) {
        return (
            <div className={style.rowActions}>
                <button type="button" disabled={isTerminatePending} aria-label={`${terminateLabel} ${task.id}`} onClick={() => onTerminate(task.id)}>
                    {terminateLabel}
                </button>
                {task.status === 1 ? (
                    <Link to={`/training-live?task=${encodeURIComponent(task.id)}`} aria-label={`${translate('training.actions.live')} ${task.id}`}>
                        {translate('training.actions.live')}
                    </Link>
                ) : null}
                {task.status === 2 ? (
                    <Link to={`/training-live?task=${encodeURIComponent(task.id)}`} aria-label={`${translate('training.actions.detail')} ${task.id}`}>
                        {translate('training.actions.detail')}
                    </Link>
                ) : null}
            </div>
        );
    }
    if (task.status === 3) {
        return (
            <div className={style.rowActions}>
                <Link to={`/training-live?task=${encodeURIComponent(task.id)}`} aria-label={`${translate('training.actions.detail')} ${task.id}`}>
                    {translate('training.actions.detail')}
                </Link>
                <ExportPlaceholder actionKey="dataset" taskId={task.id} translate={translate} />
                <ExportPlaceholder actionKey="model" taskId={task.id} translate={translate} />
            </div>
        );
    }
    return (
        <div className={style.rowActions}>
            <Link to={`/training-live?task=${encodeURIComponent(task.id)}`} aria-label={`${translate('training.actions.detail')} ${task.id}`}>
                {translate('training.actions.detail')}
            </Link>
        </div>
    );
};

const TrainingTaskTable = ({ isTerminatePending, onTerminate, tasks, translate }: TrainingTaskTableProps) => (
    <div className={style.tableWrap}>
        <table className={style.taskTable} aria-label={translate('training.table.title')}>
            <thead>
                <tr>
                    <th>{translate('training.table.id')}</th>
                    <th>{translate('training.table.task')}</th>
                    <th>{translate('training.table.type')}</th>
                    <th>{translate('training.table.dataset')}</th>
                    <th>{translate('training.table.resource')}</th>
                    <th>{translate('training.table.progress')}</th>
                    <th>{translate('training.table.status')}</th>
                    <th aria-label={translate('training.table.actions')} />
                </tr>
            </thead>
            <tbody>
                {tasks.map((task) => (
                    <tr key={task.id}>
                        <td data-label={translate('training.table.id')}>
                            <strong className={style.taskId}>{task.id}</strong>
                            {task.featured ? <small className={style.featured}>{translate('training.featured')}</small> : null}
                        </td>
                        <td data-label={translate('training.table.task')}>
                            <strong>{task.name}</strong>
                            <small>{task.goal || translate('training.emptyValue')}</small>
                        </td>
                        <td data-label={translate('training.table.type')}>{translate(getOptionLabelKey(TRAINING_TYPES, task.type))}</td>
                        <td data-label={translate('training.table.dataset')}>{translate(getOptionLabelKey(TRAINING_DATASETS, task.dataset))}</td>
                        <td data-label={translate('training.table.resource')}>{task.gpu.map((gpu) => `${gpu.count}×${gpu.model}`).join(' + ')}</td>
                        <td data-label={translate('training.table.progress')}>
                            <div className={style.progressCell}>
                                <progress max={100} value={task.progress} aria-label={translate('training.progress.label', { id: task.id })} />
                                <span>{task.progress}%</span>
                                <small>{translate('training.progress.steps', { step: task.step.toLocaleString(), total: task.total.toLocaleString() })}</small>
                            </div>
                        </td>
                        <td data-label={translate('training.table.status')}>
                            <span className={style[`status${task.status}`]}>{translate(getOptionLabelKey(TRAINING_STATUSES, task.status))}</span>
                        </td>
                        <td data-label={translate('training.table.actions')}>
                            <TrainingTaskActions task={task} isTerminatePending={isTerminatePending} onTerminate={onTerminate} translate={translate} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default TrainingTaskTable;
