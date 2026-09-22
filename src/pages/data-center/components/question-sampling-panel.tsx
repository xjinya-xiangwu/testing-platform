import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SamplingPlan, SamplingPreview } from '@/api/question-bank';
import { DEMO_PROJECT_ID, isVersionAuthorized } from '@/api/question-bank';
import { domainGate, previewSamplingRequest, useCreateSamplingPlan, useFreezeSampling, useQuestionBankSnapshot, useSetPlanStatus } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { BarList, DIRECTION_ORDER, Dialog, StatusBadge, domainLabelKey, directionLabelKey } from '@/pages/data-center/components/question-bank-shared';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

const defaultSeed = () => Math.floor(Math.random() * 9000) + 1000;

interface SamplingPanelProps {
    translate: Translate;
    /** admin = all platform plans; external = this project's plans only */
    variant: 'admin' | 'external';
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

const QuestionSamplingPanel = ({ translate, variant, snapshot }: SamplingPanelProps) => {
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [frozenNote, setFrozenNote] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [draft, setDraft] = useState(() => ({
        name: '',
        mode: 'stratified' as SamplingPlan['mode'],
        seed: defaultSeed(),
        size: 96,
        balanceField: 'dataset' as 'dataset' | 'domain' | 'difficulty',
        directions: ['vulnerability_exploitation'] as SamplingPlan['scope']['directions'],
        versionIds: ['ver-exploitgym'] as string[],
    }));

    const createMutation = useCreateSamplingPlan();
    const statusMutation = useSetPlanStatus();
    const freezeMutation = useFreezeSampling();

    const plans = useMemo(() => (snapshot?.plans ?? []).filter((plan) => (variant === 'admin' ? plan.owner === 'platform' : plan.owner === 'project')), [snapshot?.plans, variant]);
    const frozenLists = useMemo(() => (snapshot?.frozenLists ?? []).filter((record) => plans.some((plan) => plan.id === record.planId)), [plans, snapshot?.frozenLists]);
    const versions = snapshot?.versions ?? [];
    const sets = snapshot?.sets ?? [];
    const setById = new Map(sets.map((set) => [set.id, set]));

    const activePlan = selectedPlanId ? plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null : plans[0] ?? null;

    const preview: SamplingPreview | null = useMemo(() => {
        if (!activePlan) return null;
        return previewSamplingRequest({
            scope: { directions: activePlan.scope.directions, domains: [], versionIds: activePlan.scope.versionIds },
            mode: activePlan.mode,
            seed: activePlan.seed,
            size: activePlan.size,
            strata: activePlan.strata,
        });
    }, [activePlan]);

    const draftPreview: SamplingPreview | null = useMemo(() => {
        if (!createOpen || draft.versionIds.length === 0 || draft.directions.length === 0) return null;
        return previewSamplingRequest({
            scope: { directions: draft.directions, domains: [], versionIds: draft.versionIds },
            mode: draft.mode,
            seed: draft.seed,
            size: draft.size,
            strata: draft.mode === 'stratified' ? [{ field: draft.balanceField, quota: 100 }] : [],
        });
    }, [createOpen, draft]);

    const gateBlocked = useMemo(() => {
        const scopeIds = draft.versionIds;
        return scopeIds.some((versionId) => domainGate(versionId).missing > 0);
    }, [draft.versionIds]);

    const submitCreate = () => {
        const name = draft.name.trim() || translate('questionBank.sampling.create.namePlaceholder');
        void createMutation
            .mutateAsync({
                name,
                mode: draft.mode,
                seed: draft.seed,
                size: draft.size,
                strata: draft.mode === 'stratified' ? [{ field: draft.balanceField, quota: 100 }] : [],
                scope: { directions: draft.directions, versionIds: draft.versionIds },
                owner: variant === 'admin' ? 'platform' : 'project',
            })
            .then((plan) => {
                setSelectedPlanId(plan.id);
                setCreateOpen(false);
            });
    };

    const [replayNote, setReplayNote] = useState<string | null>(null);

    const freeze = () => {
        if (!activePlan || !preview) return;
        void freezeMutation.mutateAsync({ planId: activePlan.id, planName: activePlan.name, preview }).then((record) => {
            setFrozenNote(translate('questionBank.sampling.preview.frozen', { count: record.taskCount }));
        });
    };

    const replay = () => {
        if (!activePlan || !preview) return;
        const second = previewSamplingRequest({
            scope: { directions: activePlan.scope.directions, domains: [], versionIds: activePlan.scope.versionIds },
            mode: activePlan.mode,
            seed: activePlan.seed,
            size: activePlan.size,
            strata: activePlan.strata,
        });
        setReplayNote(second.selectedTaskIds.join('|') === preview.selectedTaskIds.join('|') ? translate('questionBank.sampling.replayOk') : null);
    };

    const toggleDirection = (direction: SamplingPlan['scope']['directions'][number]) => {
        setDraft((current) => ({
            ...current,
            directions: current.directions.includes(direction) ? current.directions.filter((item) => item !== direction) : [...current.directions, direction],
        }));
    };

    const toggleVersion = (versionId: string) => {
        setDraft((current) => ({
            ...current,
            versionIds: current.versionIds.includes(versionId) ? current.versionIds.filter((item) => item !== versionId) : [...current.versionIds, versionId],
        }));
    };

    return (
        <div className={style.qbPanel}>
            <header className={style.qbSectionHeader}>
                <div>
                    <h3>{translate(variant === 'admin' ? 'questionBank.sampling.title' : 'questionBank.tabs.samplingExternal')}</h3>
                    <p>{translate('questionBank.sampling.hint')}</p>
                </div>
                <button type="button" className={style.qbPrimaryButton} onClick={() => setCreateOpen(true)}>
                    {translate('questionBank.sampling.new')}
                </button>
            </header>

            <section className={style.qbCard}>
                <table className={style.qbTable}>
                    <thead>
                        <tr>
                            <th>{translate('questionBank.sampling.columns.name')}</th>
                            <th>{translate('questionBank.sampling.columns.mode')}</th>
                            <th>{translate('questionBank.sampling.columns.seed')}</th>
                            <th>{translate('questionBank.sampling.columns.size')}</th>
                            <th>{translate('questionBank.sampling.columns.status')}</th>
                            <th>{translate('questionBank.sampling.columns.references')}</th>
                            <th aria-label="actions" />
                        </tr>
                    </thead>
                    <tbody>
                        {plans.map((plan) => (
                            <tr key={plan.id} className={activePlan?.id === plan.id ? style.qbRowActive : undefined}>
                                <td>
                                    <button type="button" className={style.qbTextButton} onClick={() => setSelectedPlanId(plan.id)}>
                                        <strong>{plan.name}</strong>
                                    </button>
                                </td>
                                <td>{translate(`questionBank.sampling.mode.${plan.mode}`)}</td>
                                <td>
                                    <code>{plan.seed}</code>
                                </td>
                                <td>{plan.size}</td>
                                <td>
                                    <StatusBadge tone={plan.status === 'active' ? 'ready' : plan.status === 'draft' ? 'pending' : 'neutral'}>{translate(`questionBank.sampling.status.${plan.status}`)}</StatusBadge>
                                </td>
                                <td>{plan.references}</td>
                                <td>
                                    {plan.status === 'active' ? (
                                        <button type="button" className={style.qbTextButton} onClick={() => void statusMutation.mutateAsync({ planId: plan.id, status: 'archived' })}>
                                            {translate('questionBank.sampling.status.archived')}
                                        </button>
                                    ) : plan.status === 'draft' ? (
                                        <button type="button" className={style.qbTextButton} onClick={() => void statusMutation.mutateAsync({ planId: plan.id, status: 'active' })}>
                                            {translate('questionBank.sampling.status.active')}
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className={style.qbCard} aria-label={translate('questionBank.sampling.preview.title')}>
                <header>
                    <h4>{translate('questionBank.sampling.preview.title')}</h4>
                    {activePlan ? <span>{activePlan.name}</span> : null}
                </header>
                {!activePlan || !preview ? (
                    <p className={style.qbEmptyLine}>{translate('questionBank.sampling.preview.pickPlan')}</p>
                ) : (
                    <>
                        <div className={style.qbPreviewCounts}>
                            <div>
                                <span>{translate('questionBank.sampling.preview.candidates')}</span>
                                <b>{preview.candidateCount.toLocaleString()}</b>
                            </div>
                            <div>
                                <span>{translate('questionBank.sampling.preview.deduped')}</span>
                                <b>{preview.dedupedCount.toLocaleString()}</b>
                            </div>
                            <div>
                                <span>{translate('questionBank.sampling.preview.runnable')}</span>
                                <b>{preview.runnableCount.toLocaleString()}</b>
                            </div>
                            <div>
                                <span>{translate('questionBank.sampling.preview.nonRunnable')}</span>
                                <b>{preview.nonRunnableCount.toLocaleString()}</b>
                            </div>
                        </div>
                        {preview.nonRunnableReasons.length > 0 ? (
                            <p className={style.qbHint}>
                                {translate('questionBank.sampling.preview.reasons')}：
                                {preview.nonRunnableReasons.map((reason) => `${translate(`questionBank.sampling.preview.reason.${reason.reason}`)} ×${reason.count}`).join(' · ')}
                            </p>
                        ) : null}
                        <div className={style.qbSplit}>
                            <div>
                                <p className={style.qbCardCaption}>{translate('questionBank.sampling.preview.byDomain')}</p>
                                <BarList items={preview.byDomain.map((item) => ({ label: translate(domainLabelKey(item.key)), value: item.count }))} />
                            </div>
                            <div>
                                <p className={style.qbCardCaption}>{translate('questionBank.sampling.preview.byDataset')}</p>
                                <BarList items={preview.byDataset.map((item) => ({ label: item.label, value: item.count }))} />
                            </div>
                        </div>
                        <div className={style.qbFrozenTuple}>
                            <div>
                                <span>seed</span>
                                <code>{preview.frozenTuple.seed}</code>
                            </div>
                            <div>
                                <span>strategy</span>
                                <code>v{activePlan.strategyVersion}</code>
                            </div>
                            <div>
                                <span>data</span>
                                <code>{preview.frozenTuple.dataVersions.join(', ') || '—'}</code>
                            </div>
                            <div>
                                <span>label</span>
                                <code>{preview.frozenTuple.labelVersions.join(', ') || '—'}</code>
                            </div>
                        </div>
                        <footer className={style.qbToolbar}>
                            <span>
                                {translate('questionBank.sampling.preview.tasks', { count: preview.selectedTaskIds.length })} · {translate('questionBank.sampling.preview.reproducible')}
                            </span>
                            <div className={style.qbChipRow}>
                                <button type="button" className={style.qbGhostButton} disabled={preview.selectedTaskIds.length === 0} onClick={replay}>
                                    {translate('questionBank.sampling.replay')}
                                </button>
                                <button type="button" className={style.qbPrimaryButton} disabled={freezeMutation.isPending || preview.selectedTaskIds.length === 0} onClick={freeze}>
                                    {translate('questionBank.sampling.preview.freeze')}
                                </button>
                            </div>
                        </footer>
                        {replayNote ? <p className={style.qbSuccessLine}>{replayNote}</p> : null}
                        {frozenNote ? <p className={style.qbSuccessLine}>{frozenNote}</p> : null}
                    </>
                )}
            </section>

            {createOpen ? (
                <Dialog wide title={translate('questionBank.sampling.create.title')} onClose={() => setCreateOpen(false)}>
                    <div className={style.qbFormGrid}>
                        <label>
                            <span>{translate('questionBank.sampling.create.name')}</span>
                            <input type="text" value={draft.name} placeholder={translate('questionBank.sampling.create.namePlaceholder')} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                        </label>
                        <label>
                            <span>{translate('questionBank.sampling.create.mode')}</span>
                            <select value={draft.mode} onChange={(event) => setDraft((current) => ({ ...current, mode: event.target.value as SamplingPlan['mode'] }))}>
                                <option value="all">{translate('questionBank.sampling.mode.all')}</option>
                                <option value="random">{translate('questionBank.sampling.mode.random')}</option>
                                <option value="stratified">{translate('questionBank.sampling.mode.stratified')}</option>
                            </select>
                        </label>
                        <label>
                            <span>{translate('questionBank.sampling.create.seed')}</span>
                            <input type="number" value={draft.seed} onChange={(event) => setDraft((current) => ({ ...current, seed: Number(event.target.value) || 0 }))} />
                        </label>
                        <label>
                            <span>{translate('questionBank.sampling.create.size')}</span>
                            <input type="number" min={1} value={draft.size} disabled={draft.mode === 'all'} onChange={(event) => setDraft((current) => ({ ...current, size: Math.max(1, Number(event.target.value) || 1) }))} />
                        </label>
                    </div>
                    <p className={style.qbCardCaption}>{translate('questionBank.sampling.create.directions')}</p>
                    <div className={style.qbChipRow}>
                        {DIRECTION_ORDER.map((direction) => (
                            <button key={direction} type="button" className={draft.directions.includes(direction) ? style.qbChipActive : style.qbChip} onClick={() => toggleDirection(direction)}>
                                {translate(directionLabelKey(direction))}
                            </button>
                        ))}
                    </div>
                    <p className={style.qbCardCaption}>{translate('questionBank.sampling.create.datasets')}</p>
                    <div className={style.qbChipRow}>
                        {versions
                            .filter((version) => {
                                if (variant === 'admin') return version.lifecycle === 'published';
                                const ownerSet = sets.find((set) => set.id === version.setId);
                                return isVersionAuthorized(version, ownerSet, DEMO_PROJECT_ID);
                            })
                            .map((version) => (
                                <button key={version.id} type="button" className={draft.versionIds.includes(version.id) ? style.qbChipActive : style.qbChip} onClick={() => toggleVersion(version.id)}>
                                    {setById.get(version.setId)?.name ?? version.setId} · {version.releaseVersion}
                                </button>
                            ))}
                    </div>
                    {draft.directions.length > 1 ? <p className={style.qbDangerLine}>{translate('questionBank.sampling.create.multiDirectionHint')}</p> : null}
                    {draft.mode === 'stratified' ? (
                        <>
                            <p className={style.qbCardCaption}>{translate('questionBank.sampling.create.balanceField')}</p>
                            <div className={style.qbChipRow}>
                                {(['dataset', 'domain', 'difficulty'] as const).map((field) => (
                                    <button key={field} type="button" className={draft.balanceField === field ? style.qbChipActive : style.qbChip} onClick={() => setDraft((current) => ({ ...current, balanceField: field }))}>
                                        {translate(`questionBank.sampling.create.balance.${field}`)}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : null}
                    {gateBlocked ? <p className={style.qbDangerLine}>{translate('questionBank.sampling.preview.gateBlocked')}</p> : null}
                    {draftPreview ? (
                        <div className={style.qbPreviewCounts}>
                            <div>
                                <span>{translate('questionBank.sampling.preview.candidates')}</span>
                                <b>{draftPreview.candidateCount.toLocaleString()}</b>
                            </div>
                            <div>
                                <span>{translate('questionBank.sampling.preview.deduped')}</span>
                                <b>{draftPreview.dedupedCount.toLocaleString()}</b>
                            </div>
                            <div>
                                <span>{translate('questionBank.sampling.preview.runnable')}</span>
                                <b>{draftPreview.runnableCount.toLocaleString()}</b>
                            </div>
                            <div>
                                <span>{translate('questionBank.sampling.preview.nonRunnable')}</span>
                                <b>{draftPreview.nonRunnableCount.toLocaleString()}</b>
                            </div>
                        </div>
                    ) : null}
                    <footer className={style.qbDialogActions}>
                        <button type="button" className={style.qbGhostButton} onClick={() => setCreateOpen(false)}>
                            {translate('questionBank.common.cancel')}
                        </button>
                        <button type="button" className={style.qbPrimaryButton} disabled={createMutation.isPending || draft.directions.length === 0 || draft.versionIds.length === 0} onClick={submitCreate}>
                            {translate('questionBank.sampling.create.submit')}
                        </button>
                    </footer>
                </Dialog>
            ) : null}

            <section className={style.qbCard} aria-label={translate('questionBank.sampling.frozen.title')}>
                <header>
                    <h4>{translate('questionBank.sampling.frozen.title')}</h4>
                    <Link className={style.qbTextButton} to="/tasks?type=code">
                        {translate('questionBank.sampling.frozen.gotoTask')}
                    </Link>
                </header>
                {frozenLists.length === 0 ? (
                    <p className={style.qbEmptyLine}>{translate('questionBank.sampling.frozen.empty')}</p>
                ) : (
                    <table className={style.qbTable}>
                        <thead>
                            <tr>
                                <th>{translate('questionBank.sampling.frozen.columns.plan')}</th>
                                <th>{translate('questionBank.sampling.frozen.columns.tasks')}</th>
                                <th>{translate('questionBank.sampling.frozen.columns.seed')}</th>
                                <th>{translate('questionBank.sampling.frozen.columns.time')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {frozenLists.map((record) => (
                                <tr key={record.id}>
                                    <td>
                                        <strong>{record.planName}</strong>
                                        <small>{record.dataVersions.join(', ')}</small>
                                    </td>
                                    <td>{record.taskCount}</td>
                                    <td>
                                        <code>{record.seed}</code>
                                    </td>
                                    <td>{new Date(record.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
};

export default QuestionSamplingPanel;
