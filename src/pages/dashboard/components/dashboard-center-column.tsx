import { Link } from 'react-router-dom';
import { IDashboardData } from '@/api/dashboard';
import DashboardCard from '@/pages/dashboard/components/dashboard-card';
import style from '@/pages/dashboard/dashboard.module.less';

interface DashboardCenterColumnProps {
    data: IDashboardData;
    eventCursor: number;
    eventTimelineEnteredAt: number;
    eventTimelineSeed: number;
    eventTimelineStartCursor: number;
    isTopologyError?: boolean;
    isTopologyLoading?: boolean;
    refetchTopology?: () => void;
    topology?: unknown;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const MAX_VISIBLE_EVENTS = 4;
const MAX_EVENT_INTERVAL_SECONDS = 2;
const MAX_UNSIGNED_32_BIT_INTEGER = 0xffffffff;

const FLOW_STEPS = [
    ['01', 'dashboard.flow.project', 'dashboard.flow.projectDetail'],
    ['02', 'dashboard.flow.benchmark', 'dashboard.flow.benchmarkDetail'],
    ['03', 'dashboard.flow.subject', 'dashboard.flow.subjectDetail'],
    ['04', 'dashboard.flow.task', 'dashboard.flow.taskDetail'],
    ['05', 'dashboard.flow.run', 'dashboard.flow.runDetail'],
    ['06', 'dashboard.flow.review', 'dashboard.flow.reviewDetail'],
    ['07', 'dashboard.flow.delivery', 'dashboard.flow.deliveryDetail'],
] as const;

const getEventIntervalSeconds = (seed: number, timelineIndex: number) => {
    let value = (seed ^ Math.imul(timelineIndex + 0x9e3779b9, 0x85ebca6b)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0xc2b2ae35) >>> 0;
    return (value / MAX_UNSIGNED_32_BIT_INTEGER) * MAX_EVENT_INTERVAL_SECONDS;
};

const getEventTime = (enteredAt: number, seed: number, timelineIndex: number) => {
    let offsetSeconds = 0;
    if (timelineIndex > 0) {
        for (let index = 1; index <= timelineIndex; index += 1) offsetSeconds += getEventIntervalSeconds(seed, index);
    } else {
        for (let index = 0; index > timelineIndex; index -= 1) offsetSeconds -= getEventIntervalSeconds(seed, index);
    }
    return new Date(enteredAt + offsetSeconds * 1_000).toLocaleTimeString(undefined, { hour12: false });
};

const DashboardCenterColumn = ({ data, eventCursor, eventTimelineEnteredAt, eventTimelineSeed, eventTimelineStartCursor, translate }: DashboardCenterColumnProps) => {
    const visibleEventCount = Math.min(MAX_VISIBLE_EVENTS, data.events.length);
    const visibleEvents = Array.from({ length: visibleEventCount }, (_, index) => {
        const event = data.events[(eventCursor + index) % data.events.length];
        const timelineIndex = eventCursor - eventTimelineStartCursor + index - (visibleEventCount - 1);
        return { event, time: getEventTime(eventTimelineEnteredAt, eventTimelineSeed, timelineIndex) };
    });

    return (
        <div className={style.column}>
            <DashboardCard title={translate('dashboard.flow.title')} subtitle={translate('dashboard.flow.subtitle')}>
                <div className={style.evaluationFlow}>
                    <div className={style.flowStatusBar}>
                        <span>{translate('dashboard.flow.scope')}</span>
                        <strong>{translate('dashboard.flow.scopeValue')}</strong>
                        <em>{translate('dashboard.flow.demo')}</em>
                    </div>
                    <ol className={style.flowTrack}>
                        {FLOW_STEPS.map(([number, titleKey, detailKey], index) => (
                            <li key={number}>
                                <span>{number}</span>
                                <div>
                                    <strong>{translate(titleKey)}</strong>
                                    <small>{translate(detailKey)}</small>
                                </div>
                                {index < FLOW_STEPS.length - 1 ? <i aria-hidden="true">›</i> : null}
                            </li>
                        ))}
                    </ol>
                    <section className={style.flowSnapshot} aria-label={translate('dashboard.flow.snapshotTitle')}>
                        <header>
                            <div>
                                <small>{translate('dashboard.flow.snapshotTitle')}</small>
                                <strong>EVAL-20260916-017</strong>
                            </div>
                            <span>{translate('dashboard.flow.running')}</span>
                        </header>
                        <dl>
                            <div>
                                <dt>{translate('dashboard.flow.object')}</dt>
                                <dd>Mythos-Attack-v2</dd>
                            </div>
                            <div>
                                <dt>Benchmark</dt>
                                <dd>ExploitGym v1.3</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.flow.samples')}</dt>
                                <dd>32 / 50</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.flow.environment')}</dt>
                                <dd>Docker Sandbox</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.flow.grader')}</dt>
                                <dd>Exploit Validator</dd>
                            </div>
                            <div>
                                <dt>{translate('dashboard.flow.policy')}</dt>
                                <dd>{translate('dashboard.flow.policyValue')}</dd>
                            </div>
                        </dl>
                        <div className={style.flowProgress}>
                            <progress max={100} value={64} />
                            <span>64%</span>
                        </div>
                    </section>
                    <div className={style.flowActions}>
                        <Link to="/tasks?type=code">{translate('nav.codeEvaluation')}</Link>
                        <Link to="/tasks?type=range">{translate('nav.rangeEvaluation')}</Link>
                    </div>
                </div>
            </DashboardCard>

            <DashboardCard title={translate('dashboard.events.title')} subtitle={translate('dashboard.events.live')}>
                <ol className={style.eventStream} role="log" aria-live="polite">
                    {visibleEvents.map(({ event, time }, index) => (
                        <li key={`${event.id}-${eventCursor}-${index}`} className={style[`event${event.level}`]}>
                            <b>
                                <span aria-hidden="true">[</span>
                                <span>{event.level}</span>
                                <span aria-hidden="true">]</span>
                            </b>
                            <time>{time}</time>
                            <span>{translate(event.messageKey)}</span>
                        </li>
                    ))}
                </ol>
            </DashboardCard>
        </div>
    );
};

export default DashboardCenterColumn;
