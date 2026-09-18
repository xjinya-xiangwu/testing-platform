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
    progress: number;
    scope: string;
    statusKey: string;
    title: string;
    token: string;
    to: string;
}

interface BoardAction {
    actionKey: string;
    detail: string;
    levelKey: string;
    title: string;
    to: string;
    waiting: string;
}

interface BoardResource {
    available: string;
    labelKey: string;
    noteKey: string;
    statusKey: string;
}

const TASKS: readonly BoardTask[] = [
    {
        id: 'RUN-1024',
        title: '代码评测 · ExploitGym v1.3',
        object: 'Agent A v2',
        scope: '50 样本 · Docker Sandbox',
        statusKey: 'dashboard.board.status.running',
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
        progress: 100,
        duration: '26m',
        cost: '¥15.2',
        token: '121k',
        actionKey: 'dashboard.board.action.report',
        to: '/tasks?type=code',
    },
];

const ACTIONS: readonly BoardAction[] = [
    {
        levelKey: 'dashboard.board.status.failed',
        title: 'RUN-1019 环境启动失败',
        detail: 'Docker 镜像拉取超时 · 已隔离',
        waiting: '09m',
        actionKey: 'dashboard.board.action.reason',
        to: '/workbench?job=RUN-1019',
    },
    {
        levelKey: 'dashboard.board.status.review',
        title: '3 条低置信 Finding',
        detail: '来源 RUN-1021 · 等待人工复核',
        waiting: '22m',
        actionKey: 'dashboard.board.action.review',
        to: '/tasks?type=code',
    },
    {
        levelKey: 'dashboard.board.status.review',
        title: '报告导出审批',
        detail: 'R-2026-0091 · 项目负责人确认',
        waiting: '1h',
        actionKey: 'dashboard.board.action.approve',
        to: '/tasks?type=code',
    },
];

