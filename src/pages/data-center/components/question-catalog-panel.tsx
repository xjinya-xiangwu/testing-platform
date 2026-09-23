import { useMemo, useState } from 'react';
import type { EvaluationDirection, QuestionSetVersion, TargetDomain } from '@/api/question-bank';
import { DEMO_PROJECT_ID, diffVersions, isVersionAuthorized } from '@/api/question-bank';
import { usePublishVersion, useQuestionBankSnapshot, useRetireVersion } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { Dialog, DIRECTION_ORDER, DOMAIN_ORDER, FieldRow, LIFECYCLE_ORDER, StatusBadge, directionLabelKey, domainLabelKey } from '@/pages/data-center/components/question-bank-shared';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

type CatalogTypeFilter = 'all' | 'benchmark' | 'custom';
type CatalogSort = 'default' | 'tasks' | 'recent';
type CatalogStatusFilter = 'all' | 'published' | 'verified' | 'wip';

const lifecycleTone = (lifecycle: QuestionSetVersion['lifecycle']): 'ready' | 'neutral' | 'accent' | 'pending' => (lifecycle === 'published' ? 'ready' : lifecycle === 'retired' ? 'neutral' : lifecycle === 'verified' ? 'accent' : 'pending');

const directionChipClass: Record<EvaluationDirection, string> = {
    vulnerability_discovery: style.qbChipDirectionDiscovery,
    vulnerability_reproduction: style.qbChipDirectionReproduction,
    vulnerability_exploitation: style.qbChipDirectionExploitation,
    vulnerability_repair: style.qbChipDirectionRepair,
};

interface CatalogPanelProps {
    translate: Translate;
    /** admin = full catalog with lifecycle management; external = read-only authorized view */
    variant: 'admin' | 'external';
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

/**
 * Question-bank catalog, redesigned after OpenDataLab's dataset square: a filter
 * rail (type / direction / domain / lifecycle) beside a card grid where each set
 * is a dataset-style card with description, capability tags, scale stats and its
 * latest version line. Version detail / publish / retire live in the dialog.
 */
const QuestionCatalogPanel = ({ translate, variant, snapshot }: CatalogPanelProps) => {
    const isAdmin = variant === 'admin';
    const [typeFilter, setTypeFilter] = useState<CatalogTypeFilter>('all');
    const [directionFilter, setDirectionFilter] = useState<EvaluationDirection[]>([]);
    const [domainFilter, setDomainFilter] = useState<TargetDomain[]>([]);
    const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<CatalogSort>('default');
    const [detailVersionId, setDetailVersionId] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ mode: 'publish' | 'retire'; version: QuestionSetVersion } | null>(null);

    const publishMutation = usePublishVersion();
    const retireMutation = useRetireVersion();

    const sets = useMemo(() => snapshot?.sets ?? [], [snapshot?.sets]);
    const versions = useMemo(() => snapshot?.versions ?? [], [snapshot?.versions]);
    const gates = useMemo(() => snapshot?.gates ?? [], [snapshot?.gates]);

    const setCards = useMemo(() => {
        return sets
            .filter((set) => (isAdmin ? true : versions.some((version) => version.setId === set.id && isVersionAuthorized(version, set, DEMO_PROJECT_ID))))
            .map((set) => {
                const setVersions = versions.filter((version) => version.setId === set.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                const latest = setVersions.find((version) => (isAdmin ? true : version.lifecycle === 'published')) ?? setVersions[0] ?? null;
                const gate = latest ? gates.find((item) => item.versionId === latest.id) ?? null : null;
                return { set, latest, versionCount: setVersions.length, gate };
            })
            .filter((card) => card.latest !== null);
    }, [gates, isAdmin, sets, versions]);

    const filteredCards = useMemo(() => {
        const keyword = query.trim().toLocaleLowerCase();
        const result = setCards.filter(({ set, latest }) => {
            if (typeFilter !== 'all' && set.type !== typeFilter) return false;
            if (directionFilter.length > 0 && !set.directions.some((direction) => directionFilter.includes(direction))) return false;
            if (domainFilter.length > 0 && !(set.supportedDomains ?? []).some((domain) => domainFilter.includes(domain))) return false;
            if (isAdmin && statusFilter !== 'all') {
                const lifecycle = latest?.lifecycle;
                if (statusFilter === 'published' && lifecycle !== 'published') return false;
                if (statusFilter === 'verified' && lifecycle !== 'verified') return false;
                if (statusFilter === 'wip' && lifecycle !== 'draft' && lifecycle !== 'structured' && lifecycle !== 'labeled') return false;
            }
            if (!keyword) return true;
            return (
                set.name.toLocaleLowerCase().includes(keyword) ||
                set.code.toLocaleLowerCase().includes(keyword) ||
                set.description.toLocaleLowerCase().includes(keyword) ||
                set.directions.some((direction) => translate(directionLabelKey(direction)).includes(keyword)) ||
                (set.supportedDomains ?? []).some((domain) => translate(domainLabelKey(domain)).includes(keyword))
            );
        });
        if (sort === 'tasks') result.sort((a, b) => (b.latest?.counts.fullTaskCount ?? 0) - (a.latest?.counts.fullTaskCount ?? 0));
        if (sort === 'recent') result.sort((a, b) => (b.latest?.createdAt ?? '').localeCompare(a.latest?.createdAt ?? ''));
        return result;
    }, [isAdmin, domainFilter, directionFilter, query, setCards, sort, statusFilter, translate, typeFilter]);

    const toggleDirection = (direction: EvaluationDirection) =>
        setDirectionFilter((current) => (current.includes(direction) ? current.filter((item) => item !== direction) : [...current, direction]));
    const toggleDomain = (domain: TargetDomain) =>
        setDomainFilter((current) => (current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain]));
    const hasActiveFilters = typeFilter !== 'all' || directionFilter.length > 0 || domainFilter.length > 0 || (isAdmin && statusFilter !== 'all') || query.trim().length > 0;

