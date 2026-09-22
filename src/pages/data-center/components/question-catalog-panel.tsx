import { useMemo, useState } from 'react';
import type { QuestionSet, QuestionSetVersion } from '@/api/question-bank';
import { DEMO_PROJECT_ID, isVersionAuthorized } from '@/api/question-bank';
import { usePublishVersion, useQuestionBankSnapshot, useRetireVersion } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { Dialog, FieldRow, LIFECYCLE_ORDER, StatusBadge, directionLabelKey, domainLabelKey } from '@/pages/data-center/components/question-bank-shared';
import { versionDiff } from '@/hooks/useQuestionBank';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

type CatalogFilter = 'all' | 'benchmark' | 'custom';

const lifecycleTone = (lifecycle: QuestionSetVersion['lifecycle']): 'ready' | 'neutral' | 'accent' | 'pending' => (lifecycle === 'published' ? 'ready' : lifecycle === 'retired' ? 'neutral' : lifecycle === 'verified' ? 'accent' : 'pending');

interface CatalogPanelProps {
    translate: Translate;
    /** admin = full catalog with lifecycle management; external = read-only published-only view */
    variant: 'admin' | 'external';
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

const QuestionCatalogPanel = ({ translate, variant, snapshot }: CatalogPanelProps) => {
    const isAdmin = variant === 'admin';
    const [filter, setFilter] = useState<CatalogFilter>('all');
    const [query, setQuery] = useState('');
    const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
    const [detailVersionId, setDetailVersionId] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ mode: 'publish' | 'retire'; version: QuestionSetVersion } | null>(null);

    const publishMutation = usePublishVersion();
    const retireMutation = useRetireVersion();

    const sets = useMemo(() => snapshot?.sets ?? [], [snapshot?.sets]);
    const versions = useMemo(() => snapshot?.versions ?? [], [snapshot?.versions]);
    const gates = snapshot?.gates ?? [];

    const visibleSets = useMemo(() => {
        // External authorization rule (PRD §7.2): published AND platform-internal
        // OR owned by this project — project-scoped sets from other projects never
        // appear, even at metadata level.
        const roleSets = isAdmin ? sets : sets.filter((set) => versions.some((version) => version.setId === set.id && isVersionAuthorized(version, set, DEMO_PROJECT_ID)));
        const keyword = query.trim().toLocaleLowerCase();
        return roleSets.filter((set) => {
            if (filter !== 'all' && set.type !== filter) return false;
            if (!keyword) return true;
            return set.name.toLocaleLowerCase().includes(keyword) || set.description.toLocaleLowerCase().includes(keyword) || set.directions.some((direction) => translate(directionLabelKey(direction)).includes(keyword));
        });
    }, [filter, isAdmin, query, sets, translate, versions]);

    const selectedSet = selectedSetId ? sets.find((set) => set.id === selectedSetId) ?? null : null;
    // External users only see published versions in the timeline — drafts and
    // verified-awaiting-publish versions stay admin-only.
    const setVersions = selectedSet
        ? versions
              .filter((version) => version.setId === selectedSet.id && (isAdmin || isVersionAuthorized(version, selectedSet, DEMO_PROJECT_ID)))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [];
    const detailVersion = detailVersionId ? versions.find((version) => version.id === detailVersionId) ?? null : null;
    const detailSet = detailVersion ? sets.find((set) => set.id === detailVersion.setId) ?? null : null;
    const detailGate = detailVersion ? gates.find((gate) => gate.versionId === detailVersion.id) : null;
    // Version diff (M1): compare against the next-older version of the same set,
    // regardless of lifecycle, so a fresh release diffs against its retired predecessor.
    const detailDiff =
        detailVersion && detailSet
            ? (() => {
                  const older = versions
                      .filter((version) => version.setId === detailVersion.setId && version.id !== detailVersion.id && version.createdAt < detailVersion.createdAt)
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                  return older ? versionDiff(detailVersion, older) : null;
              })()
            : null;

    const canPublish = (version: QuestionSetVersion) => version.lifecycle !== 'published' && version.lifecycle !== 'retired' && version.readiness.dataReady && version.readiness.environmentReady && version.readiness.graderReady;

    const handleConfirm = () => {
        if (!confirmAction) return;
        if (confirmAction.mode === 'publish') void publishMutation.mutateAsync(confirmAction.version.id);
        else void retireMutation.mutateAsync(confirmAction.version.id);
        setConfirmAction(null);
        setDetailVersionId(null);
    };

