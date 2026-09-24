import type { ReactNode } from 'react';
import classNames from 'classnames';
import { useEffect, useRef } from 'react';
import type { EvaluationDirection, PrecheckFailReason, TargetDomain, VersionLifecycle } from '@/api/question-bank';
import style from '@/pages/data-center/data-center.module.less';

export const directionLabelKey = (direction: EvaluationDirection) => `questionBank.common.direction.${direction}`;
export const domainLabelKey = (domain: TargetDomain) => `questionBank.common.domain.${domain}`;

export const DOMAIN_ORDER: TargetDomain[] = ['web_application', 'userspace_software', 'browser_engine', 'operating_system', 'cloud_infrastructure', 'network_protocol', 'other'];

export const DIRECTION_ORDER: EvaluationDirection[] = ['vulnerability_discovery', 'vulnerability_exploitation', 'vulnerability_repair'];

export const LIFECYCLE_ORDER: VersionLifecycle[] = ['draft', 'structured', 'labeled', 'verified', 'published', 'retired'];

export const precheckReasonKey = (reason: PrecheckFailReason) => `questionBank.sampling.preview.reason.${reason}`;

type Tone = 'neutral' | 'ready' | 'pending' | 'danger' | 'accent';

export const StatusBadge = ({ tone, children }: { tone: Tone; children: ReactNode }) => <b className={classNames(style.qbBadge, style[`qbTone-${tone}`])}>{children}</b>;

export const StatCard = ({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) => (
    <article className={style.qbStat}>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
    </article>
);

export const ProgressBar = ({ value, tone = 'accent' }: { value: number; tone?: Tone }) => (
    <span className={style.qbProgressTrack} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
        <i className={classNames(style[`qbTone-${tone}`])} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </span>
);

export const BarList = ({ items, emptyLabel }: { items: { label: string; value: number }[]; emptyLabel?: string }) => {
    const max = Math.max(1, ...items.map((item) => item.value));
    if (items.length === 0) return <p className={style.qbEmptyLine}>{emptyLabel}</p>;
    return (
        <ul className={style.qbBarList}>
            {items.map((item) => (
                <li key={item.label}>
                    <span>{item.label}</span>
                    <i style={{ width: `${(item.value / max) * 100}%` }} />
                    <b>{item.value.toLocaleString()}</b>
                </li>
            ))}
        </ul>
    );
};

export const Dialog = ({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) => {
    const dialogRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        dialogRef.current?.focus();
    }, []);
    return (
        <div className={style.qbBackdrop} onClick={onClose}>
            <section className={classNames(style.qbDialog, wide && style.qbDialogWide)} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()} ref={dialogRef} tabIndex={-1}>
                <header>
                    <div>
                        <h2>{title}</h2>
                        {subtitle ? <p>{subtitle}</p> : null}
                    </div>
                    <button type="button" aria-label="close" onClick={onClose}>
                        ×
                    </button>
                </header>
                <div className={style.qbDialogBody}>{children}</div>
            </section>
        </div>
    );
};

export const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className={style.qbFieldRow}>
        <dt>{label}</dt>
        <dd>{children}</dd>
    </div>
);
