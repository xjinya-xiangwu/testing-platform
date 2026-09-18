import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '@/pages/dashboard/hooks/use-dashboard';
import useTranslate from '@/hooks/useTranslate';
import style from '@/pages/dashboard/dashboard-board.module.less';

type BoardRange = 'today' | 'week';

interface BoardTask {
    actionKey: string;
    cost: string;
    duration: string;
    id: string;
    object: string;
    pending: string;
    progress: number;
    scope: string;
    statusKey: string;
    title: string;
    token: string;
    to: string;
}

interface BoardMetric {
    detailKey: string;
    labelKey: string;
    value: string | number;
}

interface QuickAction {
    labelKey: string;
    to: string;
}

interface QuickItem {
    actions: readonly QuickAction[];
    detail: string;
    id: string;
    statusKey: string;
}

const TASKS: readonly BoardTask[] = [
    {
        id: 'RUN-1024',
        title: '代码评测 · ExploitGym v1.3',
        object: 'Agent A v2',
        scope: '50 样本 · Docker Sandbox',
        statusKey: 'dashboard.board.status.running',
        pending: '—',
        progress: 64,
        duration: '18m',
        cost: '¥12.4',
        token: '86k',
        actionKey: 'dashboard.board.action.workbench',
        to: '/workbench?job=RUN-1024',
    },
    {
        id: 'RUN-1021',
        title: '靶场评测 · Web 靶场',
        object: 'Agent B v1',
        scope: '授权范围 A · 42m',
        statusKey: 'dashboard.board.status.review',
        pending: '3 条低置信 Finding · 导出审批',
        progress: 100,
        duration: '42m',
        cost: '¥31.0',
        token: '210k',
        actionKey: 'dashboard.board.action.review',
        to: '/tasks?type=code',
    },
    {
        id: 'RUN-1019',
        title: '代码评测 · Cybench',
        object: 'Model C v3',
        scope: '80 样本 · 环境启动失败',
        statusKey: 'dashboard.board.status.failed',
        pending: 'Docker 镜像拉取超时',
        progress: 36,
        duration: '09m',
        cost: '¥4.8',
        token: '32k',
        actionKey: 'dashboard.board.action.reason',
        to: '/workbench?job=RUN-1019',
    },
    {
        id: 'RUN-1017',
        title: '代码评测 · PatchEval',
        object: 'Agent A v1',
        scope: '40 样本 · 已完成',
        statusKey: 'dashboard.board.status.completed',
        pending: '—',
        progress: 100,
        duration: '26m',
        cost: '¥15.2',
        token: '121k',
        actionKey: 'dashboard.board.action.report',
        to: '/tasks?type=code',
    },
];

const RESOURCE_METRICS: readonly BoardMetric[] = [
    {
        labelKey: 'dashboard.board.metric.suites',
        value: '5 / 6',
        detailKey: 'dashboard.board.metric.suitesNote',
    },
    {
        labelKey: 'dashboard.board.metric.ranges',
        value: '4 / 5',
        detailKey: 'dashboard.board.metric.rangesNote',
    },
    {
        labelKey: 'dashboard.board.metric.compute',
        value: '12 / 16',
        detailKey: 'dashboard.board.metric.computeNote',
    },
    {
        labelKey: 'dashboard.board.metric.models',
        value: '6 / 7',
        detailKey: 'dashboard.board.metric.modelsNote',
    },
];

const DATASETS: readonly QuickItem[] = [
    {
        id: 'DS-2026-09-18',
        detail: '已确认 1,240 / 1,500 · 2 个引用',
        statusKey: 'dashboard.board.status.completed',
        actions: [
            { labelKey: 'dashboard.board.quick.view', to: '/data' },
            { labelKey: 'dashboard.board.quick.download', to: '/data' },
        ],
    },
    {
        id: 'DS-2026-09-17',
        detail: '已确认 980 / 1,200 · 标注完成',
        statusKey: 'dashboard.board.status.completed',
        actions: [
            { labelKey: 'dashboard.board.quick.view', to: '/data' },
            { labelKey: 'dashboard.board.quick.download', to: '/data' },
        ],
    },
];

const REPORTS: readonly QuickItem[] = [
    {
        id: 'R-2026-0091',
        detail: 'RUN-1021 · 生成于 09:30',
        statusKey: 'dashboard.board.status.completed',
        actions: [
            { labelKey: 'dashboard.board.quick.view', to: '/tasks?type=code' },
            { labelKey: 'dashboard.board.quick.download', to: '/tasks?type=code' },
        ],
    },
    {
        id: 'R-2026-0092',
        detail: 'RUN-1017 · 预计 10m',
        statusKey: 'dashboard.board.status.generating',
        actions: [{ labelKey: 'dashboard.board.quick.view', to: '/tasks?type=code' }],
    },
];

