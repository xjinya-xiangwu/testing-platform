import { useState } from 'react';
import classNames from 'classnames';
import { Link, useSearchParams } from 'react-router-dom';
import type { MilestoneStatus } from '@/api/job-detail';
import { isRangeTopology } from '@/api/range';
import IconFont from '@/components/icon-font/icon-font';
import useTranslate from '@/hooks/useTranslate';
import WorkbenchTopology from '@/pages/workbench/components/workbench-topology';
import { useJobAction, useJobDetail } from '@/pages/workbench/hooks/use-job-detail';
import style from '@/pages/workbench/workbench.module.less';

const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':');
};

const getMilestoneClassName = (status: MilestoneStatus) => classNames(status === 'VERIFIED' && style.isCompleted, status === 'OBSERVED' && style.isObserved, status === 'CANDIDATE' && style.isRunning);

const RISK_LEVEL_LOCALE_KEYS: Readonly<Record<string, string>> = {
    CRITICAL: 'workbench.riskChecks.level.critical',
    HIGH: 'workbench.riskChecks.level.high',
    LOW: 'workbench.riskChecks.level.low',
    MEDIUM: 'workbench.riskChecks.level.medium',
};

const RISK_STATUS_LOCALE_KEYS: Readonly<Record<string, string>> = {
    DETECTED: 'workbench.riskChecks.status.detected',
    FAIL: 'workbench.riskChecks.status.failed',
    FAILED: 'workbench.riskChecks.status.failed',
    NOT_DETECTED: 'workbench.riskChecks.status.notDetected',
    PARTIAL: 'workbench.riskChecks.status.partial',
    PASS: 'workbench.riskChecks.status.passed',
    PASSED: 'workbench.riskChecks.status.passed',
    PENDING: 'workbench.riskChecks.status.pending',
    RUNNING: 'workbench.riskChecks.status.running',
    UNKNOWN: 'workbench.riskChecks.status.unknown',
    VERIFIED: 'workbench.riskChecks.status.passed',
};

