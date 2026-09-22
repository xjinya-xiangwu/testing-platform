import { useState } from 'react';
import type { QuestionBankSample, QuestionSetVersion } from '@/api/question-bank';
import { domainGate, useConfirmLabelSuggestions, useDecideLabelCorrection, useQuestionBankSnapshot, useSuggestDomains, useVersionFacets, useVersionSamples } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { BarList, DOMAIN_ORDER, DIRECTION_ORDER, ProgressBar, StatusBadge, domainLabelKey, directionLabelKey } from '@/pages/data-center/components/question-bank-shared';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

const PAGE_SIZE = 12;

type SampleFilter = 'all' | 'unlabeled' | 'labeled';

interface LabelPanelProps {
    translate: Translate;
    isAdmin: boolean;
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

const QuestionLabelPanel = ({ translate, isAdmin, snapshot }: LabelPanelProps) => {
    const [targetVersionId, setTargetVersionId] = useState<string | null>(null);
    const [filter, setFilter] = useState<SampleFilter>('all');
    const [page, setPage] = useState(1);

    const suggestMutation = useSuggestDomains();
    const confirmMutation = useConfirmLabelSuggestions();
    const correctionMutation = useDecideLabelCorrection();

    const versions = snapshot?.versions ?? [];
    const sets = snapshot?.sets ?? [];
    const corrections = (snapshot?.labelCorrections ?? []).filter((correction) => correction.status === 'pending');
    const workVersions = versions.filter((version) => version.lifecycle !== 'retired');
    const effectiveVersionId = targetVersionId ?? workVersions[0]?.id ?? null;
    const effectiveVersion = effectiveVersionId ? versions.find((version) => version.id === effectiveVersionId) ?? null : null;

    const gate = effectiveVersionId ? domainGate(effectiveVersionId) : { total: 0, labeled: 0, missing: 0, ratio: 1 };

    const facetsQuery = useVersionFacets(effectiveVersionId);

    const samplesQuery = useVersionSamples(effectiveVersionId, { domainLabeled: filter === 'all' ? undefined : filter, page });
    const samples = samplesQuery.data?.list ?? [];
    const total = samplesQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const setById = new Map(sets.map((set) => [set.id, set]));
    const selectVersion = (versionId: string) => {
        setTargetVersionId(versionId);
        setPage(1);
    };

    const runSuggest = (versionId: string) => void suggestMutation.mutateAsync(versionId);
    const confirmPage = () => {
        if (!effectiveVersionId) return;
        const ids = samples.filter((sample) => sample.domain === null).map((sample: QuestionBankSample) => sample.id);
        if (ids.length === 0) return;
        void confirmMutation.mutateAsync({ versionId: effectiveVersionId, sampleIds: ids });
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

            <div className={style.qbSplit}>
                <section className={style.qbCard} aria-label={translate('questionBank.labels.vocabulary')}>
                    <header>
                        <h4>{translate('questionBank.labels.vocabulary')}</h4>
                    </header>
                    <p className={style.qbCardCaption}>{translate('questionBank.labels.vocabulary.domain')}</p>
                    <div className={style.qbChipRow}>
                        {DOMAIN_ORDER.map((domain) => (
                            <span key={domain} className={style.qbChipStatic}>
                                {translate(domainLabelKey(domain))}
                            </span>
                        ))}
                    </div>
                    <p className={style.qbCardCaption}>{translate('questionBank.labels.vocabulary.direction')}</p>
                    <div className={style.qbChipRow}>
                        {DIRECTION_ORDER.map((direction) => (
                            <span key={direction} className={style.qbChipStatic}>
                                {translate(directionLabelKey(direction))}
                            </span>
                        ))}
                    </div>
                    <p className={style.qbHint}>{translate('questionBank.labels.vocabulary.otherNote')}</p>
                </section>

                <section className={style.qbCard} aria-label={translate('questionBank.labels.gate.title')}>
                    <header>
                        <h4>{translate('questionBank.labels.gate.title')}</h4>
                    </header>
                    <div className={style.qbGateGrid}>
                        {workVersions.map((version: QuestionSetVersion) => {
                            const versionGate = domainGate(version.id);
                            const open = versionGate.missing === 0;
                            return (
                                <button key={version.id} type="button" className={effectiveVersionId === version.id ? style.qbGateItemActive : style.qbGateItem} onClick={() => selectVersion(version.id)}>
                                    <div>
                                        <strong>{setById.get(version.setId)?.name ?? version.setId}</strong>
                                        <small>{version.releaseVersion}</small>
                                    </div>
                                    <div>
                                        <span>{translate('questionBank.labels.gate.coverage', { percent: (versionGate.ratio * 100).toFixed(1) })}</span>
                                        <ProgressBar value={versionGate.ratio} tone={open ? 'ready' : 'danger'} />
                                    </div>
                                    <StatusBadge tone={open ? 'ready' : 'danger'}>{open ? translate('questionBank.labels.gate.opened') : translate('questionBank.labels.gate.blocked')}</StatusBadge>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>

            {isAdmin ? (
                <section className={style.qbCard} aria-label={translate('questionBank.labels.workbench')}>
                    <header>
                        <h4>{translate('questionBank.labels.workbench')}</h4>
                        {effectiveVersion ? (
                            <span>
                                {setById.get(effectiveVersion.setId)?.name} · {effectiveVersion.releaseVersion}
                            </span>
                        ) : null}
                    </header>
                    <div className={style.qbToolbar}>
                        <div className={style.qbChipRow} role="group">
                            {(['all', 'unlabeled', 'labeled'] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={filter === value ? style.qbChipActive : style.qbChip}
                                    onClick={() => {
                                        setFilter(value);
                                        setPage(1);
                                    }}
                                >
                                    {translate(value === 'all' ? 'questionBank.labels.workbench.viewAll' : value === 'unlabeled' ? 'questionBank.labels.workbench.viewUnlabeled' : 'questionBank.labels.workbench.viewLabeled')}
                                </button>
                            ))}
                        </div>
                        <button type="button" className={style.qbGhostButton} disabled={suggestMutation.isPending || gate.missing === 0} onClick={() => effectiveVersionId && runSuggest(effectiveVersionId)}>
                            {translate('questionBank.labels.workbench.suggestAll')}
                        </button>
                        <button type="button" className={style.qbPrimaryButton} disabled={confirmMutation.isPending || gate.missing === 0} onClick={confirmPage}>
                            {translate('questionBank.labels.workbench.confirmPage')}
                        </button>
                    </div>
                    <table className={style.qbTable}>
                        <thead>
                            <tr>
                                <th>{translate('questionBank.labels.workbench.column.sample')}</th>
                                <th>{translate('questionBank.labels.workbench.column.dedup')}</th>
                                <th>{translate('questionBank.labels.workbench.column.domain')}</th>
                                <th>{translate('questionBank.labels.workbench.column.suggestion')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {samples.map((sample) => (
                                <tr key={sample.id}>
                                    <td>
                                        <strong>{sample.name}</strong>
                                        <small>{sample.cwe} · {sample.language} · {sample.difficulty}</small>
                                    </td>
                                    <td>
                                        <code>{sample.dedupKey}</code>
                                    </td>
                                    <td>{sample.domain ? translate(domainLabelKey(sample.domain)) : '—'}</td>
                                    <td>{sample.domain ? '✓' : sample.suggestedDomain ? <span className={style.qbSuggestion}>{translate(domainLabelKey(sample.suggestedDomain))}</span> : translate('questionBank.labels.workbench.suggestionNone')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {samples.length === 0 ? <p className={style.qbEmptyLine}>{translate('questionBank.labels.workbench.empty')}</p> : null}
                    <footer className={style.qbToolbar}>
                        <span className={style.qbCount}>{translate('questionBank.common.page', { page, total })}</span>
                        <div className={style.qbChipRow}>
                            <button type="button" className={style.qbChip} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                                {translate('questionBank.common.prev')}
                            </button>
                            <button type="button" className={style.qbChip} disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                                {translate('questionBank.common.next')}
                            </button>
                        </div>
                    </footer>
                    <p className={style.qbHint}>{translate('questionBank.labels.workbench.auditNote')}</p>
                </section>
            ) : null}

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