const STATUS_CLASS = {
    completed: style.statusCompleted,
    failed: style.statusFailed,
    generating: style.statusGenerating,
    review: style.statusReview,
    running: style.statusRunning,
    verify: style.statusVerify,
} as const;

const getStatusClass = (key: string) => STATUS_CLASS[key.split('.').pop() as keyof typeof STATUS_CLASS] ?? style.statusRunning;

const DashboardBoard = () => {
    const translate = useTranslate();
    const { data, dataUpdatedAt, isError, isLoading, refetch } = useDashboard();
    const [range, setRange] = useState<BoardRange>('week');

    const taskRing = data?.taskRing;
    const running = taskRing?.running ?? 0;
    const completed = taskRing?.doneToday ?? 0;
    const queued = taskRing?.queued ?? 0;
    const updatedLabel = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString(undefined, { hour12: false }) : translate('common.notAvailable');
    const sourceStatus = isLoading ? translate('dashboard.board.source.loading') : isError ? translate('dashboard.board.source.error') : translate('dashboard.board.source.ready');

    const runMetrics: readonly BoardMetric[] = [
        {
            labelKey: 'dashboard.board.metric.running',
            value: running,
            detailKey: 'dashboard.board.metric.runningNote',
        },
        {
            labelKey: 'dashboard.board.metric.completed',
            value: completed,
            detailKey: 'dashboard.board.metric.completedNote',
        },
        {
            labelKey: 'dashboard.board.metric.datasets',
            value: 5,
            detailKey: 'dashboard.board.metric.datasetsNote',
        },
        {
            labelKey: 'dashboard.board.metric.pending',
            value: 5,
            detailKey: 'dashboard.board.metric.pendingNote',
        },
    ];

    const resourceValues = {
        queued,
    };

    return (
        <main className={style.board} aria-label={translate('dashboard.board.title')}>
            <div className={style.inner}>
                <header className={style.header}>
                    <div className={style.headerText}>
                        <h1>{translate('dashboard.board.title')}</h1>
                        <p>{translate('dashboard.board.scope', { project: '安全评测项目 A', range: translate(`dashboard.board.range.${range}`) })}</p>
                        <p className={isError ? style.sourceError : style.source} aria-live="polite">
                            {sourceStatus} · {translate('dashboard.board.updated', { time: updatedLabel })}
                        </p>
                    </div>
                    <div className={style.headerActions}>
                        <div className={style.rangeSwitch} role="group" aria-label={translate('dashboard.board.range.label')}>
                            {(['today', 'week'] as const).map((item) => (
                                <button key={item} type="button" className={range === item ? style.rangeActive : undefined} aria-pressed={range === item} onClick={() => setRange(item)}>
                                    {translate(`dashboard.board.range.${item}`)}
                                </button>
                            ))}
                        </div>
                        <button type="button" className={style.secondaryButton} onClick={() => void refetch()}>
                            {translate('dashboard.board.refresh')}
                        </button>
                        <Link className={style.primaryButton} to="/tasks?type=code">
                            {translate('dashboard.board.createCode')}
                        </Link>
                        <Link className={style.secondaryButton} to="/tasks?type=range">
                            {translate('dashboard.board.createRange')}
                        </Link>
                    </div>
                </header>

                <section className={style.metricPanels} aria-label={translate('dashboard.board.overview.title')}>
                    <article className={style.metricPanel}>
                        <header>
                            <h2>{translate('dashboard.board.overview.taskTitle')}</h2>
                            <span>{translate('dashboard.board.overview.taskSubtitle')}</span>
                        </header>
                        <div className={style.metricGrid}>
                            {runMetrics.map((metric) => (
                                <div key={metric.labelKey} className={style.metricTile}>
                                    <span>{translate(metric.labelKey)}</span>
                                    <strong>{metric.value}</strong>
                                    <small>{translate(metric.detailKey, resourceValues)}</small>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className={style.metricPanel} aria-label={translate('dashboard.board.resources.title')}>
                        <header>
                            <h2>{translate('dashboard.board.resources.title')}</h2>
                            <span>{translate('dashboard.board.resources.subtitle')}</span>
                        </header>
                        <div className={style.metricGrid}>
                            {RESOURCE_METRICS.map((metric) => (
                                <div key={metric.labelKey} className={style.metricTile}>
                                    <span>{translate(metric.labelKey)}</span>
                                    <strong>{metric.value}</strong>
                                    <small>{translate(metric.detailKey)}</small>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <div className={style.mainGrid}>
                    <section className={style.card} aria-label={translate('dashboard.board.tasks.title')}>
                        <header>
                            <h2>{translate('dashboard.board.tasks.title')}</h2>
                            <span>{translate('dashboard.board.tasks.subtitle')}</span>
                        </header>
                        <div className={style.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{translate('dashboard.board.tasks.task')}</th>
                                        <th>{translate('dashboard.board.tasks.object')}</th>
                                        <th>{translate('dashboard.board.tasks.status')}</th>
                                        <th>{translate('dashboard.board.tasks.pending')}</th>
                                        <th>{translate('dashboard.board.tasks.progress')}</th>
                                        <th>{translate('dashboard.board.tasks.cost')}</th>
                                        <th>{translate('dashboard.board.tasks.action')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {TASKS.map((task) => (
                                        <tr key={task.id}>
                                            <td>
                                                <strong>{task.id}</strong>
                                                <span>{task.title}</span>
                                            </td>
                                            <td>
                                                <span>{task.object}</span>
                                                <small>{task.scope}</small>
                                            </td>
                                            <td>
                                                <span className={getStatusClass(task.statusKey)}>{translate(task.statusKey)}</span>
                                            </td>
                                            <td>
                                                <span className={task.pending === '—' ? style.pendingEmpty : style.pendingText}>{task.pending}</span>
                                            </td>
                                            <td>
                                                <div className={style.progressCell}>
                                                    <progress aria-label={translate('dashboard.board.tasks.progressLabel', { id: task.id })} value={task.progress} max={100} />
                                                    <span>
                                                        {task.progress}% · {task.duration}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span>{task.cost}</span>
                                                <small>{task.token}</small>
                                            </td>
                                            <td>
                                                <Link className={style.rowAction} to={task.to}>
                                                    {translate(task.actionKey)}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className={style.card} aria-label={translate('dashboard.board.current.title')}>
                        <header>
                            <h2>{translate('dashboard.board.current.title')}</h2>
                            <span>RUN-1024</span>
                        </header>
                        <div className={style.currentBody}>
                            <progress aria-label={translate('dashboard.board.current.progressLabel')} value={32} max={50} />
                            <span>{translate('dashboard.board.current.samples', { done: 32, total: 50, percent: 64 })}</span>
                            <dl>
                                <div>
                                    <dt>{translate('dashboard.board.current.step')}</dt>
                                    <dd>验证证据并写入运行日志</dd>
                                </div>
                                <div>
                                    <dt>{translate('dashboard.board.current.budget')}</dt>
                                    <dd>¥12.4 / ¥20 · 86k / 120k</dd>
                                </div>
                                <div>
                                    <dt>{translate('dashboard.board.current.event')}</dt>
                                    <dd>环境连接重试成功</dd>
                                </div>
                            </dl>
                            <Link className={style.primaryButton} to="/workbench?job=RUN-1024">
                                {translate('dashboard.board.current.open')}
                            </Link>
                        </div>
                    </section>
                </div>

                <div className={style.quickGrid}>
                    <section className={style.card} aria-label={translate('dashboard.board.datasets.title')}>
                        <header>
                            <h2>{translate('dashboard.board.datasets.title')}</h2>
                            <span>{translate('dashboard.board.datasets.subtitle')}</span>
                        </header>
                        <ul className={style.quickList}>
                            {DATASETS.map((item) => (
                                <li key={item.id}>
                                    <span className={getStatusClass(item.statusKey)}>{translate(item.statusKey)}</span>
                                    <div>
                                        <strong>{item.id}</strong>
                                        <span>{item.detail}</span>
                                    </div>
                                    <div className={style.quickActions}>
                                        {item.actions.map((action) => (
                                            <Link key={action.labelKey} className={style.rowAction} to={action.to}>
                                                {translate(action.labelKey)}
                                            </Link>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className={style.card} aria-label={translate('dashboard.board.reports.title')}>
                        <header>
                            <h2>{translate('dashboard.board.reports.title')}</h2>
                            <span>{translate('dashboard.board.reports.subtitle')}</span>
                        </header>
                        <ul className={style.quickList}>
                            {REPORTS.map((item) => (
                                <li key={item.id}>
                                    <span className={getStatusClass(item.statusKey)}>{translate(item.statusKey)}</span>
                                    <div>
                                        <strong>{item.id}</strong>
                                        <span>{item.detail}</span>
                                    </div>
                                    <div className={style.quickActions}>
                                        {item.actions.map((action) => (
                                            <Link key={action.labelKey} className={style.rowAction} to={action.to}>
                                                {translate(action.labelKey)}
                                            </Link>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </main>
    );
};

export default DashboardBoard;