const Workbench = () => {
    const translate = useTranslate();
    const [params] = useSearchParams();
    const [activeWorkspace, setActiveWorkspace] = useState('terminal');
    const [dismissedSettlementJobId, setDismissedSettlementJobId] = useState<string>();
    const jobId = params.get('job');
    const { data, error, isLoading, refetch } = useJobDetail(jobId);
    const jobAction = useJobAction(jobId ?? '');

    if (!jobId) {
        return (
            <main className={style.empty}>
                <div>
                    <h1>{translate('workbench.empty.title')}</h1>
                    <p>{translate('workbench.empty.description')}</p>
                    <Link className={style.primaryButton} to="/tasks">
                        {translate('workbench.empty.action')}
                    </Link>
                </div>
            </main>
        );
    }

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

    const topology = isRangeTopology(data.topology) ? data.topology : undefined;
    const milestoneEntries = [...data.milestones.items].sort((left, right) => left.ordinal - right.ordinal).map((item, index) => ({ item, displayId: `M${index + 1}` }));
    const candidateMilestoneIndex = milestoneEntries.findIndex(({ item }) => item.status === 'CANDIDATE');
    const latestReachedIndex = milestoneEntries.findIndex(({ item }) => item.id === data.milestones.latest_reached);
    const activeMilestoneIndex = candidateMilestoneIndex >= 0 ? candidateMilestoneIndex : latestReachedIndex;
    const activeMilestone = activeMilestoneIndex >= 0 ? milestoneEntries[activeMilestoneIndex] : undefined;
    const workspaceFiles = data.workspace_files ?? [];
    const visibleWorkspace = activeWorkspace === 'terminal' && !data.console ? workspaceFiles[0]?.name : activeWorkspace;
    const activeFile = workspaceFiles.find((file) => file.name === visibleWorkspace);
    const currentGroup = activeMilestone?.displayId ?? '-';
    let fallbackMilestoneStatus: MilestoneStatus = 'PENDING';
    if (data.milestones.completed > 0) fallbackMilestoneStatus = 'OBSERVED';
    if (data.top_info.status === 'RUNNING') fallbackMilestoneStatus = 'CANDIDATE';
    if (data.milestones.total > 0 && data.milestones.verified === data.milestones.total) fallbackMilestoneStatus = 'VERIFIED';
    const milestoneStatus = translate(`workbench.status.${(activeMilestone?.item.status ?? fallbackMilestoneStatus).toLowerCase()}`);
    const lastMilestoneId = milestoneEntries.at(-1)?.displayId ?? 'M1';
    const milestoneTreeTitle = translate('workbench.sections.milestones', { start: milestoneEntries[0]?.displayId ?? 'M1', end: lastMilestoneId });
    const hasWorkspace = Boolean(data.console || workspaceFiles.length > 0);
    const isCodeEvaluation = data.top_info.job_type === 'CODE_EVAL';
    const workAreaLabel = translate(isCodeEvaluation ? 'workbench.sections.riskCheckPanel' : 'workbench.sections.topologyRegion');
    return (
        <main className={style.workbenchPage} data-testid="workbench-page" data-layout="reference-workbench">
            <Link className={style.backLink} to="/tasks">
                {translate('workbench.actions.backTasks')}
            </Link>

            <header className={style.header}>
                <div className={style.taskIdentity}>
                    <h1>{data.top_info.name}</h1>
                    {data.top_info.subtitle ? <p>{data.top_info.subtitle}</p> : null}
                </div>
                <div className={style.tags}>
                    {data.top_info.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                    ))}
                </div>
                <dl className={style.headerMetrics}>
                    {data.runtime_status ? (
                        <div>
                            <dd>{formatElapsed(data.runtime_status.elapsed_sec)}</dd>
                            <dt>{translate('workbench.metrics.elapsed')}</dt>
                        </div>
                    ) : null}
                    <div>
                        <dd>
                            {data.milestones.completed}/{data.milestones.total}
                        </dd>
                        <dt>{translate('workbench.metrics.progress')}</dt>
                    </div>
                    <div>
                        <dd>
                            {data.milestones.verified}/{data.milestones.total}
                        </dd>
                        <dt>{translate('workbench.metrics.verified')}</dt>
                    </div>
                </dl>
                <div className={style.actions}>
                    {data.top_info.available_actions.includes('PAUSE') ? (
                        <button type="button" disabled={jobAction.isPending} onClick={() => jobAction.mutate('PAUSE')}>
                            {translate('workbench.actions.pause')}
                        </button>
                    ) : null}
                    {data.top_info.available_actions.includes('RESUME') ? (
                        <button type="button" disabled={jobAction.isPending} onClick={() => jobAction.mutate('RESUME')}>
                            {translate('workbench.actions.resume')}
                        </button>
                    ) : null}
                    {data.top_info.available_actions.includes('TERMINATE') ? (
                        <button className={style.dangerButton} type="button" disabled={jobAction.isPending} onClick={() => jobAction.mutate('TERMINATE')}>
                            {translate('workbench.actions.end')}
                        </button>
                    ) : null}
                </div>
            </header>

            <p className={style.executionNotice}>
                {translate('workbench.executionNotice', {
                    agent: data.top_info.agent_id,
                    mode: translate(`workbench.interaction.${data.top_info.interaction_mode.toLowerCase()}`),
                })}
            </p>

            <section className={style.attackChain} role="region" aria-label={translate('workbench.sections.attackChain')}>
                <div className={style.sectionHeading}>
                    <div className={style.headingCopy}>
                        <h2>{translate('workbench.attackChain.title', { group: currentGroup, status: milestoneStatus })}</h2>
                        <span>
                            {translate('workbench.attackChain.progress', {
                                completed: data.milestones.completed,
                                total: data.milestones.total,
                                verified: data.milestones.verified,
                            })}
                        </span>
                    </div>
                    <span>{translate('workbench.attackChain.alignment')}</span>
                </div>
                <ol>
                    {milestoneEntries.map(({ displayId, item }) => (
                        <li key={item.id} className={getMilestoneClassName(item.status)}>
                            <strong>{displayId}</strong>
                            <span>{item.id}</span>
                            <small className={style.milestoneState} aria-label={translate(`workbench.status.${item.status.toLowerCase()}`)}>
                                {item.status === 'VERIFIED' ? <IconFont type="icon-status-completed" aria-hidden="true" /> : null}
                                {item.status === 'CANDIDATE' ? <IconFont type="icon-status-running" aria-hidden="true" /> : null}
                                {item.status !== 'VERIFIED' ? <span>{translate(`workbench.status.${item.status.toLowerCase()}`)}</span> : null}
                            </small>
                        </li>
                    ))}
                </ol>
            </section>

            <div className={classNames(style.mainGrid, isCodeEvaluation && style.codeEvaluationGrid)} data-testid="workbench-main-grid">
                <aside className={classNames(style.panel, style.milestonePanel)} role="region" aria-label={milestoneTreeTitle}>
                    <div className={style.sectionHeading}>
                        <h2>{milestoneTreeTitle}</h2>
                        <span>
                            {data.milestones.completed}/{data.milestones.total}
                        </span>
                    </div>
                    <ul className={style.milestones}>
                        {milestoneEntries.map(({ displayId, item }) => (
                            <li key={item.id} className={getMilestoneClassName(item.status)}>
                                <div>
                                    <strong>
                                        <span className={style.milestoneId}>{displayId}</span> · {item.id}
                                    </strong>
                                    <span>{item.service}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </aside>

                <section className={classNames(style.liveWorkspace, isCodeEvaluation && style.codeEvaluationWorkspace)} role="region" aria-label={translate('workbench.sections.liveWorkspace')}>
                    <section className={classNames(style.panel, style.topologyPanel, isCodeEvaluation && style.riskPanel)} role="region" aria-label={workAreaLabel}>
                        <div className={style.sectionHeading}>
                            <h2>{translate(isCodeEvaluation ? 'workbench.sections.riskCheckPanel' : 'workbench.sections.topology')}</h2>
                            {isCodeEvaluation ? (
                                <span>{translate('workbench.riskChecks.count', { count: data.risk_checks.length })}</span>
                            ) : data.environment ? (
                                <span>{data.environment.target_subnet}</span>
                            ) : null}
                        </div>
                        {!isCodeEvaluation && topology ? (
                            <>
                                <WorkbenchTopology environmentName={data.top_info.name} topology={topology} />
                                <div className={style.legend}>
                                    <span>{translate('workbench.topology.unreached')}</span>
                                    <span>{translate('workbench.topology.attacking')}</span>
                                    <span>{translate('workbench.topology.compromised')}</span>
                                    <span>{translate('workbench.topology.detected')}</span>
                                </div>
                            </>
                        ) : (
                            <ul className={style.riskChecks}>
                                {data.risk_checks.map((item) => {
                                    const normalizedLevel = item.level.trim().toUpperCase();
                                    const normalizedStatus = item.status.trim().toUpperCase();
                                    const result = item.verdict?.trim() || item.status;
                                    const normalizedResult = result.trim().toUpperCase();
                                    const levelLocaleKey = RISK_LEVEL_LOCALE_KEYS[normalizedLevel];
                                    const statusLocaleKey = RISK_STATUS_LOCALE_KEYS[normalizedResult];
                                    return (
                                        <li key={item.name} data-level={normalizedLevel.toLowerCase()} data-status={(normalizedResult || normalizedStatus).toLowerCase()}>
                                            <span className={style.riskLevel}>{levelLocaleKey ? translate(levelLocaleKey) : item.level}</span>
                                            <strong className={style.riskName}>{item.name}</strong>
                                            <span className={style.riskVerdict}>{statusLocaleKey ? translate(statusLocaleKey) : result}</span>
                                        </li>
                                    );
                                })}
                                {data.risk_checks.length === 0 ? <li className={style.riskChecksEmpty}>{translate('workbench.riskChecks.empty')}</li> : null}
                            </ul>
                        )}
                    </section>

                    {hasWorkspace ? (
                        <section className={classNames(style.panel, style.terminalPanel)}>
                            <div className={style.fileTabs} role="tablist" aria-label={translate('workbench.sections.workspaceFiles')}>
                                {data.console ? (
                                    <button type="button" role="tab" aria-selected={activeWorkspace === 'terminal'} onClick={() => setActiveWorkspace('terminal')}>
                                        {translate('workbench.tabs.terminal')}
                                    </button>
                                ) : null}
                                {workspaceFiles.map((file) => (
                                    <button key={file.name} type="button" role="tab" aria-selected={visibleWorkspace === file.name} onClick={() => setActiveWorkspace(file.name)}>
                                        {file.name}
                                    </button>
                                ))}
                            </div>
                            {visibleWorkspace === 'terminal' && data.console ? (
                                <div className={style.console} role="log" aria-label={translate('workbench.sections.terminal')} aria-live="polite">
                                    {data.console.entries.map((entry, index) => (
                                        <p key={`${entry.kind}-${index}`}>
                                            <span>[{entry.kind}]</span> {entry.content}
                                        </p>
                                    ))}
                                    {data.console.prompt ? <p className={style.prompt}>{data.console.prompt}</p> : null}
                                </div>
                            ) : (
                                <pre className={style.fileContent}>{activeFile?.content}</pre>
                            )}
                        </section>
                    ) : null}
                </section>

                <aside className={classNames(style.panel, style.contextPanel)} role="region" aria-label={translate('workbench.sections.taskContext')}>
                    {data.environment ? (
                        <>
                            <h2>{translate('workbench.sections.environment')}</h2>
                            <dl className={style.environmentDetails}>
                                <dt>{translate('workbench.fields.targetSubnet')}</dt>
                                <dd>{data.environment.target_subnet}</dd>
                                <dt>{translate('workbench.fields.cve')}</dt>
                                <dd>{data.environment.cve}</dd>
                                <dt>{translate('workbench.fields.cvss')}</dt>
                                <dd>{data.environment.cvss}</dd>
                                <dt>{translate('workbench.fields.network')}</dt>
                                <dd>{data.environment.network_environment}</dd>
                                <dt>{translate('workbench.fields.environment')}</dt>
                                <dd>{data.environment.environment_task}</dd>
                            </dl>
                        </>
                    ) : null}
                    <h2>{translate('workbench.sections.current')}</h2>
                    <div className={style.currentStep}>
                        <p>
                            {data.current_step
                                ? translate('workbench.currentStepProgress', { current: data.current_step.sequence, total: data.current_step.total })
                                : translate(`workbench.status.${data.top_info.status.toLowerCase()}`)}
                        </p>
                        <strong>{data.current_step?.service}</strong>
                    </div>
                    <div className={style.observationSection}>
                        <h2>{translate('workbench.sections.observations')}</h2>
                        <ul className={style.observations}>
                            {data.observations.map((item, index) => (
                                <li key={`${item.type}-${item.occurred_at}-${index}`}>
                                    <strong>{item.type}</strong>
                                    <span>{item.summary}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <h2>{translate('workbench.sections.tools')}</h2>
                    <div className={style.tools}>
                        {data.available_tools.map((tool) => (
                            <span key={tool}>{tool}</span>
                        ))}
                    </div>
                </aside>
            </div>

            {data.settlement && dismissedSettlementJobId !== jobId ? (
                <div className={style.dialog} role="dialog" aria-modal="true" aria-label={translate('workbench.settlement.title')}>
                    <div className={style.dialogHeader}>
                        <h2>{translate('workbench.settlement.title')}</h2>
                        <button type="button" className={style.dialogClose} aria-label={translate('common.close')} title={translate('common.close')} onClick={() => setDismissedSettlementJobId(jobId)}>
                            <span aria-hidden="true">×</span>
                        </button>
                    </div>
                    <p>{data.settlement.verdict}</p>
                    <dl className={style.detailList}>
                        <dt>{translate('workbench.metrics.progress')}</dt>
                        <dd>
                            {data.milestones.completed}/{data.milestones.total}
                        </dd>
                        {data.runtime_status ? (
                            <>
                                <dt>{translate('workbench.metrics.elapsed')}</dt>
                                <dd>{formatElapsed(data.runtime_status.elapsed_sec)}</dd>
                            </>
                        ) : null}
                    </dl>
                    <Link className={style.primaryButton} to="/tasks">
                        {translate('workbench.actions.backTasks')}
                    </Link>
                </div>
            ) : null}
        </main>
    );
};

export default Workbench;