const RESOURCES: readonly BoardResource[] = [
    {
        labelKey: 'dashboard.board.resource.agents',
        available: '6 / 7',
        noteKey: 'dashboard.board.resource.agentsNote',
        statusKey: 'dashboard.board.status.verify',
    },
    {
        labelKey: 'dashboard.board.resource.suites',
        available: '5 / 6',
        noteKey: 'dashboard.board.resource.suitesNote',
        statusKey: 'dashboard.board.status.completed',
    },
    {
        labelKey: 'dashboard.board.resource.environments',
        available: '4 / 5',
        noteKey: 'dashboard.board.resource.environmentsNote',
        statusKey: 'dashboard.board.status.running',
    },
    {
        labelKey: 'dashboard.board.resource.gateway',
        available: '正常',
        noteKey: 'dashboard.board.resource.gatewayNote',
        statusKey: 'dashboard.board.status.completed',
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

    const kpis = [
        {
            label: translate('dashboard.board.kpi.running'),
            value: running,
            detail: translate('dashboard.board.kpi.runningDetail', { queued, failed: 1, duration: '18m' }),
        },
        {
            label: translate('dashboard.board.kpi.completed'),
            value: completed,
            detail: translate('dashboard.board.kpi.completedDetail', { ready: 2, generating: 1 }),
        },
        {
            label: translate('dashboard.board.kpi.pending'),
            value: 5,
            detail: translate('dashboard.board.kpi.pendingDetail', { review: 3, failed: 1, approval: 1 }),
        },
        {
            label: translate('dashboard.board.kpi.resources'),
            value: translate('dashboard.board.kpi.resourcesValue', { available: 18, total: 22 }),
            detail: translate('dashboard.board.kpi.resourcesDetail'),
        },
    ];

    return (
        <main className={style.board} aria-label={translate('dashboard.board.title')}>
            <div className={style.inner}>
                <header className={style.header}>
                    <div className={style.headerText}>
                        <p>{translate('dashboard.board.eyebrow')}</p>
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

                <section className={style.kpiGrid} aria-label={translate('dashboard.board.kpi.title')}>
                    {kpis.map((kpi) => (
                        <article key={kpi.label} className={style.kpiCard}>
                            <span>{kpi.label}</span>
                            <strong>{kpi.value}</strong>
                            <small>{kpi.detail}</small>
                        </article>
                    ))}
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
                                        <th>{translate('dashboard.board.tasks.scope')}</th>
                                        <th>{translate('dashboard.board.tasks.status')}</th>
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
                                            <td>{task.object}</td>
                                            <td>{task.scope}</td>
                                            <td>
                                                <span className={getStatusClass(task.statusKey)}>{translate(task.statusKey)}</span>
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
                                                <span>{task.token}</span>
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

                    <div className={style.sideGrid}>
                        <section className={style.card} aria-label={translate('dashboard.board.actions.title')}>
                            <header>
                                <h2>{translate('dashboard.board.actions.title')}</h2>
                                <span>{translate('dashboard.board.actions.subtitle')}</span>
                            </header>
                            <ul>
                                {ACTIONS.map((action) => (
                                    <li key={`${action.title}-${action.waiting}`}>
                                        <span className={getStatusClass(action.levelKey)}>{translate(action.levelKey)}</span>
                                        <div>
                                            <strong>{action.title}</strong>
                                            <span>{action.detail}</span>
                                            <small>{translate('dashboard.board.actions.waiting', { time: action.waiting })}</small>
                                        </div>
                                        <Link className={style.rowAction} to={action.to}>
                                            {translate(action.actionKey)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className={style.card} aria-label={translate('dashboard.board.resources.title')}>
                            <header>
                                <h2>{translate('dashboard.board.resources.title')}</h2>
                                <span>{translate('dashboard.board.resources.subtitle')}</span>
                            </header>
                            <ul className={style.resourceList}>
                                {RESOURCES.map((resource) => (
                                    <li key={resource.labelKey}>
                                        <strong>{translate(resource.labelKey)}</strong>
                                        <span>{translate(resource.noteKey)}</span>
                                        <b>{resource.available}</b>
                                        <span className={getStatusClass(resource.statusKey)}>{translate(resource.statusKey)}</span>
                                    </li>
                                ))}
                            </ul>
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
                </div>

                <div className={style.lowerGrid}>
                    <section className={style.card} aria-label={translate('dashboard.board.result.title')}>
                        <header>
                            <h2>{translate('dashboard.board.result.title')}</h2>
                            <span>{translate('dashboard.board.result.subtitle')}</span>
                        </header>
                        <dl className={style.summaryList}>
                            <div>
                                <dt>{translate('dashboard.board.result.objects')}</dt>
                                <dd>Agent A v2 / Agent A v1</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.board.result.conditions')}</dt>
                                <dd>ExploitGym v1.3 · 50 样本 · 同预算</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.board.result.metric')}</dt>
                                <dd>发现率 68% → 76%</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.board.result.cost')}</dt>
                                <dd>+8.6% · 可接受</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.board.result.conclusion')}</dt>
                                <dd>场景性提升，建议继续复测</dd>
                            </div>
                        </dl>
                    </section>

                    <section className={style.card} aria-label={translate('dashboard.board.reports.title')}>
                        <header>
                            <h2>{translate('dashboard.board.reports.title')}</h2>
                            <span>{translate('dashboard.board.reports.subtitle')}</span>
                        </header>
                        <ul className={style.reportList}>
                            <li>
                                <span className={style.statusCompleted}>{translate('dashboard.board.status.completed')}</span>
                                <div>
                                    <strong>R-2026-0091</strong>
                                    <span>RUN-1021 · 生成于 09:30</span>
                                </div>
                                <Link className={style.rowAction} to="/tasks?type=code">
                                    {translate('dashboard.board.reports.view')}
                                </Link>
                            </li>
                            <li>
                                <span className={style.statusRunning}>{translate('dashboard.board.status.generating')}</span>
                                <div>
                                    <strong>R-2026-0092</strong>
                                    <span>RUN-1017 · 预计 10m</span>
                                </div>
                                <span className={style.waitingText}>{translate('dashboard.board.reports.waiting')}</span>
                            </li>
                        </ul>
                    </section>

                    <section className={style.card} aria-label={translate('dashboard.board.data.title')}>
                        <header>
                            <h2>{translate('dashboard.board.data.title')}</h2>
                            <span>{translate('dashboard.board.data.subtitle')}</span>
                        </header>
                        <dl className={style.summaryList}>
                            <div>
                                <dt>{translate('dashboard.board.data.version')}</dt>
                                <dd>DS-2026-09-18</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.board.data.samples')}</dt>
                                <dd>已确认 1,240 / 1,500</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.board.data.usage')}</dt>
                                <dd>2 个模型实验引用</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.board.data.feedback')}</dt>
                                <dd>{translate('dashboard.board.data.pendingFeedback')}</dd>
                            </div>
                        </dl>
                    </section>
                </div>
            </div>
        </main>
    );
};

export default DashboardBoard;
