import classNames from 'classnames';
import { Link, useNavigate } from 'react-router-dom';
import useTranslate from '@/hooks/useTranslate';
import { getRangeHallDescriptionKey } from '@/pages/range/range-hall-mock';
import { useRangeHall } from '@/pages/range/hooks/use-range';
import style from '@/pages/range/range.module.less';
import { useTaskDraftStore } from '@/stores/task-draft-store';
import type { IRangeEnvironment } from '@/api/range';

const RangeHall = () => {
    const translate = useTranslate();
    const navigate = useNavigate();
    const { data, error, isLoading, refetch } = useRangeHall();
    const openWizard = useTaskDraftStore((state) => state.openWizard);
    const selectTaskType = useTaskDraftStore((state) => state.selectTaskType);
    const setEnvironmentId = useTaskDraftStore((state) => state.setEnvironmentId);
    const handleUseEnvironment = (environment: IRangeEnvironment) => {
        if (environment.status !== 'available') return;
        openWizard();
        selectTaskType('range');
        setEnvironmentId(environment.taskEnvironmentId);
        navigate('/tasks');
    };
    const handleNewTask = () => {
        openWizard();
        navigate('/tasks');
    };

    if (isLoading) return <div className={style.feedback}>{translate('common.loading')}</div>;
    if (error || !data) {
        return (
            <div className={style.feedback} role="alert">
                <span>{translate('common.error')}</span>
                <button type="button" onClick={() => refetch()}>
                    {translate('common.retry')}
                </button>
            </div>
        );
    }

    return (
        <main className={style.rangePage}>
            <Link className={style.backLink} to="/tasks">
                {translate('range.actions.backTasks')}
            </Link>
            <header className={style.pageHeader}>
                <div>
                    <span>{translate('range.eyebrow')}</span>
                    <h1>{translate('range.hall.title')}</h1>
                    <p>{translate('range.hall.subtitle')}</p>
                </div>
                <button type="button" className={style.primaryButton} onClick={handleNewTask}>
                    {translate('range.actions.newTask')}
                </button>
            </header>

            <ul className={style.environmentGrid} aria-label={translate('range.hall.environments')}>
                {data.environments.map((environment) => (
                    <li key={environment.id} className={style.environmentCard}>
                        <div className={style.cardHeader}>
                            <span className={style.environmentId} data-testid="range-environment-id">
                                {environment.id}
                            </span>
                            <div className={style.badgeGroup}>
                                <span className={style.industryBadge}>{environment.industry}</span>
                                <span className={style.typeBadge}>{translate(environment.isReal ? 'range.badge.real' : 'range.badge.preset')}</span>
                                <span className={classNames(style.status, environment.status === 'pending' && style.statusPending)}>{translate(`range.status.${environment.status}`)}</span>
                            </div>
                        </div>
                        <div className={style.cardBody}>
                            <h2>{environment.name}</h2>
                            <p>{environment.description || translate(getRangeHallDescriptionKey(environment.id))}</p>
                            <dl className={style.metaGrid}>
                                <div>
                                    <dd>{environment.networkScale || '0'}</dd>
                                    <dt>{translate('range.fields.networkScale')}</dt>
                                </div>
                                <div>
                                    <dd>0</dd>
                                    <dt>{translate('range.fields.milestones')}</dt>
                                </div>
                            </dl>
                            <footer>
                                <button type="button" className={style.primaryButton} disabled={environment.status !== 'available'} onClick={() => handleUseEnvironment(environment)}>
                                    {translate('range.actions.useEnvironment')}
                                </button>
                                <button type="button" className={style.secondaryButton} onClick={() => navigate(`/range-detail/${encodeURIComponent(environment.id)}`)}>
                                    {translate('range.actions.detail')}
                                </button>
                            </footer>
                        </div>
                    </li>
                ))}
            </ul>
        </main>
    );
};

export default RangeHall;
