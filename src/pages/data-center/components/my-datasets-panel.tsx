import type { QuestionSet, QuestionSetVersion } from '@/api/question-bank';
import { useQuestionBankSnapshot, useStartImportJob } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { StatusBadge, directionLabelKey } from '@/pages/data-center/components/question-bank-shared';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

type ImportStage = 'structure' | 'content' | 'security' | 'dryrun';
const IMPORT_STAGES: ImportStage[] = ['structure', 'content', 'security', 'dryrun'];

const importTone = (status: string): 'ready' | 'danger' | 'accent' => (status === 'passed' ? 'ready' : status === 'failed' ? 'danger' : 'accent');

const lifecycleTone = (lifecycle: QuestionSetVersion['lifecycle']): 'ready' | 'neutral' | 'accent' | 'pending' => (lifecycle === 'published' ? 'ready' : lifecycle === 'retired' ? 'neutral' : lifecycle === 'verified' ? 'accent' : 'pending');

interface MyDatasetsPanelProps {
    translate: Translate;
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

const MyDatasetsPanel = ({ translate, snapshot }: MyDatasetsPanelProps) => {
    const importMutation = useStartImportJob();

    const sets = snapshot?.sets ?? [];
    const versions = snapshot?.versions ?? [];
    const importJobs = (snapshot?.importJobs ?? []).filter((job) => job.owner === 'project');

    // Project datasets: sets scoped to the vendor project (seeded + uploaded), with their latest version.
    const projectSets = sets.filter((set) => set.ownerProjectId === 'proj-vendor-a');
    const rows = projectSets.map((set: QuestionSet) => {
        const setVersions = versions.filter((version) => version.setId === set.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { set, latest: setVersions[0] ?? null, versionCount: setVersions.length };
    });

    const runUpload = (clean: boolean) =>
        void importMutation.mutateAsync({
            fileName: clean ? `vendor-a-${Date.now() % 10000}-clean.tar.zst` : `vendor-a-${Date.now() % 10000}.tar.zst`,
            sizeMb: clean ? 480 : 720,
            owner: 'project',
        });

    return (
        <div className={style.qbPanel}>
            <header className={style.qbSectionHeader}>
                <div>
                    <h3>{translate('questionBank.myDatasets.title')}</h3>
                    <p>{translate('questionBank.myDatasets.hint')}</p>
                </div>
                <div className={style.qbChipRow}>
                    <button type="button" className={style.qbChip} disabled={importMutation.isPending} onClick={() => runUpload(false)}>
                        {translate('questionBank.myDatasets.upload')}
                    </button>
                    <button type="button" className={style.qbChip} disabled={importMutation.isPending} onClick={() => runUpload(true)}>
                        {translate('questionBank.myDatasets.uploadClean')}
                    </button>
                </div>
            </header>

            <section className={style.qbCard}>
                <table className={style.qbTable}>
                    <thead>
                        <tr>
                            <th>{translate('questionBank.myDatasets.columns.name')}</th>
                            <th>{translate('questionBank.myDatasets.columns.version')}</th>
                            <th>{translate('questionBank.myDatasets.columns.tasks')}</th>
                            <th>{translate('questionBank.myDatasets.columns.readiness')}</th>
                            <th>{translate('questionBank.myDatasets.columns.scope')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ set, latest, versionCount }) => (
                            <tr key={set.id}>
                                <td>
                                    <strong>{set.name}</strong>
                                    <small>{set.directions.map((direction) => translate(directionLabelKey(direction))).join(' / ')}</small>
                                </td>
                                <td>
                                    {latest ? (
                                        <>
                                            {latest.releaseVersion}
                                            <small>{versionCount} 个版本</small>
                                        </>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td>{latest ? latest.counts.fullTaskCount.toLocaleString() : '—'}</td>
                                <td>
                                    {latest ? (
                                        <div className={style.qbReadinessRow}>
                                            {(['data', 'env', 'grader'] as const).map((key) => {
                                                const ready = key === 'data' ? latest.readiness.dataReady : key === 'env' ? latest.readiness.environmentReady : latest.readiness.graderReady;
                                                return (
                                                    <StatusBadge key={key} tone={ready ? 'ready' : 'pending'}>
                                                        {translate(`questionBank.catalog.readiness.${key}`)}: {ready ? '✓' : '…'}
                                                    </StatusBadge>
                                                );
                                            })}
                                            <StatusBadge tone={lifecycleTone(latest.lifecycle)}>{translate(`questionBank.catalog.lifecycle.${latest.lifecycle}`)}</StatusBadge>
                                            {latest.lifecycle !== 'published' ? <small className={style.qbDangerInline}>{translate('questionBank.myDatasets.verificationPending')}</small> : null}
                                        </div>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td>{latest?.license ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 ? <p className={style.qbEmptyLine}>{translate('questionBank.myDatasets.empty')}</p> : null}
                <p className={style.qbHint}>{translate('questionBank.myDatasets.isolationNote')}</p>
            </section>

            <section className={style.qbCard} aria-label={translate('questionBank.myDatasets.jobs')}>
                <header>
                    <h4>{translate('questionBank.myDatasets.jobs')}</h4>
                    <span>{importJobs.length}</span>
                </header>
                <table className={style.qbTable}>
                    <thead>
                        <tr>
                            <th>{translate('questionBank.transfer.import.columns.file')}</th>
                            <th>{translate('questionBank.transfer.import.columns.size')}</th>
                            <th>{translate('questionBank.transfer.import.columns.stages')}</th>
                            <th>{translate('questionBank.transfer.import.columns.status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {importJobs.map((job) => (
                            <tr key={job.id}>
                                <td>
                                    <strong>{job.fileName}</strong>
                                    {job.createdVersionId ? <small className={style.qbSuccessInline}>{translate('questionBank.myDatasets.createdVersion')}</small> : null}
                                    {IMPORT_STAGES.flatMap((stage) =>
                                        job.stageIssues[stage].map((issue, index) => (
                                            <small key={`${stage}-${index}`} className={style.qbDangerInline}>
                                                {translate(`questionBank.transfer.import.stage.${stage}`)} · {translate('questionBank.transfer.import.issueLine', { file: issue.file, line: issue.line })} · {issue.message}
                                            </small>
                                        )),
                                    )}
                                </td>
                                <td>{job.sizeMb.toLocaleString()} MB</td>
                                <td>
                                    <div className={style.qbStageRow}>
                                        {IMPORT_STAGES.map((stage, index) => (
                                            <span
                                                key={stage}
                                                className={job.completedStage > index || job.status === 'passed' ? style.qbStageDone : job.completedStage === index && job.status === 'running' ? style.qbStageActive : style.qbStageTodo}
                                                title={translate(`questionBank.transfer.import.stage.${stage}`)}
                                            >
                                                {index + 1}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <StatusBadge tone={importTone(job.status)}>{translate(`questionBank.transfer.import.status.${job.status}`)}</StatusBadge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {importJobs.length === 0 ? <p className={style.qbEmptyLine}>{translate('questionBank.myDatasets.empty')}</p> : null}
            </section>

            <section className={style.qbCard} aria-label={translate('questionBank.myDatasets.projectTags')}>
                <header>
                    <h4>{translate('questionBank.myDatasets.projectTags')}</h4>
                </header>
                <div className={style.qbChipRow}>
                    <span className={style.qbChipStatic}>内部工具链</span>
                    <span className={style.qbChipStatic}>回归集-v2</span>
                    <span className={style.qbChipStatic}>重点客户交付</span>
                </div>
                <p className={style.qbHint}>{translate('questionBank.myDatasets.projectTagsHint')}</p>
            </section>
        </div>
    );
};

export default MyDatasetsPanel;
