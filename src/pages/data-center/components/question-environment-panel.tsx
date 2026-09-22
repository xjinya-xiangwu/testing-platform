import { useState } from 'react';
import type { PrecheckJob } from '@/api/question-bank';
import { useCancelPrecheck, useQuestionBankSnapshot, useStartPrecheck } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { ProgressBar, StatusBadge } from '@/pages/data-center/components/question-bank-shared';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

const imageTone = (status: string): 'ready' | 'danger' | 'pending' => (status === 'verified' ? 'ready' : status === 'missing' || status === 'drift' ? 'danger' : 'pending');

interface EnvironmentPanelProps {
    translate: Translate;
    isAdmin: boolean;
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

const QuestionEnvironmentPanel = ({ translate, isAdmin, snapshot }: EnvironmentPanelProps) => {
    const [precheckVersionId, setPrecheckVersionId] = useState<string | null>(null);
    const [concurrency, setConcurrency] = useState(16);

    const startMutation = useStartPrecheck();
    const cancelMutation = useCancelPrecheck();

    const versions = snapshot?.versions ?? [];
    const sets = snapshot?.sets ?? [];
    const images = snapshot?.images ?? [];
    const templates = snapshot?.templates ?? [];
    const graders = snapshot?.graders ?? [];
    const precheckJobs = snapshot?.precheckJobs ?? [];
    const setById = new Map(sets.map((set) => [set.id, set]));

    const targetVersionId = precheckVersionId ?? versions.find((version) => version.lifecycle !== 'retired')?.id ?? null;
    const latestJob: PrecheckJob | null = precheckJobs[0] ?? null;

    const capacity = { available: 1216, warming: 148, occupied: 264, abnormal: 12 };

    return (
        <div className={style.qbPanel}>
            <header className={style.qbSectionHeader}>
                <div>
                    <h3>{translate('questionBank.env.title')}</h3>
                    <p>{translate('questionBank.env.hint')}</p>
                </div>
            </header>

            <div className={style.qbSplit}>
                <section className={style.qbCard}>
                    <header>
                        <h4>{translate('questionBank.env.images')}</h4>
                        <span>{images.length}</span>
                    </header>
                    <table className={style.qbTable}>
                        <thead>
                            <tr>
                                <th>{translate('questionBank.env.images.columns.repo')}</th>
                                <th>{translate('questionBank.env.images.columns.digest')}</th>
                                <th>{translate('questionBank.env.images.columns.size')}</th>
                                <th>{translate('questionBank.env.images.columns.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {images.map((image) => (
                                <tr key={image.id}>
                                    <td>
                                        {image.repo}
                                        <small>{image.registry}</small>
                                    </td>
                                    <td>
                                        <code>{image.digest}</code>
                                    </td>
                                    <td>{image.sizeMb.toLocaleString()} MB</td>
                                    <td>
                                        <StatusBadge tone={imageTone(image.status)}>{translate(`questionBank.env.imageStatus.${image.status}`)}</StatusBadge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <section className={style.qbCard}>
                    <header>
                        <h4>{translate('questionBank.env.templates')}</h4>
                        <span>{templates.length}</span>
                    </header>
                    <table className={style.qbTable}>
                        <thead>
                            <tr>
                                <th>{translate('questionBank.env.templates.columns.name')}</th>
                                <th>{translate('questionBank.env.templates.columns.version')}</th>
                                <th>{translate('questionBank.env.templates.columns.services')}</th>
                                <th>{translate('questionBank.env.templates.columns.toolset')}</th>
                                <th>{translate('questionBank.env.templates.columns.network')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((template) => (
                                <tr key={template.id}>
                                    <td>{template.name}</td>
                                    <td>
                                        <code>{template.version}</code>
                                    </td>
                                    <td>{template.services}</td>
                                    <td>{template.toolset}</td>
                                    <td>{template.networkZone}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>

            {isAdmin ? (
                <section className={style.qbCard} aria-label={translate('questionBank.env.pendingQueue.title')}>
                    <header>
                        <h4>{translate('questionBank.env.pendingQueue.title')}</h4>
                    </header>
                    <p className={style.qbHint}>{translate('questionBank.env.pendingQueue.hint')}</p>
                    {(() => {
                        // F-02 closure: drafts uploaded by projects or imports await admin
                        // verification here; one click starts their precheck.
                        const pending = versions.filter((version) => version.lifecycle !== 'published' && version.lifecycle !== 'retired' && !version.readiness.environmentReady);
                        if (pending.length === 0) return <p className={style.qbEmptyLine}>{translate('questionBank.env.pendingQueue.empty')}</p>;
                        return (
                            <div className={style.qbGateGrid}>
                                {pending.map((version) => (
                                    <div key={version.id} className={style.qbGateItem}>
                                        <div>
                                            <strong>{setById.get(version.setId)?.name ?? version.setId}</strong>
                                            <small>{version.releaseVersion}</small>
                                        </div>
                                        <StatusBadge tone="pending">{translate(`questionBank.catalog.lifecycle.${version.lifecycle}`)}</StatusBadge>
                                        <button type="button" className={style.qbGhostButton} disabled={latestJob?.status === 'running' || startMutation.isPending} onClick={() => void startMutation.mutateAsync({ versionId: version.id, concurrency })}>
                                            {translate('questionBank.env.precheck.start')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </section>
            ) : null}

            {isAdmin ? (
                <section className={style.qbCard} aria-label={translate('questionBank.env.precheck.title')}>
                    <header>
                        <h4>{translate('questionBank.env.precheck.title')}</h4>
                    </header>
                    <div className={style.qbToolbar}>
                        <select value={targetVersionId ?? ''} aria-label={translate('questionBank.env.precheck.version')} onChange={(event) => setPrecheckVersionId(event.target.value)}>
                            {versions
                                .filter((version) => version.lifecycle !== 'retired')
                                .map((version) => (
                                    <option key={version.id} value={version.id}>
                                        {setById.get(version.setId)?.name ?? version.setId} · {version.releaseVersion}
                                    </option>
                                ))}
                        </select>
                        <label className={style.qbInlineLabel}>
                            <span>{translate('questionBank.env.precheck.concurrency')}</span>
                            <input type="number" min={1} max={64} value={concurrency} onChange={(event) => setConcurrency(Math.max(1, Math.min(64, Number(event.target.value) || 1)))} />
                        </label>
                        <button type="button" className={style.qbPrimaryButton} disabled={startMutation.isPending || !targetVersionId || latestJob?.status === 'running'} onClick={() => targetVersionId && void startMutation.mutateAsync({ versionId: targetVersionId, concurrency })}>
                            {translate('questionBank.env.precheck.start')}
                        </button>
                    </div>
                    {latestJob ? (
                        <div className={style.qbPrecheckBox}>
                            <div className={style.qbPrecheckHead}>
                                <StatusBadge tone={latestJob.status === 'running' ? 'accent' : latestJob.status === 'passed' ? 'ready' : 'danger'}>
                                    {translate(`questionBank.transfer.import.status.${latestJob.status === 'running' ? 'running' : latestJob.status === 'passed' ? 'passed' : 'failed'}`)}
                                </StatusBadge>
                                <span>{translate('questionBank.env.precheck.progress', { processed: latestJob.processed, total: latestJob.total, pass: latestJob.passCount, fail: latestJob.failCount })}</span>
                                {latestJob.status === 'running' ? (
                                    <button type="button" className={style.qbDangerButton} onClick={() => void cancelMutation.mutateAsync(latestJob.id)}>
                                        {translate('questionBank.env.precheck.cancel')}
                                    </button>
                                ) : null}
                            </div>
                            <ProgressBar value={latestJob.total === 0 ? 0 : latestJob.processed / latestJob.total} tone={latestJob.status === 'failed' ? 'danger' : 'accent'} />
                            {latestJob.lastReasons.length > 0 ? (
                                <p className={style.qbHint}>
                                    {translate('questionBank.env.precheck.lastReasons')}：
                                    {latestJob.lastReasons.map((reason) => `${translate(`questionBank.sampling.preview.reason.${reason.reason}`)} ×${reason.count}`).join(' · ')}
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <p className={style.qbEmptyLine}>{translate('questionBank.env.precheck.none')}</p>
                    )}
                    <p className={style.qbHint}>{translate('questionBank.env.precheck.writeBack')}</p>
                </section>
            ) : null}

            <div className={style.qbSplit}>
                <section className={style.qbCard} aria-label={translate('questionBank.env.capacity.title')}>
                    <header>
                        <h4>{translate('questionBank.env.capacity.title')}</h4>
                    </header>
                    <div className={style.qbPreviewCounts}>
                        <div>
                            <span>{translate('questionBank.env.capacity.available')}</span>
                            <b>{capacity.available.toLocaleString()}</b>
                        </div>
                        <div>
                            <span>{translate('questionBank.env.capacity.warming')}</span>
                            <b>{capacity.warming}</b>
                        </div>
                        <div>
                            <span>{translate('questionBank.env.capacity.occupied')}</span>
                            <b>{capacity.occupied}</b>
                        </div>
                        <div>
                            <span>{translate('questionBank.env.capacity.abnormal')}</span>
                            <b>{capacity.abnormal}</b>
                        </div>
                    </div>
                    <p className={style.qbHint}>{translate('questionBank.env.capacity.note')}</p>
                    <p className={style.qbHint}>{translate('questionBank.env.capacity.demoNote')}</p>
                </section>

                <section className={style.qbCard} aria-label={translate('questionBank.env.matrix')}>
                    <header>
                        <h4>{translate('questionBank.env.matrix')}</h4>
                    </header>
                    <p className={style.qbHint}>{translate('questionBank.env.matrix.hint')}</p>
                    <table className={style.qbTable}>
                        <thead>
                            <tr>
                                <th>{translate('questionBank.catalog.title')}</th>
                                {graders.map((grader) => (
                                    <th key={grader.id}>{grader.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {versions.map((version) => (
                                <tr key={version.id}>
                                    <td>
                                        {setById.get(version.setId)?.name ?? version.setId}
                                        <small>{version.releaseVersion}</small>
                                    </td>
                                    {graders.map((grader) => {
                                        const compatible = grader.compatibleVersionIds.includes(version.id);
                                        return (
                                            <td key={grader.id}>
                                                <StatusBadge tone={compatible ? 'ready' : 'neutral'}>{compatible ? '✓' : '—'}</StatusBadge>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>

            <section className={style.qbCard} aria-label={translate('questionBank.env.graders')}>
                <header>
                    <h4>{translate('questionBank.env.graders')}</h4>
                    <span>{graders.length}</span>
                </header>
                <table className={style.qbTable}>
                    <thead>
                        <tr>
                            <th>{translate('questionBank.env.graders.columns.name')}</th>
                            <th>{translate('questionBank.env.graders.columns.kind')}</th>
                            <th>{translate('questionBank.env.graders.columns.version')}</th>
                            <th>{translate('questionBank.env.graders.columns.contract')}</th>
                            <th>{translate('questionBank.env.graders.columns.directions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {graders.map((grader) => (
                            <tr key={grader.id}>
                                <td>{grader.name}</td>
                                <td>{translate(`questionBank.env.graders.kind.${grader.kind}`)}</td>
                                <td>
                                    <code>{grader.version}</code>
                                </td>
                                <td>{grader.contract}</td>
                                <td>{grader.directions.map((direction) => translate(`questionBank.common.direction.${direction}`)).join(' / ')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default QuestionEnvironmentPanel;
