import DashboardCard from '@/pages/dashboard/components/dashboard-card';
import style from '@/pages/dashboard/dashboard.module.less';

interface DashboardLeftColumnProps {
    translate: (key: string) => string;
}

const BENCHMARKS = [
    { name: 'ExploitGym', capability: '漏洞利用', status: 'READY', metric: 'Exploit Count' },
    { name: 'CyberGym', capability: '漏洞挖掘', status: 'READY', metric: 'Success Rate' },
    { name: 'PatchEval', capability: '漏洞修复', status: 'READY', metric: 'Repair Rate' },
    { name: 'Cybench', capability: '综合攻防', status: 'VERIFY', metric: 'Task Score' },
    { name: 'RealVuln v2', capability: '真实漏洞', status: 'VERIFY', metric: 'Verified Finding' },
] as const;

const DashboardLeftColumn = ({ translate }: DashboardLeftColumnProps) => (
    <aside className={style.column} aria-label={translate('dashboard.left.aria')}>
        <DashboardCard title={translate('dashboard.benchmarkReadiness.title')} subtitle={translate('dashboard.benchmarkReadiness.subtitle')}>
            <div className={style.benchmarkSummary}>
                <div>
                    <strong>5</strong>
                    <span>{translate('dashboard.benchmarkReadiness.published')}</span>
                </div>
                <div>
                    <strong>3</strong>
                    <span>{translate('dashboard.benchmarkReadiness.runnable')}</span>
                </div>
                <div>
                    <strong>2</strong>
                    <span>{translate('dashboard.benchmarkReadiness.verifying')}</span>
                </div>
            </div>
            <ol className={style.benchmarkReadinessList}>
                {BENCHMARKS.map((benchmark) => (
                    <li key={benchmark.name}>
                        <header>
                            <strong>{benchmark.name}</strong>
                            <span className={benchmark.status === 'READY' ? style.readyStatus : style.verifyStatus}>{benchmark.status}</span>
                        </header>
                        <p>{benchmark.capability}</p>
                        <dl>
                            <div>
                                <dt>{translate('dashboard.benchmarkReadiness.data')}</dt>
                                <dd>✓</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.benchmarkReadiness.environment')}</dt>
                                <dd>{benchmark.status === 'READY' ? '✓' : '…'}</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.benchmarkReadiness.grader')}</dt>
                                <dd>{benchmark.status === 'READY' ? '✓' : '…'}</dd>
                            </div>
                        </dl>
                        <small>
                            {translate('dashboard.benchmarkReadiness.primaryMetric')} · {benchmark.metric}
                        </small>
                    </li>
                ))}
            </ol>
        </DashboardCard>
    </aside>
);

export default DashboardLeftColumn;
