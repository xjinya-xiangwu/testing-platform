import { useState } from 'react';
import type { ExportRequest, ImportJob, ImportStage } from '@/api/question-bank';
import { DEMO_PROJECT_ID, isVersionAuthorized } from '@/api/question-bank';
import { useCreateExportRequest, useDecideExportRequest, useDownloadExport, useQuestionBankSnapshot, useRevokeExport, useStartImportJob } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import { Dialog, StatusBadge } from '@/pages/data-center/components/question-bank-shared';
import style from '@/pages/data-center/data-center.module.less';

type Translate = ReturnType<typeof useTranslate>;

const IMPORT_STAGES: ImportStage[] = ['structure', 'content', 'security', 'dryrun'];

const importTone = (status: ImportJob['status']): 'ready' | 'danger' | 'accent' => (status === 'passed' ? 'ready' : status === 'failed' ? 'danger' : 'accent');
const exportTone = (status: ExportRequest['status']): 'ready' | 'accent' | 'danger' | 'neutral' => (status === 'approved' ? 'ready' : status === 'pending' ? 'accent' : status === 'revoked' ? 'danger' : 'neutral');

interface TransferPanelProps {
    translate: Translate;
    /** admin = import pipeline + export approval; external = own export requests only */
    variant: 'admin' | 'external';
    snapshot: ReturnType<typeof useQuestionBankSnapshot>['data'];
}

