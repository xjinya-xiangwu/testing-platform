import { Link } from 'react-router-dom';
import type { IDemoJobCard } from '@/api/demo-job';
import { PINNED_JOB_ID } from '@/config/demo-job';
import useTranslate from '@/hooks/useTranslate';
import style from '@/pages/tasks/components/demo-task-card.module.less';

interface DemoTaskCardProps {
    card: IDemoJobCard;
}

const DemoTaskCard = ({ card }: DemoTaskCardProps) => {
    const translate = useTranslate();
    const progressLabel = translate('tasks.demo.progress', {
        completed: card.milestones.completed,
        progress: Math.round(card.progress),
        total: card.milestones.total,
    });

    return (
        <section className={style.demoTaskCard} role="region" aria-label={translate('tasks.demo.region')}>
            <header className={style.demoTaskHeader}>
                <div className={style.demoTaskIntro}>
                    <span>{translate('tasks.demo.eyebrow')}</span>
                    <h2>{card.name}</h2>
                    <p>{card.subtitle}</p>
                </div>
                <div className={style.demoTaskControls}>
                    <div className={style.demoTaskProgress} title={progressLabel}>
                        <progress value={card.progress} max={100} aria-label={progressLabel} />
                        <span>{progressLabel}</span>
                    </div>
                    <span className={style.demoRunningStatus}>
                        <i aria-hidden="true" />
                        {translate('tasks.demo.status')}
                    </span>
                    <Link to={`/workbench?job=${encodeURIComponent(PINNED_JOB_ID)}`} aria-label={translate('tasks.demo.detailLabel', { job: card.displayNo })}>
                        {translate('tasks.demo.detail')}
                    </Link>
                </div>
            </header>

            <dl className={style.demoTaskFields}>
                <div>
                    <dt>{translate('tasks.demo.fields.number')}</dt>
                    <dd>{card.displayNo}</dd>
                </div>
                <div>
                    <dt>{translate('tasks.demo.fields.resource')}</dt>
                    <dd>{card.resourceName}</dd>
                </div>
                <div>
                    <dt>{translate('tasks.demo.fields.agent')}</dt>
                    <dd>{card.agentId}</dd>
                </div>
                <div>
                    <dt>{translate('tasks.demo.fields.topology')}</dt>
                    <dd>{card.topologySummary}</dd>
                </div>
                <div>
                    <dt>{translate('tasks.demo.fields.attackChain')}</dt>
                    <dd>{card.attackChain}</dd>
                </div>
                <div>
                    <dt>{translate('tasks.demo.fields.runMode')}</dt>
                    <dd>{card.runModeText}</dd>
                </div>
            </dl>
        </section>
    );
};

export default DemoTaskCard;
