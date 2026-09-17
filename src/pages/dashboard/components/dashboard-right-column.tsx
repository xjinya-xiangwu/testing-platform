import { IDashboardData } from '@/api/dashboard';
import DashboardCard from '@/pages/dashboard/components/dashboard-card';
import DonutChart from '@/pages/dashboard/components/donut-chart';
import panelStyle from '@/pages/dashboard/components/dashboard-panels.module.less';
import style from '@/pages/dashboard/dashboard.module.less';

interface DashboardRightColumnProps {
    data: IDashboardData;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const DashboardRightColumn = ({ data, translate }: DashboardRightColumnProps) => {
    const unavailable = translate('common.notAvailable');
    const formatValue = (value: number | undefined) => value ?? unavailable;
    const completionLabel = data.taskRing.completionPercent === undefined ? unavailable : `${data.taskRing.completionPercent.toFixed(1)}%`;
    const totalLabel = formatValue(data.taskRing.total);

    return (
        <aside className={style.column} aria-label={translate('dashboard.right.aria')}>
            <DashboardCard title={translate('dashboard.tasks.title')}>
                <div className={panelStyle.taskPanel}>
                    <DonutChart
                        ariaLabel={translate('dashboard.tasks.summary', { total: totalLabel, percent: completionLabel })}
                        completionPercent={data.taskRing.completionPercent}
                        total={totalLabel}
                        caption={translate('dashboard.tasks.total')}
                    />
                    <ul className={panelStyle.taskLegend}>
                        <li>
                            <i className={panelStyle.taskRunningDot} aria-hidden="true" />
                            <span>{translate('dashboard.tasks.running')}</span>
                            <b>{formatValue(data.taskRing.running)}</b>
                        </li>
                        <li>
                            <i className={panelStyle.taskQueuedDot} aria-hidden="true" />
                            <span>{translate('dashboard.tasks.queued')}</span>
                            <b>{formatValue(data.taskRing.queued)}</b>
                        </li>
                        <li>
                            <i className={panelStyle.taskDoneDot} aria-hidden="true" />
                            <span>{translate('dashboard.tasks.done')}</span>
                            <b>{formatValue(data.taskRing.doneToday)}</b>
                        </li>
                        <li>
                            <i className={panelStyle.taskProgressDot} aria-hidden="true" />
                            <span>{translate('dashboard.tasks.progress')}</span>
                            <b>{completionLabel}</b>
                        </li>
                    </ul>
                </div>
            </DashboardCard>

            <DashboardCard title={translate('dashboard.governance.title')} subtitle={translate('dashboard.governance.subtitle')}>
                <div className={style.governancePanel}>
                    <section>
                        <h3>{translate('dashboard.governance.subjects')}</h3>
                        <ul className={style.subjectList}>
                            <li>
                                <strong>Mythos-Attack-v2</strong>
                                <span>{translate('dashboard.governance.builtin')}</span>
                                <b>ONLINE</b>
                            </li>
                            <li>
                                <strong>GLM-5.2</strong>
                                <span>{translate('dashboard.governance.external')}</span>
                                <b>VERIFIED</b>
                            </li>
                            <li>
                                <strong>RedBot-X</strong>
                                <span>{translate('dashboard.governance.external')}</span>
                                <b className={style.warningText}>PENDING</b>
                            </li>
                        </ul>
                    </section>
                    <section>
                        <h3>{translate('dashboard.governance.boundaries')}</h3>
                        <ul className={style.guardrailList}>
                            <li>
                                <span>✓</span>
                                {translate('dashboard.governance.projectIsolation')}
                            </li>
                            <li>
                                <span>✓</span>
                                {translate('dashboard.governance.noInternet')}
                            </li>
                            <li>
                                <span>✓</span>
                                {translate('dashboard.governance.credentialMask')}
                            </li>
                            <li>
                                <span>✓</span>
                                {translate('dashboard.governance.snapshot')}
                            </li>
                            <li>
                                <span>✓</span>
                                {translate('dashboard.governance.review')}
                            </li>
                        </ul>
                    </section>
                    <section>
                        <h3>{translate('dashboard.governance.delivery')}</h3>
                        <dl className={style.deliveryStats}>
                            <div>
                                <dt>{translate('dashboard.governance.pendingReview')}</dt>
                                <dd>3</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.governance.reportDraft')}</dt>
                                <dd>2</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.governance.exportApproval')}</dt>
                                <dd>1</dd>
                            </div>
                        </dl>
                    </section>
                </div>
            </DashboardCard>
        </aside>
    );
};

export default DashboardRightColumn;
