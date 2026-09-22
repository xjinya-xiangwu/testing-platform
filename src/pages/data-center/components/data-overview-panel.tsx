import { useQuestionBankOverview } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { StatCard } from '@/pages/data-center/components/question-bank-shared';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

interface DataOverviewPanelProps {
    translate: Translate;
    onOpenCatalog: () => void;
}

const DataOverviewPanel = ({ translate, onOpenCatalog }: DataOverviewPanelProps) => {
    const overviewQuery = useQuestionBankOverview();
    const overview = overviewQuery.data;

    if (!overview) {
        return (
            <div className={style.qbSection}>
                <p className={style.qbEmptyLine}>{translate('common.loading')}</p>
            </div>
        );
    }

    const todoItems = [
        { key: 'gate', label: translate('questionBank.overview.todo.gate'), value: overview.todos.blockedGates.length, danger: overview.todos.blockedGates.length > 0 },
        { key: 'corrections', label: translate('questionBank.overview.todo.corrections'), value: overview.todos.pendingCorrections, danger: overview.todos.pendingCorrections > 0 },
        { key: 'exports', label: translate('questionBank.overview.todo.exports'), value: overview.todos.pendingExports, danger: overview.todos.pendingExports > 0 },
        { key: 'jobs', label: translate('questionBank.overview.todo.jobs'), value: overview.todos.runningJobs, danger: false },
        { key: 'failed', label: translate('questionBank.overview.todo.failedPrechecks'), value: overview.todos.failedPrechecks, danger: overview.todos.failedPrechecks > 0 },
    ];

    return (
        <div className={style.qbPanel}>
            <section className={style.qbStatGrid} aria-label={translate('questionBank.overview.fourCountsHint')}>
                <StatCard label={translate('questionBank.overview.sandboxes')} value={`2,537+`} hint={translate('questionBank.overview.sandboxesHint')} />
                <StatCard label={translate('questionBank.overview.envLogical')} value={overview.totals.logicalEnvCount.toLocaleString()} hint={translate('questionBank.overview.fourCountsHint')} />
                <StatCard label={translate('questionBank.overview.envStateRefs')} value={overview.totals.imageStateRefs.toLocaleString()} />
                <StatCard label={translate('questionBank.overview.envUniqueDigests')} value={overview.totals.uniqueImageDigestCount.toLocaleString()} />
                <StatCard label={translate('questionBank.overview.envWorkspaces')} value={overview.totals.workspaceCount.toLocaleString()} />
            </section>

            <div className={style.qbSplit}>
                <section className={style.qbCard} aria-label={translate('questionBank.overview.readiness')}>
                    <header>
                        <h3>{translate('questionBank.overview.readiness')}</h3>
                    </header>
                    <div className={style.qbStatGrid}>
                        <StatCard label={translate('questionBank.overview.readiness.published')} value={overview.readiness.published} />
                        <StatCard label={translate('questionBank.overview.readiness.verified')} value={overview.readiness.verified} />
                        <StatCard label={translate('questionBank.overview.readiness.inProgress')} value={overview.readiness.inProgress} />
                    </div>
                </section>

                <section className={style.qbCard} aria-label={translate('questionBank.overview.todos')}>
                    <header>
                        <h3>{translate('questionBank.overview.todos')}</h3>
                    </header>
                    <ul className={style.qbTodoList}>
                        {todoItems.map((item) => (
                            <li key={item.key} className={item.danger && item.value > 0 ? style.qbTodoDanger : undefined}>
                                <span>{item.label}</span>
                                <b>{item.value}</b>
                            </li>
                        ))}
                    </ul>
                    {overview.todos.blockedGates.length > 0 ? (
                        <ul className={style.qbGateList}>
                            {overview.todos.blockedGates.slice(0, 4).map((gate) => (
                                <li key={gate.versionId}>
                                    {gate.label} · {translate('questionBank.catalog.gate.closed', { missing: gate.missing, total: gate.total })}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </section>
            </div>

            <section className={style.qbCard} aria-label={translate('questionBank.overview.events')}>
                <header>
                    <h3>{translate('questionBank.overview.events')}</h3>
                    <button type="button" className={style.qbTextButton} onClick={onOpenCatalog}>
                        {translate('questionBank.overview.gotoCatalog')}
                    </button>
                </header>
                <table className={style.qbTable}>
                    <thead>
                        <tr>
                            <th>{translate('questionBank.overview.event.time')}</th>
                            <th>{translate('questionBank.overview.event.action')}</th>
                            <th>{translate('questionBank.overview.event.target')}</th>
                            <th>{translate('questionBank.overview.event.detail')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {overview.recentEvents.map((event) => (
                            <tr key={event.id}>
                                <td>{new Date(event.time).toLocaleString()}</td>
                                <td>{event.action}</td>
                                <td>{event.target}</td>
                                <td>{event.detail}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default DataOverviewPanel;