const QuestionTransferPanel = ({ translate, variant, snapshot }: TransferPanelProps) => {
    const isAdmin = variant === 'admin';
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [draft, setDraft] = useState({ objectType: 'task_list' as ExportRequest['objectType'], targetLabel: '', purpose: '', recipient: '' });

    const importMutation = useStartImportJob();
    const exportMutation = useCreateExportRequest();
    const decideMutation = useDecideExportRequest();
    const downloadMutation = useDownloadExport();
    const revokeMutation = useRevokeExport();

    const importJobs = snapshot?.importJobs ?? [];
    const exportRequests = snapshot?.exportRequests ?? [];
    const versions = snapshot?.versions ?? [];
    const sets = snapshot?.sets ?? [];
    const setById = new Map(sets.map((set) => [set.id, set]));
    // Export targets are selectable, not free text (pm-critic F-03): the approver
    // must be able to verify the object's authorization scope.
    const exportTargets = versions.filter((version) => isAdmin || isVersionAuthorized(version, setById.get(version.setId), DEMO_PROJECT_ID));

    const submitExport = () => {
        void exportMutation.mutateAsync(draft).then(() => {
            setExportDialogOpen(false);
            setDraft({ objectType: 'task_list', targetLabel: '', purpose: '', recipient: '' });
        });
    };

    return (
        <div className={style.qbPanel}>
            <header className={style.qbSectionHeader}>
                <div>
                    <h3>{translate(isAdmin ? 'questionBank.transfer.title' : 'questionBank.tabs.transferExternal')}</h3>
                    <p>{translate(isAdmin ? 'questionBank.transfer.hint' : 'questionBank.transfer.export.sanitizeNote')}</p>
                </div>
                <button type="button" className={style.qbPrimaryButton} onClick={() => setExportDialogOpen(true)}>
                    {translate('questionBank.transfer.export.new')}
                </button>
            </header>

            {isAdmin ? (
                <section className={style.qbCard} aria-label={translate('questionBank.transfer.imports')}>
                <header>
                    <h4>{translate('questionBank.transfer.imports')}</h4>
                    {isAdmin ? (
                        <div className={style.qbChipRow}>
                            <button type="button" className={style.qbChip} disabled={importMutation.isPending} onClick={() => void importMutation.mutateAsync({ fileName: `qbank-${Date.now() % 10000}.tar.zst`, sizeMb: 1536 })}>
                                {translate('questionBank.transfer.import.simulate')}
                            </button>
                            <button type="button" className={style.qbChip} disabled={importMutation.isPending} onClick={() => void importMutation.mutateAsync({ fileName: `qbank-clean-${Date.now() % 10000}.tar.zst`, sizeMb: 980 })}>
                                {translate('questionBank.transfer.import.simulateClean')}
                            </button>
                        </div>
                    ) : null}
                </header>
                <table className={style.qbTable}>
                    <thead>
                        <tr>
                            <th>{translate('questionBank.transfer.import.columns.file')}</th>
                            <th>{translate('questionBank.transfer.import.columns.channel')}</th>
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
                                    {job.createdVersionId ? <small className={style.qbSuccessInline}>{translate('questionBank.transfer.import.createdVersion')}</small> : null}
                                    {IMPORT_STAGES.filter((stage) => job.stageIssues[stage].length > 0).flatMap((stage) =>
                                        job.stageIssues[stage].map((issue, index) => (
                                            <small key={`${stage}-${index}`} className={style.qbDangerInline}>
                                                {translate(`questionBank.transfer.import.stage.${stage}`)} · {translate('questionBank.transfer.import.issueLine', { file: issue.file, line: issue.line })} · {issue.message}
                                            </small>
                                        )),
                                    )}
                                </td>
                                <td>{job.channel}</td>
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
                <p className={style.qbHint}>{translate('questionBank.transfer.import.format')}</p>
            </section>
            ) : null}

            <section className={style.qbCard} aria-label={translate('questionBank.transfer.exports')}>
                <header>
                    <h4>{translate('questionBank.transfer.exports')}</h4>
                    <span>{exportRequests.length}</span>
                </header>
                <table className={style.qbTable}>
                    <thead>
                        <tr>
                            <th>{translate('questionBank.transfer.export.columns.target')}</th>
                            <th>{translate('questionBank.transfer.export.columns.purpose')}</th>
                            <th>{translate('questionBank.transfer.export.columns.recipient')}</th>
                            <th>{translate('questionBank.transfer.export.columns.hash')}</th>
                            <th>{translate('questionBank.transfer.export.columns.expires')}</th>
                            <th>{translate('questionBank.transfer.export.columns.downloads')}</th>
                            <th>{translate('questionBank.transfer.export.columns.status')}</th>
                            <th aria-label="actions" />
                        </tr>
                    </thead>
                    <tbody>
                        {exportRequests.map((request) => (
                            <tr key={request.id}>
                                <td>
                                    <strong>{request.targetLabel}</strong>
                                    <small>{translate(`questionBank.transfer.export.create.object.${request.objectType}`)}</small>
                                </td>
                                <td>{request.purpose}</td>
                                <td>{request.recipient}</td>
                                <td>{request.manifestHash ? <code>{request.manifestHash.slice(0, 19)}…</code> : '—'}</td>
                                <td>{request.expiresAt ? request.expiresAt.slice(0, 10) : '—'}</td>
                                <td>{request.downloads}</td>
                                <td>
                                    <StatusBadge tone={exportTone(request.status)}>{translate(`questionBank.transfer.export.status.${request.status}`)}</StatusBadge>
                                </td>
                                <td>
                                    <div className={style.qbChipRow}>
                                        {isAdmin && request.status === 'pending' ? (
                                            <>
                                                <button type="button" className={style.qbTextButton} onClick={() => void decideMutation.mutateAsync({ requestId: request.id, decision: 'approved' })}>
                                                    {translate('questionBank.transfer.export.approve')}
                                                </button>
                                                <button type="button" className={style.qbTextButton} onClick={() => void decideMutation.mutateAsync({ requestId: request.id, decision: 'rejected' })}>
                                                    {translate('questionBank.transfer.export.reject')}
                                                </button>
                                            </>
                                        ) : null}
                                        {request.status === 'approved' ? (
                                            <>
                                                <button type="button" className={style.qbTextButton} disabled={downloadMutation.isPending} onClick={() => void downloadMutation.mutateAsync(request.id)}>
                                                    {translate('questionBank.transfer.export.download')}
                                                </button>
                                                {isAdmin ? (
                                                    <button type="button" className={style.qbTextButton} onClick={() => void revokeMutation.mutateAsync(request.id)}>
                                                        {translate('questionBank.transfer.export.revoke')}
                                                    </button>
                                                ) : null}
                                            </>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className={style.qbHint}>{translate('questionBank.transfer.export.sanitizeNote')}</p>
            </section>

            {exportDialogOpen ? (
                <Dialog title={translate('questionBank.transfer.export.create.title')} onClose={() => setExportDialogOpen(false)}>
                    <div className={style.qbFormGrid}>
                        <label>
                            <span>{translate('questionBank.transfer.export.create.objectType')}</span>
                            <select value={draft.objectType} onChange={(event) => setDraft((current) => ({ ...current, objectType: event.target.value as ExportRequest['objectType'] }))}>
                                <option value="version_metadata">{translate('questionBank.transfer.export.create.object.version_metadata')}</option>
                                <option value="task_list">{translate('questionBank.transfer.export.create.object.task_list')}</option>
                                <option value="dataset">{translate('questionBank.transfer.export.create.object.dataset')}</option>
                            </select>
                        </label>
                        <label>
                            <span>{translate('questionBank.transfer.export.create.target')}</span>
                            <select value={draft.targetLabel} onChange={(event) => setDraft((current) => ({ ...current, targetLabel: event.target.value }))}>
                                <option value="">—</option>
                                {exportTargets.map((version) => (
                                    <option key={version.id} value={`${setById.get(version.setId)?.name ?? version.setId} · ${version.releaseVersion}`}>
                                        {setById.get(version.setId)?.name ?? version.setId} · {version.releaseVersion}
                                    </option>
                                ))}
                            </select>
                            <small>{translate('questionBank.transfer.export.create.targetHint')}</small>
                        </label>
                        <label>
                            <span>{translate('questionBank.transfer.export.create.purpose')}</span>
                            <input type="text" value={draft.purpose} placeholder={translate('questionBank.transfer.export.create.purposePlaceholder')} onChange={(event) => setDraft((current) => ({ ...current, purpose: event.target.value }))} />
                        </label>
                        <label>
                            <span>{translate('questionBank.transfer.export.create.recipient')}</span>
                            <input type="text" value={draft.recipient} placeholder={translate('questionBank.transfer.export.create.recipientPlaceholder')} onChange={(event) => setDraft((current) => ({ ...current, recipient: event.target.value }))} />
                        </label>
                    </div>
                    <footer className={style.qbDialogActions}>
                        <button type="button" className={style.qbGhostButton} onClick={() => setExportDialogOpen(false)}>
                            {translate('questionBank.common.cancel')}
                        </button>
                        <button type="button" className={style.qbPrimaryButton} disabled={exportMutation.isPending || draft.targetLabel.trim().length === 0 || draft.purpose.trim().length === 0} onClick={submitExport}>
                            {translate('questionBank.transfer.export.create.submit')}
                        </button>
                    </footer>
                </Dialog>
            ) : null}
        </div>
    );
};

export default QuestionTransferPanel;
