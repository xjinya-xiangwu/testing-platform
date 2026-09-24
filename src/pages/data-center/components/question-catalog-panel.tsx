import { useMemo, useState } from 'react';
import type { EvaluationDirection, QuestionSet, QuestionSetVersion, TargetDomain } from '@/api/question-bank';
import { DEMO_PROJECT_ID, diffVersions, isSetDeletable, isVersionAuthorized, isVersionDeletable } from '@/api/question-bank';
import { useCreateQuestionSet, useCreateSetVersion, useDeleteQuestionSet, useDeleteSetVersion, usePublishVersion, useQuestionBankSnapshot, useRetireVersion, useUpdateQuestionSet } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { Dialog, DIRECTION_ORDER, DOMAIN_ORDER, FieldRow, StatusBadge, directionLabelKey, domainLabelKey } from '@/pages/data-center/components/question-bank-shared';
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
    /** admin = full catalog with create/edit/delete and version management; external = filter + read-only detail */
    variant: 'admin' | 'external';
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

/**
 * Question-bank catalog, designed after OpenDataLab's dataset square: filter
 * rail beside a card grid. Admins manage sets here (create / edit metadata /
 * delete, per-version publish / retire / delete); external users only filter
 * and read the authorized detail.
 */
const QuestionCatalogPanel = ({ translate, variant, snapshot }: CatalogPanelProps) => {
    const isAdmin = variant === 'admin';
    const [typeFilter, setTypeFilter] = useState<CatalogTypeFilter>('all');
    const [directionFilter, setDirectionFilter] = useState<EvaluationDirection[]>([]);
    const [domainFilter, setDomainFilter] = useState<TargetDomain[]>([]);
    const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<CatalogSort>('default');

    // Admin management state
    const [manageSetId, setManageSetId] = useState<string | null>(null);
    const [manageVersionId, setManageVersionId] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '' });
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState<{ code: string; description: string; directions: EvaluationDirection[]; name: string; type: 'benchmark' | 'custom' }>({ code: '', description: '', directions: ['vulnerability_discovery'], name: '', type: 'benchmark' });
    const [newVersionOpen, setNewVersionOpen] = useState(false);
    const [newVersionForm, setNewVersionForm] = useState({ releaseVersion: '', sourceRef: '' });
    const [deleteSetOpen, setDeleteSetOpen] = useState(false);

    const publishMutation = usePublishVersion();
    const retireMutation = useRetireVersion();
    const createMutation = useCreateQuestionSet();
    const updateMutation = useUpdateQuestionSet();
    const deleteSetMutation = useDeleteQuestionSet();
    const createVersionMutation = useCreateSetVersion();
    const deleteVersionMutation = useDeleteSetVersion();

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

    // Management dialog data (admin only)
    const manageSet = manageSetId ? sets.find((set) => set.id === manageSetId) ?? null : null;
    const manageVersions = useMemo(() => (manageSetId ? versions.filter((version) => version.setId === manageSetId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []), [manageSetId, versions]);
    const manageVersion = manageVersions.find((version) => version.id === manageVersionId) ?? manageVersions[0] ?? null;
    const manageGate = manageVersion ? gates.find((gate) => gate.versionId === manageVersion.id) ?? null : null;
    const manageDiff = useMemo(() => {
        if (!manageVersion) return null;
        const older = manageVersions.filter((version) => version.id !== manageVersion.id && version.createdAt < manageVersion.createdAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        return older ? diffVersions(manageVersion, older) : null;
    }, [manageVersion, manageVersions]);
    const setDeletable = manageSet ? isSetDeletable(manageSet.id) : false;
    const versionDeletable = manageVersion ? isVersionDeletable(manageVersion) && manageVersions.length > 1 : false;
    const canPublishSelected = manageVersion !== null && manageVersion.lifecycle !== 'published' && manageVersion.lifecycle !== 'retired' && manageVersion.readiness.dataReady && manageVersion.readiness.environmentReady && manageVersion.readiness.graderReady;

    const openManage = (set: QuestionSet) => {
        const setVersions = versions.filter((version) => version.setId === set.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setManageSetId(set.id);
        setManageVersionId(setVersions[0]?.id ?? null);
        setEditing(false);
        setNewVersionOpen(false);
        setDeleteSetOpen(false);
    };

    const submitCreate = () => {
        void createMutation
            .mutateAsync({
                name: createForm.name.trim(),
                code: createForm.code.trim() || createForm.name.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 16),
                description: createForm.description.trim(),
                type: createForm.type,
                directions: createForm.directions,
            })
            .then(() => {
                setCreateOpen(false);
                setCreateForm({ code: '', description: '', directions: ['vulnerability_discovery'], name: '', type: 'benchmark' });
            });
    };

    const readinessBadges = (version: QuestionSetVersion, gate: { missing: number; total: number } | null) => (
        <div className={style.qbReadinessRow}>
            {(['data', 'env', 'grader'] as const).map((key) => {
                const ready = key === 'data' ? version.readiness.dataReady : key === 'env' ? version.readiness.environmentReady : version.readiness.graderReady;
                return (
                    <StatusBadge key={key} tone={ready ? 'ready' : 'pending'}>
                        {translate(`questionBank.catalog.readiness.${key}`)}: {ready ? '✓' : '…'}
                    </StatusBadge>
                );
            })}
            {gate && gate.missing > 0 ? <StatusBadge tone="danger">{translate('questionBank.catalog.gate.closed', { missing: gate.missing, total: gate.total })}</StatusBadge> : null}
        </div>
    );

    const renderDiff = (version: QuestionSetVersion) => {
        if (!manageDiff) return <p className={style.qbHint}>{translate('questionBank.catalog.diff.noPrevious')}</p>;
        void version;
        return (
            <>
                <p className={style.qbCardCaption}>{translate('questionBank.catalog.diff.title')}</p>
                <table className={style.qbTable}>
                    <thead>
                        <tr>
                            <th aria-label="field" />
                            <th>{version.releaseVersion}</th>
                            <th aria-label="delta" />
                        </tr>
                    </thead>
                    <tbody>
                        {manageDiff.map((row) => (
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
        );
    };

    const renderExternalDetail = () => {
        if (!manageSet || !manageVersion) return null;
        return (
            <>
                <dl className={style.qbFieldGrid}>
                    <FieldRow label={translate('questionBank.catalog.fields.releaseVersion')}>{manageVersion.releaseVersion}</FieldRow>
                    <FieldRow label={translate('questionBank.catalog.fields.manifestHash')}>
                        <code>{manageVersion.manifestHash.slice(0, 27)}…</code>
                    </FieldRow>
                    <FieldRow label={translate('questionBank.catalog.fields.fullTaskCount')}>{manageVersion.counts.fullTaskCount.toLocaleString()}</FieldRow>
                    <FieldRow label={translate('questionBank.catalog.fields.envLogical')}>{manageVersion.envCounts.logicalEnvCount.toLocaleString()}</FieldRow>
                    <FieldRow label={translate('questionBank.catalog.fields.envUnique')}>{manageVersion.envCounts.uniqueImageDigestCount.toLocaleString()}</FieldRow>
                    <FieldRow label={translate('questionBank.catalog.fields.primaryMetric')}>{manageVersion.metrics.primaryMetric}</FieldRow>
                    <FieldRow label={translate('questionBank.catalog.fields.license')}>{manageVersion.license}</FieldRow>
                </dl>
                {readinessBadges(manageVersion, manageGate)}
                {renderDiff(manageVersion)}
            </>
        );
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
                {isAdmin ? (
                    <button type="button" className={style.qbPrimaryButton} onClick={() => setCreateOpen(true)}>
                        {translate('questionBank.catalog.create')}
                    </button>
                ) : null}
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
                                        <button type="button" className={isAdmin ? style.qbPrimaryButton : style.qbGhostButton} onClick={() => openManage(set)}>
                                            {translate(isAdmin ? 'questionBank.catalog.manage' : 'questionBank.catalog.versionDetail')}
                                        </button>
                                    </footer>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {manageSet ? (
                <Dialog wide title={manageSet.name} subtitle={manageSet.code} onClose={() => setManageSetId(null)}>
                    {!isAdmin ? (
                        renderExternalDetail()
                    ) : (
                        <>
                            <p className={style.qbCardCaption}>{translate('questionBank.catalog.info')}</p>
                            {editing ? (
                                <div className={style.qbEditForm}>
                                    <label>
                                        <span>{translate('questionBank.catalog.form.name')}</span>
                                        <input type="text" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
                                    </label>
                                    <label>
                                        <span>{translate('questionBank.catalog.form.desc')}</span>
                                        <input type="text" value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
                                    </label>
                                    <div className={style.qbChipRow}>
                                        <button type="button" className={style.qbPrimaryButton} disabled={updateMutation.isPending || editForm.name.trim().length === 0} onClick={() => void updateMutation.mutateAsync({ setId: manageSet.id, name: editForm.name.trim(), description: editForm.description.trim() }).then(() => setEditing(false))}>
                                            {translate('questionBank.common.confirm')}
                                        </button>
                                        <button type="button" className={style.qbGhostButton} onClick={() => setEditing(false)}>
                                            {translate('questionBank.common.cancel')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <dl className={style.qbFieldGrid}>
                                        <FieldRow label={translate('questionBank.catalog.form.code')}>
                                            <code>{manageSet.code}</code>
                                        </FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.filter.type')}>{translate(manageSet.type === 'benchmark' ? 'questionBank.catalog.filter.benchmark' : 'questionBank.catalog.filter.custom')}</FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.directions')}>{manageSet.directions.map((direction) => translate(directionLabelKey(direction))).join(' / ')}</FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.form.desc')}>{manageSet.description}</FieldRow>
                                    </dl>
                                    <button
                                        type="button"
                                        className={style.qbGhostButton}
                                        onClick={() => {
                                            setEditForm({ name: manageSet.name, description: manageSet.description });
                                            setEditing(true);
                                        }}
                                    >
                                        {translate('questionBank.catalog.editInfo')}
                                    </button>
                                </>
                            )}

                            <p className={style.qbCardCaption}>{translate('questionBank.catalog.versions.manage')}</p>
                            <div className={style.qbVersionManageList}>
                                {manageVersions.map((version) => (
                                    <button key={version.id} type="button" className={manageVersion?.id === version.id ? style.qbVersionRowActive : style.qbVersionRow} onClick={() => setManageVersionId(version.id)}>
                                        <strong>{version.releaseVersion}</strong>
                                        <StatusBadge tone={lifecycleTone(version.lifecycle)}>{translate(`questionBank.catalog.lifecycle.${version.lifecycle}`)}</StatusBadge>
                                        <small>
                                            {translate('questionBank.catalog.card.runs')}: {version.referencedRuns} · {new Date(version.createdAt).toLocaleDateString()}
                                        </small>
                                    </button>
                                ))}
                                {newVersionOpen ? (
                                    <div className={style.qbEditForm}>
                                        <label>
                                            <span>{translate('questionBank.catalog.versions.releaseVersion')}</span>
                                            <input type="text" placeholder="v1.1-draft" value={newVersionForm.releaseVersion} onChange={(event) => setNewVersionForm((current) => ({ ...current, releaseVersion: event.target.value }))} />
                                        </label>
                                        <label>
                                            <span>{translate('questionBank.catalog.versions.sourceRef')}</span>
                                            <input type="text" placeholder="manual-registration" value={newVersionForm.sourceRef} onChange={(event) => setNewVersionForm((current) => ({ ...current, sourceRef: event.target.value }))} />
                                        </label>
                                        <div className={style.qbChipRow}>
                                            <button
                                                type="button"
                                                className={style.qbPrimaryButton}
                                                disabled={createVersionMutation.isPending || newVersionForm.releaseVersion.trim().length === 0}
                                                onClick={() =>
                                                    manageSet &&
                                                    void createVersionMutation
                                                        .mutateAsync({ setId: manageSet.id, releaseVersion: newVersionForm.releaseVersion.trim(), sourceRef: newVersionForm.sourceRef.trim() })
                                                        .then((version) => {
                                                            setManageVersionId(version.id);
                                                            setNewVersionOpen(false);
                                                            setNewVersionForm({ releaseVersion: '', sourceRef: '' });
                                                        })
                                                }
                                            >
                                                {translate('questionBank.common.confirm')}
                                            </button>
                                            <button type="button" className={style.qbGhostButton} onClick={() => setNewVersionOpen(false)}>
                                                {translate('questionBank.common.cancel')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button type="button" className={style.qbGhostButton} onClick={() => setNewVersionOpen(true)}>
                                        {translate('questionBank.catalog.versions.new')}
                                    </button>
                                )}
                            </div>

                            {manageVersion ? (
                                <>
                                    <p className={style.qbCardCaption}>{translate('questionBank.catalog.versionDetail')}</p>
                                    <dl className={style.qbFieldGrid}>
                                        <FieldRow label={translate('questionBank.catalog.fields.releaseVersion')}>{manageVersion.releaseVersion}</FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.fields.manifestHash')}>
                                            <code>{manageVersion.manifestHash.slice(0, 27)}…</code>
                                        </FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.fields.fullTaskCount')}>{manageVersion.counts.fullTaskCount.toLocaleString()}</FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.fields.envLogical')}>{manageVersion.envCounts.logicalEnvCount.toLocaleString()}</FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.fields.groundTruth')}>{manageVersion.counts.groundTruthCount.toLocaleString()}</FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.fields.referencedRuns')}>{manageVersion.referencedRuns}</FieldRow>
                                        <FieldRow label={translate('questionBank.catalog.fields.primaryMetric')}>{manageVersion.metrics.primaryMetric}</FieldRow>
                                    </dl>
                                    {readinessBadges(manageVersion, manageGate)}
                                    {renderDiff(manageVersion)}

                                    <footer className={style.qbDialogActions}>
                                        {canPublishSelected ? (
                                            <button type="button" className={style.qbPrimaryButton} onClick={() => void publishMutation.mutateAsync(manageVersion.id)}>
                                                {translate('questionBank.catalog.publish')}
                                            </button>
                                        ) : (
                                            <span className={style.qbHint}>{translate('questionBank.catalog.publishBlocked')}</span>
                                        )}
                                        {manageVersion.lifecycle === 'published' ? (
                                            <button type="button" className={style.qbDangerButton} onClick={() => void retireMutation.mutateAsync(manageVersion.id)}>
                                                {translate('questionBank.catalog.retire')}
                                            </button>
                                        ) : null}
                                        <button type="button" className={style.qbDangerButton} disabled={!versionDeletable || deleteVersionMutation.isPending} title={translate('questionBank.catalog.versions.deleteHint')} onClick={() => void deleteVersionMutation.mutateAsync(manageVersion.id).then(() => setManageVersionId(null))}>
                                            {translate('questionBank.catalog.versions.deleteVersion')}
                                        </button>
                                    </footer>
                                </>
                            ) : null}

                            <div className={style.qbDangerZone}>
                                <div>
                                    <strong>{translate('questionBank.catalog.dangerZone')}</strong>
                                    <small>{translate('questionBank.catalog.deleteSetHint')}</small>
                                </div>
                                <button type="button" className={style.qbDangerButton} disabled={!setDeletable || deleteSetMutation.isPending} onClick={() => setDeleteSetOpen(true)}>
                                    {translate('questionBank.catalog.deleteSet')}
                                </button>
                            </div>
                        </>
                    )}
                </Dialog>
            ) : null}

            {deleteSetOpen && manageSet ? (
                <Dialog title={translate('questionBank.catalog.deleteSetConfirmTitle')} subtitle={manageSet.name} onClose={() => setDeleteSetOpen(false)}>
                    <p className={style.qbDialogText}>{translate('questionBank.catalog.deleteSetHint')}</p>
                    <footer className={style.qbDialogActions}>
                        <button type="button" className={style.qbGhostButton} onClick={() => setDeleteSetOpen(false)}>
                            {translate('questionBank.common.cancel')}
                        </button>
                        <button
                            type="button"
                            className={style.qbDangerButton}
                            disabled={deleteSetMutation.isPending}
                            onClick={() =>
                                void deleteSetMutation
                                    .mutateAsync(manageSet.id)
                                    .then(() => {
                                        setDeleteSetOpen(false);
                                        setManageSetId(null);
                                    })
                            }
                        >
                            {translate('questionBank.catalog.deleteSet')}
                        </button>
                    </footer>
                </Dialog>
            ) : null}

            {createOpen ? (
                <Dialog wide title={translate('questionBank.catalog.createTitle')} onClose={() => setCreateOpen(false)}>
                    <p className={style.qbHint}>{translate('questionBank.catalog.createHint')}</p>
                    <div className={style.qbFormGrid}>
                        <label>
                            <span>{translate('questionBank.catalog.form.name')}</span>
                            <input type="text" value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
                        </label>
                        <label>
                            <span>{translate('questionBank.catalog.form.code')}</span>
                            <input type="text" placeholder="AUTO" value={createForm.code} onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value }))} />
                        </label>
                        <label>
                            <span>{translate('questionBank.catalog.form.type')}</span>
                            <select value={createForm.type} onChange={(event) => setCreateForm((current) => ({ ...current, type: event.target.value as 'benchmark' | 'custom' }))}>
                                <option value="benchmark">{translate('questionBank.catalog.filter.benchmark')}</option>
                                <option value="custom">{translate('questionBank.catalog.filter.custom')}</option>
                            </select>
                        </label>
                    </div>
                    <p className={style.qbCardCaption}>{translate('questionBank.catalog.filter.directions')}</p>
                    <div className={style.qbChipRow}>
                        {DIRECTION_ORDER.map((direction) => (
                            <button
                                key={direction}
                                type="button"
                                className={createForm.directions.includes(direction) ? style.qbChipActive : style.qbChip}
                                onClick={() =>
                                    setCreateForm((current) => ({
                                        ...current,
                                        directions: current.directions.includes(direction) ? current.directions.filter((item) => item !== direction) : [...current.directions, direction],
                                    }))
                                }
                            >
                                {translate(directionLabelKey(direction))}
                            </button>
                        ))}
                    </div>
                    <label className={style.qbCreateDesc}>
                        <span>{translate('questionBank.catalog.form.desc')}</span>
                        <input type="text" value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <footer className={style.qbDialogActions}>
                        <button type="button" className={style.qbGhostButton} onClick={() => setCreateOpen(false)}>
                            {translate('questionBank.common.cancel')}
                        </button>
                        <button type="button" className={style.qbPrimaryButton} disabled={createMutation.isPending || createForm.name.trim().length === 0 || createForm.directions.length === 0} onClick={submitCreate}>
                            {translate('questionBank.catalog.create')}
                        </button>
                    </footer>
                </Dialog>
            ) : null}
        </div>
    );
};

export default QuestionCatalogPanel;