    const detailVersion = detailVersionId ? versions.find((version) => version.id === detailVersionId) ?? null : null;
    const detailSet = detailVersion ? sets.find((set) => set.id === detailVersion.setId) ?? null : null;
    const detailGate = detailVersion ? gates.find((gate) => gate.versionId === detailVersion.id) : null;
    const detailDiff =
        detailVersion && detailSet
            ? (() => {
                  const older = versions
                      .filter((version) => version.setId === detailVersion.setId && version.id !== detailVersion.id && version.createdAt < detailVersion.createdAt)
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                  return older ? diffVersions(detailVersion, older) : null;
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

    const renderFilterRail = () => (
        <aside className={style.qbFilterRail} aria-label={translate('questionBank.catalog.rail.title')}>
            <div className={style.qbFilterGroup}>
                <span className={style.qbFilterCaption}>{translate('questionBank.catalog.filter.type')}</span>
                <div className={style.qbFilterOptions}>
                    {(['all', 'benchmark', 'custom'] as const).map((value) => (
                        <button key={value} type="button" className={typeFilter === value ? style.qbFilterOptionActive : style.qbFilterOption} onClick={() => setTypeFilter(value)}>
                            {translate(value === 'all' ? 'questionBank.catalog.filter.all' : value === 'benchmark' ? 'questionBank.catalog.filter.benchmark' : 'questionBank.catalog.filter.custom')}
                        </button>
                    ))}
                </div>
            </div>
            <div className={style.qbFilterGroup}>
                <span className={style.qbFilterCaption}>{translate('questionBank.catalog.filter.directions')}</span>
                <div className={style.qbFilterOptions}>
                    {DIRECTION_ORDER.map((direction) => (
                        <button key={direction} type="button" className={directionFilter.includes(direction) ? style.qbFilterOptionActive : style.qbFilterOption} onClick={() => toggleDirection(direction)}>
                            <i className={directionChipClass[direction]} aria-hidden="true" />
                            {translate(directionLabelKey(direction))}
                        </button>
                    ))}
                </div>
            </div>
            <div className={style.qbFilterGroup}>
                <span className={style.qbFilterCaption}>{translate('questionBank.catalog.filter.domains')}</span>
                <div className={style.qbFilterOptions}>
                    {DOMAIN_ORDER.filter((domain) => domain !== 'other' || isAdmin).map((domain) => (
                        <button key={domain} type="button" className={domainFilter.includes(domain) ? style.qbFilterOptionActive : style.qbFilterOption} onClick={() => toggleDomain(domain)}>
                            {translate(domainLabelKey(domain))}
                        </button>
                    ))}
                </div>
            </div>
            {isAdmin ? (
                <div className={style.qbFilterGroup}>
                    <span className={style.qbFilterCaption}>{translate('questionBank.catalog.filter.status')}</span>
                    <div className={style.qbFilterOptions}>
                        {(['all', 'published', 'verified', 'wip'] as const).map((value) => (
                            <button key={value} type="button" className={statusFilter === value ? style.qbFilterOptionActive : style.qbFilterOption} onClick={() => setStatusFilter(value)}>
                                {translate(value === 'all' ? 'questionBank.catalog.filter.all' : value === 'published' ? 'questionBank.catalog.lifecycle.published' : value === 'verified' ? 'questionBank.catalog.lifecycle.verified' : 'questionBank.catalog.lifecycle.draft')}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
            {hasActiveFilters ? (
                <button
                    type="button"
                    className={style.qbFilterClear}
                    onClick={() => {
                        setTypeFilter('all');
                        setDirectionFilter([]);
                        setDomainFilter([]);
                        setStatusFilter('all');
                        setQuery('');
                    }}
                >
                    {translate('questionBank.catalog.filter.clear')}
                </button>
            ) : null}
        </aside>
    );

    return (
        <div className={style.qbPanel}>
            <header className={style.qbSectionHeader}>
                <div>
                    <h3>{translate(isAdmin ? 'questionBank.catalog.title' : 'questionBank.tabs.catalogExternal')}</h3>
                    <p>{translate(isAdmin ? 'questionBank.catalog.hint' : 'questionBank.catalog.userHint')}</p>
                </div>
            </header>

            <div className={style.qbCatalogLayout}>
                {renderFilterRail()}
                <div className={style.qbCatalogMain}>
                    <div className={style.qbToolbar}>
                        <input type="search" className={style.qbSearch} placeholder={translate('questionBank.catalog.filter.searchPlaceholder')} aria-label={translate('questionBank.catalog.filter.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
                        <label className={style.qbInlineLabel}>
                            <span>{translate('questionBank.catalog.sort.label')}</span>
                            <select value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}>
                                <option value="default">{translate('questionBank.catalog.sort.default')}</option>
                                <option value="tasks">{translate('questionBank.catalog.sort.tasks')}</option>
                                <option value="recent">{translate('questionBank.catalog.sort.recent')}</option>
                            </select>
                        </label>
                        <span className={style.qbCount}>{translate('questionBank.catalog.resultCount', { count: filteredCards.length })}</span>
                    </div>

                    {filteredCards.length === 0 ? (
                        <p className={style.qbEmptyLine}>{translate('questionBank.labels.workbench.empty')}</p>
                    ) : (
                        <div className={style.qbCardGrid}>
                            {filteredCards.map(({ set, latest, versionCount, gate }) => (
                                <article key={set.id} className={style.qbDatasetCard}>
                                    <header>
                                        <div>
                                            <strong>{set.name}</strong>
                                            <small>{set.code}</small>
                                        </div>
                                        <StatusBadge tone={lifecycleTone(latest!.lifecycle)}>{translate(`questionBank.catalog.lifecycle.${latest!.lifecycle}`)}</StatusBadge>
                                    </header>
                                    <p className={style.qbDatasetDesc}>{set.description}</p>
                                    <div className={style.qbDatasetTags}>
                                        {set.directions.map((direction) => (
                                            <span key={direction} className={`${style.qbTagChip} ${directionChipClass[direction]}`}>
                                                {translate(directionLabelKey(direction))}
                                            </span>
                                        ))}
                                        {(set.supportedDomains ?? []).slice(0, 3).map((domain) => (
                                            <span key={domain} className={style.qbTagChipMuted}>
                                                {translate(domainLabelKey(domain))}
                                            </span>
                                        ))}
                                        {(set.supportedDomains?.length ?? 0) > 3 ? <span className={style.qbTagChipMuted}>+{(set.supportedDomains?.length ?? 0) - 3}</span> : null}
                                    </div>
                                    <dl className={style.qbDatasetStats}>
                                        <div>
                                            <dt>{translate('questionBank.catalog.card.tasks')}</dt>
                                            <dd>{latest!.counts.fullTaskCount.toLocaleString()}</dd>
                                        </div>
                                        <div>
                                            <dt>{translate('questionBank.catalog.card.environments')}</dt>
                                            <dd>{latest!.envCounts.logicalEnvCount.toLocaleString()}</dd>
                                        </div>
                                        <div>
                                            <dt>{translate('questionBank.catalog.card.runs')}</dt>
                                            <dd>{latest!.referencedRuns}</dd>
                                        </div>
                                    </dl>
                                    <footer>
                                        <div>
                                            <span>
                                                {translate('questionBank.catalog.card.latest')} · {latest!.releaseVersion}
                                            </span>
                                            <small>
                                {versionCount} 个版本
                                                {gate && gate.missing > 0 ? ` · ${translate('questionBank.catalog.gate.closed', { missing: gate.missing, total: gate.total })}` : ''}
                                            </small>
                                        </div>
                                        <button type="button" className={style.qbGhostButton} onClick={() => setDetailVersionId(latest!.id)}>
                                            {translate('questionBank.catalog.versionDetail')}
                                        </button>
                                    </footer>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
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
                        <FieldRow label={translate('questionBank.catalog.fields.envLogical')}>{detailVersion.envCounts.logicalEnvCount.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.envUnique')}>{detailVersion.envCounts.uniqueImageDigestCount.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.groundTruth')}>{detailVersion.counts.groundTruthCount.toLocaleString()}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.primaryMetric')}>{detailVersion.metrics.primaryMetric}</FieldRow>
                        <FieldRow label={translate('questionBank.catalog.fields.referencedRuns')}>{detailVersion.referencedRuns}</FieldRow>
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
                        {detailGate && detailGate.missing > 0 ? <StatusBadge tone="danger">{translate('questionBank.catalog.gate.closed', { missing: detailGate.missing, total: detailGate.total })}</StatusBadge> : null}
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
