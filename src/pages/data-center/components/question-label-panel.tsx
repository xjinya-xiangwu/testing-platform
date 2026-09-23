import { useEffect, useMemo, useState } from 'react';
import type { QuestionBankSample, QuestionSetVersion, TargetDomain } from '@/api/question-bank';
import { domainGate, useApplySampleLabel, useConfirmLabelSuggestions, useDecideLabelCorrection, useQuestionBankSnapshot, useSuggestDomains, useVersionFacets, useVersionSamples } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { BarList, DOMAIN_ORDER, ProgressBar, StatusBadge, domainLabelKey, directionLabelKey } from '@/pages/data-center/components/question-bank-shared';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

const PAGE_SIZE = 30;

type SampleFilter = 'all' | 'unlabeled' | 'labeled';

interface LabelPanelProps {
    translate: Translate;
    isAdmin: boolean;
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

/**
 * Labeling workbench, modeled after standard annotation tools (Label Studio):
 * task queue on the left, the selected sample as the labeling canvas in the
 * middle, and the label picker with save/skip actions on the right. Coverage
 * gates and review-feedback corrections sit above the workbench.
 */
const QuestionLabelPanel = ({ translate, isAdmin, snapshot }: LabelPanelProps) => {
    const [targetVersionId, setTargetVersionId] = useState<string | null>(null);
    const [filter, setFilter] = useState<SampleFilter>('all');
    const [page, setPage] = useState(1);
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
    const [selectedDomain, setSelectedDomain] = useState<TargetDomain | null>(null);

    const suggestMutation = useSuggestDomains();
    const confirmMutation = useConfirmLabelSuggestions();
    const correctionMutation = useDecideLabelCorrection();
    const labelMutation = useApplySampleLabel();

    const versions = snapshot?.versions ?? [];
    const sets = snapshot?.sets ?? [];
    const workVersions = versions.filter((version) => version.lifecycle !== 'retired');
    const effectiveVersionId = targetVersionId ?? workVersions[0]?.id ?? null;
    const effectiveVersion = effectiveVersionId ? versions.find((version) => version.id === effectiveVersionId) ?? null : null;
    const editable = effectiveVersion !== null && effectiveVersion.lifecycle !== 'published';

    const gate = effectiveVersionId ? domainGate(effectiveVersionId) : { total: 0, labeled: 0, missing: 0, ratio: 1 };

    const samplesQuery = useVersionSamples(effectiveVersionId, { domainLabeled: filter === 'all' ? undefined : filter, page });
    const samples = useMemo(() => samplesQuery.data?.list ?? [], [samplesQuery.data]);
    const total = samplesQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const selectedSample: QuestionBankSample | null = useMemo(() => {
        if (selectedSampleId) {
            const direct = samples.find((sample) => sample.id === selectedSampleId);
            if (direct) return direct;
        }
        return samples[0] ?? null;
    }, [samples, selectedSampleId]);

    useEffect(() => {
        setSelectedDomain(selectedSample?.domain ?? null);
    }, [selectedSample?.id, selectedSample?.domain]);

    const facetsQuery = useVersionFacets(effectiveVersionId);
    const setById = new Map(sets.map((set) => [set.id, set]));

    const selectVersion = (versionId: string) => {
        setTargetVersionId(versionId);
        setPage(1);
        setSelectedSampleId(null);
    };

    const runSuggest = (versionId: string) => void suggestMutation.mutateAsync(versionId);
    const confirmPage = () => {
        if (!effectiveVersionId) return;
        const ids = samples.filter((sample) => sample.domain === null).map((sample) => sample.id);
        if (ids.length === 0) return;
        void confirmMutation.mutateAsync({ versionId: effectiveVersionId, sampleIds: ids });
    };

    const queueIndex = selectedSample ? samples.findIndex((sample) => sample.id === selectedSample.id) : -1;
    const gotoSample = (offset: number) => {
        const next = samples[queueIndex + offset];
        if (next) setSelectedSampleId(next.id);
    };
    const saveLabel = (domain: TargetDomain | null, advance: boolean) => {
        if (!effectiveVersionId || !selectedSample || !editable) return;
        void labelMutation.mutateAsync({ versionId: effectiveVersionId, sampleId: selectedSample.id, domain }).then(() => {
            if (advance) {
                const remaining = samples.slice(queueIndex + 1).find((sample) => sample.domain === null);
                setSelectedSampleId(remaining?.id ?? samples[queueIndex + 1]?.id ?? selectedSample.id);
            }
        });
    };

    const corrections = (snapshot?.labelCorrections ?? []).filter((correction) => correction.status === 'pending');

    const domainMeta: Record<TargetDomain, string> = {
        web_application: 'Web 应用 / API / 框架',
        userspace_software: '二进制 / 基础库 / CLI',
        browser_engine: 'Chrome / V8 / Wasm',
        operating_system: 'Linux / 驱动 / RTOS',
        cloud_infrastructure: 'Docker / runc / K8s',
        network_protocol: 'DNS / BIND / 协议解析',
        other: '无法归类，仅后台',
    };

    return (
        <div className={style.qbPanel}>
            <header className={style.qbSectionHeader}>
                <div>
                    <h3>{translate('questionBank.labels.title')}</h3>
                    <p>{translate('questionBank.labels.hint')}</p>
                </div>
            </header>

            {isAdmin ? (
                <section className={style.qbCard} aria-label={translate('questionBank.labels.corrections.title')}>
                    <header>
                        <h4>{translate('questionBank.labels.corrections.title')}</h4>
                        <span>{corrections.length}</span>
                    </header>
                    <p className={style.qbHint}>{translate('questionBank.labels.corrections.hint')}</p>
                    <table className={style.qbTable}>
                        <thead>
                            <tr>
                                <th>{translate('questionBank.labels.corrections.columns.sample')}</th>
                                <th>{translate('questionBank.labels.corrections.columns.version')}</th>
                                <th>{translate('questionBank.labels.corrections.columns.suggestion')}</th>
                                <th>{translate('questionBank.labels.corrections.columns.reason')}</th>
                                <th aria-label="actions" />
                            </tr>
                        </thead>
                        <tbody>
                            {corrections.map((correction) => (
                                <tr key={correction.id}>
                                    <td>
                                        <strong>{correction.sampleId}</strong>
                                        <small>{correction.source}</small>
                                    </td>
                                    <td>{setById.get(versions.find((version) => version.id === correction.versionId)?.setId ?? '')?.name ?? correction.versionId}</td>
                                    <td>
                                        <span className={style.qbSuggestion}>{translate(domainLabelKey(correction.suggestedDomain))}</span>
                                    </td>
                                    <td>{correction.reason}</td>
                                    <td>
                                        <div className={style.qbChipRow}>
                                            <button type="button" className={style.qbTextButton} disabled={correctionMutation.isPending} onClick={() => void correctionMutation.mutateAsync({ correctionId: correction.id, decision: 'applied' })}>
                                                {translate('questionBank.labels.corrections.adopt')}
                                            </button>
                                            <button type="button" className={style.qbTextButton} disabled={correctionMutation.isPending} onClick={() => void correctionMutation.mutateAsync({ correctionId: correction.id, decision: 'rejected' })}>
                                                {translate('questionBank.labels.corrections.reject')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {corrections.length === 0 ? <p className={style.qbEmptyLine}>{translate('questionBank.labels.corrections.empty')}</p> : null}
                </section>
            ) : null}

            {isAdmin ? (
                <section className={style.qbCard} aria-label={translate('questionBank.labels.workbench')}>
                    <header>
                        <h4>{translate('questionBank.labels.workbench')}</h4>
                        <div className={style.qbChipRow}>
                            {effectiveVersion ? <span>{setById.get(effectiveVersion.setId)?.name} · {effectiveVersion.releaseVersion}</span> : null}
                            <select value={effectiveVersionId ?? ''} aria-label={translate('questionBank.labels.workbench.version')} onChange={(event) => selectVersion(event.target.value)}>
                                {workVersions.map((version: QuestionSetVersion) => (
                                    <option key={version.id} value={version.id}>
                                        {setById.get(version.setId)?.name ?? version.setId} · {version.releaseVersion}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </header>
                    <div className={style.qbWorkbenchGate}>
                        <ProgressBar value={gate.ratio} tone={gate.missing === 0 ? 'ready' : 'danger'} />
                        <span>{translate('questionBank.labels.gate.coverage', { percent: (gate.ratio * 100).toFixed(1) })}</span>
                        <StatusBadge tone={gate.missing === 0 ? 'ready' : 'danger'}>{gate.missing === 0 ? translate('questionBank.labels.gate.opened') : translate('questionBank.labels.gate.blocked')}</StatusBadge>
                        <div className={style.qbChipRow}>
                            <button type="button" className={style.qbGhostButton} disabled={suggestMutation.isPending || gate.missing === 0} onClick={() => effectiveVersionId && runSuggest(effectiveVersionId)}>
                                {translate('questionBank.labels.workbench.suggestAll')}
                            </button>
                            <button type="button" className={style.qbGhostButton} disabled={confirmMutation.isPending || gate.missing === 0} onClick={confirmPage}>
                                {translate('questionBank.labels.workbench.confirmPage')}
                            </button>
                        </div>
                    </div>

                    <div className={style.qbWorkbenchGrid}>
                        <aside className={style.qbWorkbenchQueue} aria-label={translate('questionBank.workbench.queue')}>
                            <div className={style.qbChipRow}>
                                {(['all', 'unlabeled', 'labeled'] as const).map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={filter === value ? style.qbChipActive : style.qbChip}
                                        onClick={() => {
                                            setFilter(value);
                                            setPage(1);
                                            setSelectedSampleId(null);
                                        }}
                                    >
                                        {translate(value === 'all' ? 'questionBank.labels.workbench.viewAll' : value === 'unlabeled' ? 'questionBank.labels.workbench.viewUnlabeled' : 'questionBank.labels.workbench.viewLabeled')}
                                    </button>
                                ))}
                            </div>
                            <ul className={style.qbQueueList}>
                                {samples.map((sample) => (
                                    <li key={sample.id}>
                                        <button
                                            type="button"
                                            className={selectedSample?.id === sample.id ? style.qbQueueItemActive : style.qbQueueItem}
                                            onClick={() => setSelectedSampleId(sample.id)}
                                        >
                                            <i className={`${style.qbStatusDot} ${sample.domain ? style.qbDotLabeled : sample.suggestedDomain ? style.qbDotSuggested : style.qbDotUnlabeled}`} aria-hidden="true" />
                                            <span className={style.qbQueueName}>{sample.name}</span>
                                            <small>{sample.domain ? translate(domainLabelKey(sample.domain)) : sample.suggestedDomain ? translate(domainLabelKey(sample.suggestedDomain)) : sample.cwe}</small>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <footer className={style.qbWorkbenchPager}>
                                <button type="button" className={style.qbChip} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                                    {translate('questionBank.common.prev')}
                                </button>
                                <span className={style.qbCount}>{translate('questionBank.common.page', { page, total })}</span>
                                <button type="button" className={style.qbChip} disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                                    {translate('questionBank.common.next')}
                                </button>
                            </footer>
                        </aside>

                        <section className={style.qbWorkbenchCanvas} aria-label={translate('questionBank.workbench.canvas')}>
                            {selectedSample ? (
                                <>
                                    <header>
                                        <strong>{selectedSample.name}</strong>
                                        <StatusBadge tone={selectedSample.domain ? 'ready' : selectedSample.suggestedDomain ? 'accent' : 'pending'}>
                                            {selectedSample.domain ? translate(domainLabelKey(selectedSample.domain)) : selectedSample.suggestedDomain ? `${translate('questionBank.workbench.currentDomain')}: — · AI: ${translate(domainLabelKey(selectedSample.suggestedDomain))}` : translate('questionBank.labels.workbench.viewUnlabeled')}
                                        </StatusBadge>
                                    </header>
                                    <dl className={style.qbMetaGrid}>
                                        <div>
                                            <dt>dedup_key</dt>
                                            <dd>
                                                <code>{selectedSample.dedupKey}</code>
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>CWE</dt>
                                            <dd>{selectedSample.cwe}</dd>
                                        </div>
                                        <div>
                                            <dt>{translate('questionBank.labels.facets.language')}</dt>
                                            <dd>{selectedSample.language}</dd>
                                        </div>
                                        <div>
                                            <dt>{translate('questionBank.labels.facets.difficulty')}</dt>
                                            <dd>{selectedSample.difficulty}</dd>
                                        </div>
                                        <div>
                                            <dt>{translate('questionBank.catalog.directions')}</dt>
                                            <dd>{translate(directionLabelKey(selectedSample.direction))}</dd>
                                        </div>
                                        <div>
                                            <dt>{translate('questionBank.workbench.currentDomain')}</dt>
                                            <dd>{selectedSample.domain ? translate(domainLabelKey(selectedSample.domain)) : '—'}</dd>
                                        </div>
                                    </dl>
                                    {!editable ? <p className={style.qbDangerLine}>{translate('questionBank.workbench.readonlyNote')}</p> : null}
                                    <footer className={style.qbWorkbenchFooter}>
                                        <div className={style.qbChipRow}>
                                            <button type="button" className={style.qbChip} disabled={queueIndex <= 0} onClick={() => gotoSample(-1)}>
                                                {translate('questionBank.common.prev')}
                                            </button>
                                            <span className={style.qbCount}>{translate('questionBank.workbench.position', { current: queueIndex + 1, total: samples.length })}</span>
                                            <button type="button" className={style.qbChip} disabled={queueIndex >= samples.length - 1} onClick={() => gotoSample(1)}>
                                                {translate('questionBank.common.next')}
                                            </button>
                                        </div>
                                    </footer>
                                </>
                            ) : (
                                <p className={style.qbEmptyLine}>{translate('questionBank.labels.workbench.empty')}</p>
                            )}
                        </section>

                        <aside className={style.qbWorkbenchPanel} aria-label={translate('questionBank.workbench.labelPanel')}>
                            <h5>{translate('questionBank.workbench.labelPanel')}</h5>
                            <div className={style.qbDomainGrid}>
                                {DOMAIN_ORDER.map((domain) => (
                                    <button
                                        key={domain}
                                        type="button"
                                        disabled={!editable || !selectedSample}
                                        className={selectedDomain === domain ? style.qbDomainOptionActive : style.qbDomainOption}
                                        onClick={() => setSelectedDomain(domain)}
                                    >
                                        <strong>{translate(domainLabelKey(domain))}</strong>
                                        <small>{domainMeta[domain]}</small>
                                    </button>
                                ))}
                            </div>
                            <div className={style.qbWorkbenchActions}>
                                <button type="button" className={style.qbPrimaryButton} disabled={!editable || !selectedSample || !selectedDomain || labelMutation.isPending} onClick={() => saveLabel(selectedDomain, false)}>
                                    {translate('questionBank.workbench.save')}
                                </button>
                                <button type="button" className={style.qbPrimaryButton} disabled={!editable || !selectedSample || !selectedDomain || labelMutation.isPending} onClick={() => saveLabel(selectedDomain, true)}>
                                    {translate('questionBank.workbench.saveNext')}
                                </button>
                                <button type="button" className={style.qbGhostButton} disabled={!editable || !selectedSample || selectedSample?.domain === null || labelMutation.isPending} onClick={() => saveLabel(null, false)}>
                                    {translate('questionBank.workbench.clearLabel')}
                                </button>
                            </div>
                            <p className={style.qbHint}>{translate('questionBank.labels.workbench.auditNote')}</p>
                        </aside>
                    </div>
                </section>
            ) : (
                <section className={style.qbCard}>
                    <header>
                        <h4>{translate('questionBank.labels.projectTags')}</h4>
                    </header>
                    <p className={style.qbHint}>{translate('questionBank.labels.projectTags.hint')}</p>
                </section>
            )}

            {isAdmin && effectiveVersionId ? (
                <section className={style.qbCard} aria-label={translate('questionBank.labels.facets.title')}>
                    <header>
                        <h4>{translate('questionBank.labels.facets.title')}</h4>
                        {effectiveVersion ? <span>{setById.get(effectiveVersion.setId)?.name}</span> : null}
                    </header>
                    <p className={style.qbHint}>{translate('questionBank.labels.facets.hint')}</p>
                    <div className={style.qbSplit}>
                        <div>
                            <p className={style.qbCardCaption}>{translate('questionBank.labels.facets.cwe')}</p>
                            <BarList items={(facetsQuery.data?.cwe ?? []).map((facet) => ({ label: facet.key, value: facet.count }))} />
                        </div>
                        <div>
                            <p className={style.qbCardCaption}>{translate('questionBank.labels.facets.language')}</p>
                            <BarList items={(facetsQuery.data?.language ?? []).map((facet) => ({ label: facet.key, value: facet.count }))} />
                        </div>
                        <div>
                            <p className={style.qbCardCaption}>{translate('questionBank.labels.facets.difficulty')}</p>
                            <BarList items={(facetsQuery.data?.difficulty ?? []).map((facet) => ({ label: facet.key, value: facet.count }))} />
                        </div>
                    </div>
                </section>
            ) : null}
        </div>
    );
};

export default QuestionLabelPanel;