    return (
        <div className={style.qbPanel}>
            <header className={style.qbSectionHeader}>
                <div>
                    <h3>{translate(isAdmin ? 'questionBank.catalog.title' : 'questionBank.tabs.catalogExternal')}</h3>
                    <p>{translate(isAdmin ? 'questionBank.catalog.hint' : 'questionBank.catalog.userHint')}</p>
                </div>
            </header>

            <div className={style.qbToolbar}>
                <div className={style.qbChipRow} role="group" aria-label={translate('questionBank.catalog.filter.type')}>
                    {(['all', 'benchmark', 'custom'] as const).map((value) => (
                        <button key={value} type="button" className={filter === value ? style.qbChipActive : style.qbChip} onClick={() => setFilter(value)}>
                            {translate(value === 'all' ? 'questionBank.catalog.filter.all' : value === 'benchmark' ? 'questionBank.catalog.filter.benchmark' : 'questionBank.catalog.filter.custom')}
                        </button>
                    ))}
                </div>
                <input type="search" className={style.qbSearch} placeholder={translate('questionBank.catalog.filter.searchPlaceholder')} aria-label={translate('questionBank.catalog.filter.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
                <span className={style.qbCount}>{translate('questionBank.catalog.setsCount', { count: visibleSets.length })}</span>
            </div>

            <div className={style.qbCatalogGrid}>
                <section className={style.qbCard} aria-label={translate('questionBank.catalog.title')}>
                    <ul className={style.qbSetList}>
                        {visibleSets.map((set: QuestionSet) => {
                            const setVersionsAll = versions.filter((version) => version.setId === set.id);
                            const latest = [...setVersionsAll].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                            const gate = gates.find((item) => item.versionId === latest?.id);
                            return (
                                <li key={set.id}>
                                    <button type="button" className={selectedSetId === set.id ? style.qbSetItemActive : style.qbSetItem} onClick={() => setSelectedSetId(set.id)}>
                                        <div>
                                            <strong>{set.name}</strong>
                                            <span>{set.type === 'benchmark' ? translate('questionBank.catalog.filter.benchmark') : translate('questionBank.catalog.filter.custom')}</span>
                                        </div>
                                        <div className={style.qbSetItemMeta}>
                                            {latest ? <StatusBadge tone={lifecycleTone(latest.lifecycle)}>{translate(`questionBank.catalog.lifecycle.${latest.lifecycle}`)}</StatusBadge> : null}
                                            {gate && gate.missing > 0 ? <small>{translate('questionBank.catalog.gate.closed', { missing: gate.missing, total: gate.total })}</small> : null}
                                        </div>
                                        <p>{set.directions.map((direction) => translate(directionLabelKey(direction))).join(' / ')}</p>
                                        {!isAdmin && set.supportedDomains && set.supportedDomains.length > 0 ? (
                                            <div className={style.qbSetItemMeta}>
                                                <small>{translate('questionBank.catalog.supportedDomains')}</small>
                                                {set.supportedDomains.slice(0, 3).map((domain) => (
                                                    <span key={domain} className={style.qbChipStatic}>
                                                        {translate(domainLabelKey(domain))}
                                                    </span>
                                                ))}
                                                {set.supportedDomains.length > 3 ? <small>+{set.supportedDomains.length - 3}</small> : null}
                                            </div>
                                        ) : null}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section className={style.qbCard} aria-label={translate('questionBank.catalog.versions')}>
                    <header>
                        <h3>{translate('questionBank.catalog.versions')}</h3>
                        {selectedSet ? <span>{selectedSet.name}</span> : null}
                    </header>
                    {selectedSet ? (
                        <ul className={style.qbVersionList}>
                            {setVersions.map((version) => (
                                <li key={version.id}>
                                    <div className={style.qbVersionRow}>
                                        <div>
                                            <strong>{version.releaseVersion}</strong>
                                            <small>{version.sourceRef}</small>
                                        </div>
                                        <div className={style.qbVersionActions}>
                                            <StatusBadge tone={lifecycleTone(version.lifecycle)}>{translate(`questionBank.catalog.lifecycle.${version.lifecycle}`)}</StatusBadge>
                                            <button type="button" className={style.qbTextButton} onClick={() => setDetailVersionId(version.id)}>
                                                {translate('questionBank.catalog.versionDetail')}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={style.qbEmptyLine}>{translate('questionBank.sampling.preview.pickPlan')}</p>
                    )}
                </section>
            </div>

            {detailVersion && detailSet ? (
                <Dialog wide title={`${detailSet.name} · ${detailVersion.releaseVersion}`} subtitle={detailVersion.sourceRef} onClose={() => setDetailVersionId(null)}>
                    <div className={style.qbLifecycleRow}>
                        {LIFECYCLE_ORDER.map((stage) => {
                            const currentIndex = LIFECYCLE_ORDER.indexOf(detailVersion.lifecycle);
                            const stageIndex = LIFECYCLE_ORDER.indexOf(stage);
                            const reached = stageIndex <= currentIndex && !(detailVersion.lifecycle === 'retired' && stage === 'published');
                            return (
                                <span key={stage} className={reached ? style.qbLifecycleStepReached : style.qbLifecycleStep}>
                                    {translate(`questionBank.catalog.lifecycle.${stage}`)}
                                </span>
                            );
                        })}
                    </div>
                    <dl className={style.qbFieldGrid}>
                        <FieldRow label={translate('questionBank.catalog.fields.releaseVersion')}>{detailVersion.releaseVersion}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.manifestHash')}>
                            <code>{detailVersion.manifestHash.slice(0, 27)}…</code>
                        </FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.fullTaskCount')}>{detailVersion.counts.fullTaskCount.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.projectOrRepo')}>{detailVersion.counts.projectOrRepoCount || '—'}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.groundTruth')}>{detailVersion.counts.groundTruthCount.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.envLogical')}>{detailVersion.envCounts.logicalEnvCount.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.envStateRefs')}>{detailVersion.envCounts.imageStateRefs.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.envUnique')}>{detailVersion.envCounts.uniqueImageDigestCount.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.envWorkspace')}>{detailVersion.envCounts.workspaceCount.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.primaryMetric')}>{detailVersion.metrics.primaryMetric}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.denominator')}>{detailVersion.metrics.denominatorPolicy}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.license')}>{detailVersion.license}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.referencedRuns')}>{detailVersion.referencedRuns}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.directions')}>{detailSet.directions.map((direction) => translate(directionLabelKey(direction))).join(' / ')}</FieldRow>
                    </dl>
                    <div className={style.qbReadinessRow}>
                        {(['data', 'env', 'grader'] as const).map((key) => {
                            const ready = key === 'data' ? detailVersion.readiness.dataReady : key === 'env' ? detailVersion.readiness.environmentReady : detailVersion.readiness.graderReady;
                            return (
                                <StatusBadge key={key} tone={ready ? 'ready' : 'pending'}>
                                    {translate(`questionBank.catalog.readiness.${key}`)}: {ready ? '✓' : '…'}
                                </StatusBadge>
                            );
                        })}
                        {detailGate && detailGate.missing > 0 ? (
                            <StatusBadge tone="danger">{translate('questionBank.catalog.gate.closed', { missing: detailGate.missing, total: detailGate.total })}</StatusBadge>
                        ) : null}
                    </div>
                    {detailDiff ? (
                        <>
                            <p className={style.qbCardCaption}>{translate('questionBank.catalog.diff.title')}</p>
                            <table className={style.qbTable}>
                                <thead>
                                    <tr>
                                        <th aria-label="field" />
                                        <th>{detailVersion.releaseVersion}</th>
                                        <th aria-label="delta" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailDiff.map((row) => (
                                        <tr key={row.field}>
                                            <td>{translate(`questionBank.catalog.diff.field.${row.field}`)}</td>
                                            <td>
                                                <code>{row.current}</code>
                                            </td>
                                            <td>{row.delta === null ? '—' : <span className={row.delta >= 0 ? style.qbSuccessInline : style.qbDangerInline}>{row.delta >= 0 ? `+${row.delta.toLocaleString()}` : row.delta.toLocaleString()}</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <p className={style.qbHint}>{translate('questionBank.catalog.diff.noPrevious')}</p>
                    )}
                    {isAdmin ? (
                        <footer className={style.qbDialogActions}>
                            {canPublish(detailVersion) ? (
                                <button type="button" className={style.qbPrimaryButton} onClick={() => setConfirmAction({ mode: 'publish', version: detailVersion })}>
                                    {translate('questionBank.catalog.publish')}
                                </button>
                            ) : (
                                <span className={style.qbHint}>{translate('questionBank.catalog.publishBlocked')}</span>
                            )}
                            {detailVersion.lifecycle === 'published' ? (
                                <button type="button" className={style.qbDangerButton} onClick={() => setConfirmAction({ mode: 'retire', version: detailVersion })}>
                                    {translate('questionBank.catalog.retire')}
                                </button>
                            ) : null}
                        </footer>
                    ) : null}
                </Dialog>
            ) : null}

            {confirmAction ? (
                <Dialog
                    title={translate(confirmAction.mode === 'publish' ? 'questionBank.catalog.publishDialog.title' : 'questionBank.catalog.retireDialog.title')}
                    subtitle={confirmAction.version.releaseVersion}
                    onClose={() => setConfirmAction(null)}
                >
                    <p className={style.qbDialogText}>
                        {confirmAction.mode === 'publish'
                            ? translate('questionBank.catalog.publishDialog.description')
                            : translate('questionBank.catalog.retireDialog.description', { runs: confirmAction.version.referencedRuns })}
                    </p>
                    <footer className={style.qbDialogActions}>
                        <button type="button" className={style.qbGhostButton} onClick={() => setConfirmAction(null)}>
                            {translate('questionBank.common.cancel')}
                        </button>
                        <button type="button" className={confirmAction.mode === 'publish' ? style.qbPrimaryButton : style.qbDangerButton} onClick={handleConfirm}>
                            {translate(confirmAction.mode === 'publish' ? 'questionBank.catalog.publishDialog.confirm' : 'questionBank.catalog.retireDialog.confirm')}
                        </button>
                    </footer>
                </Dialog>
            ) : null}
        </div>
    );
};

export default QuestionCatalogPanel;
