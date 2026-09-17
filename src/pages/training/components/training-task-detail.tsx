import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDialogFocus from '@/hooks/useDialogFocus';
import useTranslate from '@/hooks/useTranslate';
import { useTrainingTaskDetail } from '@/pages/training/hooks/use-training-tasks';
import { advanceTrainingTelemetry, createTrainingTelemetry } from '@/pages/training/training-telemetry';
import { getOptionLabelKey, TRAINING_DATASETS, TRAINING_STATUSES, TRAINING_TYPES } from '@/pages/training/training-options';
import style from '@/pages/training/training.module.less';

interface TrainingTaskDetailProps {
    taskId: string;
}

const getPolyline = (values: readonly number[]) => {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const span = maximum - minimum || 1;
    return values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${38 - ((value - minimum) / span) * 32}`).join(' ');
};

const TrainingTaskDetail = ({ taskId }: TrainingTaskDetailProps) => {
    const translate = useTranslate();
    const navigate = useNavigate();
    const detailQuery = useTrainingTaskDetail(taskId);
    const [telemetry, setTelemetry] = useState(() => createTrainingTelemetry(taskId));
    const close = () => navigate('/training');
    const dialogRef = useDialogFocus<HTMLElement>(true, close);

    useEffect(() => {
        setTelemetry(createTrainingTelemetry(taskId));
    }, [taskId]);

    useEffect(() => {
        const status = detailQuery.data?.status;
        if (status !== 1 && status !== 2) return undefined;
        const timer = window.setInterval(() => setTelemetry((snapshot) => advanceTrainingTelemetry(snapshot)), 2000);
        return () => window.clearInterval(timer);
    }, [detailQuery.data?.status]);

    const metricGroups = useMemo(() => ['effect', 'quality', 'stability', 'efficiency'] as const, []);

    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.detailDialog} role="dialog" aria-modal="true" aria-labelledby="training-detail-title" tabIndex={-1}>
                <header className={style.dialogHeader}>
                    <div>
                        <h2 id="training-detail-title">{translate('training.detail.title')}</h2>
                        <p>{taskId}</p>
                    </div>
                    <button type="button" aria-label={translate('common.close')} onClick={close}>
                        ×
                    </button>
                </header>

                {detailQuery.isLoading ? <p className={style.feedback}>{translate('common.loading')}</p> : null}
                {detailQuery.error ? (
                    <div className={style.feedback} role="alert">
                        <span>{translate('training.errors.detail')}</span>
                        <button type="button" onClick={() => detailQuery.refetch()}>
                            {translate('common.retry')}
                        </button>
                    </div>
                ) : null}

                {detailQuery.data ? (
                    <div className={style.detailBody}>
                        <section className={style.detailSummary}>
                            <div>
                                <span>{translate('training.table.status')}</span>
                                <strong>{translate(getOptionLabelKey(TRAINING_STATUSES, detailQuery.data.status))}</strong>
                            </div>
                            <div>
                                <span>{translate('training.table.type')}</span>
                                <strong>{translate(getOptionLabelKey(TRAINING_TYPES, detailQuery.data.type))}</strong>
                            </div>
                            <div>
                                <span>{translate('training.table.dataset')}</span>
                                <strong>{translate(getOptionLabelKey(TRAINING_DATASETS, detailQuery.data.dataset))}</strong>
                            </div>
                            <div>
                                <span>{translate('training.table.progress')}</span>
                                <strong>{detailQuery.data.progress}%</strong>
                                <small>{translate('training.progress.steps', { step: detailQuery.data.step.toLocaleString(), total: detailQuery.data.total.toLocaleString() })}</small>
                            </div>
                        </section>

                        <section>
                            <h3>{translate('training.detail.configuration')}</h3>
                            <dl className={style.configurationGrid}>
                                <div>
                                    <dt>{translate('training.wizard.base')}</dt>
                                    <dd>{detailQuery.data.base}</dd>
                                </div>
                                <div>
                                    <dt>{translate('training.wizard.framework')}</dt>
                                    <dd>{detailQuery.data.framework.toUpperCase()}</dd>
                                </div>
                                <div>
                                    <dt>{translate('training.wizard.algorithm')}</dt>
                                    <dd>{detailQuery.data.rlAlgorithm?.toUpperCase() || translate('training.emptyValue')}</dd>
                                </div>
                                <div>
                                    <dt>{translate('training.wizard.gpu')}</dt>
                                    <dd>{detailQuery.data.gpu.map((gpu) => `${gpu.count}×${gpu.model}`).join(' + ')}</dd>
                                </div>
                            </dl>
                        </section>

                        <section className={style.mockSection}>
                            <header>
                                <h3>{translate('training.detail.metrics')}</h3>
                                <span>{translate('training.detail.mockBadge')}</span>
                            </header>
                            {metricGroups.map((group) => (
                                <div key={group} className={style.metricGroup}>
                                    <h4>{translate(`training.metricGroup.${group}`)}</h4>
                                    <div className={style.metricGrid}>
                                        {telemetry.series
                                            .filter((metric) => metric.group === group)
                                            .map((metric) => (
                                                <article key={metric.id} className={style.metricCard}>
                                                    <header>
                                                        <span>{metric.id}</span>
                                                        <strong>{(metric.values.at(-1) ?? 0).toFixed(metric.id.includes('response_len') ? 0 : 3)}</strong>
                                                    </header>
                                                    <svg viewBox="0 0 100 40" role="img" aria-label={metric.id} preserveAspectRatio="none">
                                                        <polyline points={getPolyline(metric.values)} />
                                                    </svg>
                                                </article>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className={style.mockSection}>
                            <header>
                                <h3>{translate('training.detail.gpu')}</h3>
                                <span>{translate('training.detail.mockBadge')}</span>
                            </header>
                            <div className={style.gpuGrid}>
                                {telemetry.gpu.map((gpu) => (
                                    <article key={gpu.id}>
                                        <span>{gpu.id}</span>
                                        <strong>{gpu.utilization}%</strong>
                                        <progress max={100} value={gpu.utilization} />
                                        <small>{translate('training.detail.gpuMeta', { temperature: gpu.temperature, power: gpu.power })}</small>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className={style.mockSection}>
                            <header>
                                <h3>{translate('training.detail.logs')}</h3>
                                <span>{translate('training.detail.mockBadge')}</span>
                            </header>
                            <div className={style.terminal}>
                                {telemetry.logs.map((log, index) => (
                                    <p key={`${index}-${log}`}>{translate(log, { sample: telemetry.sample })}</p>
                                ))}
                            </div>
                        </section>
                    </div>
                ) : null}

                <footer className={style.dialogFooter}>
                    <button type="button" onClick={close}>
                        {translate('training.detail.back')}
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default TrainingTaskDetail;
