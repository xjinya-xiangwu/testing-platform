import { DASHBOARD_OVERVIEW } from '@/config/cgi';
import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';

export type DashboardEventLevel = 'INFO' | 'WARN' | 'ERROR';

export interface IDashboardMetric {
    id: string;
    labelKey: string;
    trendKey: string;
    unitKey: string;
    value?: number;
    displayValue?: string;
}

export interface IDashboardModelRankEntry {
    isCurrent?: boolean;
    name: string;
    nameKey?: string;
    rank: string;
    score: string;
}

export interface IDashboardModelLeaderboard {
    categoryKey: string;
    descriptionKey: string;
    entries: readonly IDashboardModelRankEntry[];
    id: string;
    leadKey: string;
    metricKey: string;
    metricValue: string;
    name: string;
}

export interface IDashboardCapability {
    efficiency: {
        bars: readonly { labelKey: string; value: number }[];
        costYuan: number;
        timeSeconds: number;
        tokenThousands: number;
    };
    name: string;
    radar: readonly number[];
    scenarioKey: string;
}

export interface IDashboardRadar {
    baseline: readonly number[];
    dimensionKeys: readonly string[];
}

export interface IDashboardEvent {
    id: string;
    level: DashboardEventLevel;
    messageKey: string;
}

export interface IDashboardData {
    capabilities: readonly IDashboardCapability[];
    events: readonly IDashboardEvent[];
    metrics: readonly IDashboardMetric[];
    modelLeaderboards: readonly IDashboardModelLeaderboard[];
    radar: IDashboardRadar;
    taskRing: { completionPercent?: number; doneToday?: number; queued?: number; running?: number; total?: number };
}

interface IDashboardOverview {
    evaluation_status: {
        completed_today: number;
        queued: number;
        running: number;
        total: number;
    };
    generated_at: string;
    summary?: {
        attack_event_today_count: number;
        combat_drill_count: number;
        online_instance_count: number;
        range_environment_total: number;
        running_evaluation_count: number;
        training_today_count: number;
    };
}

const DASHBOARD_PRESENTATION_DATA: IDashboardData = {
    metrics: [
        { id: 'sandboxes', labelKey: 'dashboard.home.metrics.environments', unitKey: 'unit.items', trendKey: 'dashboard.trend.assetScope', displayValue: '10+' },
        { id: 'benchmarks', labelKey: 'dashboard.home.metrics.benchmarks', unitKey: 'unit.items', trendKey: 'dashboard.trend.published', displayValue: '100+' },
        { id: 'subjects', labelKey: 'dashboard.home.metrics.tasks', unitKey: 'unit.entries', trendKey: 'dashboard.trend.verified', displayValue: '10,000+' },
        { id: 'runs', labelKey: 'dashboard.home.metrics.running', unitKey: 'unit.entries', trendKey: 'dashboard.trend.running', value: 7 },
        { id: 'reports', labelKey: 'dashboard.home.metrics.completed', unitKey: 'unit.entries', trendKey: 'dashboard.trend.deliverable', value: 3 },
    ],
    modelLeaderboards: [],
    radar: { dimensionKeys: [], baseline: [] },
    capabilities: [],
    events: [
        { id: 'ev-01', level: 'INFO', messageKey: 'dashboard.event.info.snapshotFrozen' },
        { id: 'ev-02', level: 'WARN', messageKey: 'dashboard.event.warn.reviewQueued' },
        { id: 'ev-03', level: 'INFO', messageKey: 'dashboard.event.info.agentVerified' },
        { id: 'ev-04', level: 'ERROR', messageKey: 'dashboard.event.error.environmentRetry' },
    ],
    taskRing: { total: 12, running: 7, queued: 2, doneToday: 3, completionPercent: 25 },
};
const clonePresentationData = (): IDashboardData => {
    return {
        ...DASHBOARD_PRESENTATION_DATA,
        capabilities: DASHBOARD_PRESENTATION_DATA.capabilities.map((capability) => ({
            ...capability,
            efficiency: {
                ...capability.efficiency,
                bars: capability.efficiency.bars.map((bar) => ({ ...bar })),
            },
            radar: [...capability.radar],
        })),
        events: DASHBOARD_PRESENTATION_DATA.events.map((item) => ({ ...item })),
        metrics: DASHBOARD_PRESENTATION_DATA.metrics.map((item) => ({ ...item })),
        modelLeaderboards: DASHBOARD_PRESENTATION_DATA.modelLeaderboards.map((leaderboard) => ({
            ...leaderboard,
            entries: leaderboard.entries.map((entry) => ({ ...entry })),
        })),
        radar: {
            baseline: [...DASHBOARD_PRESENTATION_DATA.radar.baseline],
            dimensionKeys: [...DASHBOARD_PRESENTATION_DATA.radar.dimensionKeys],
        },
        taskRing: { ...DASHBOARD_PRESENTATION_DATA.taskRing },
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonNegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

const SUMMARY_FIELDS = ['range_environment_total', 'online_instance_count', 'training_today_count', 'running_evaluation_count', 'combat_drill_count', 'attack_event_today_count'] as const;
const EVALUATION_FIELDS = ['total', 'running', 'queued', 'completed_today'] as const;

const isDashboardOverview = (value: unknown): value is IDashboardOverview => {
    if (!isRecord(value) || typeof value.generated_at !== 'string' || !isRecord(value.evaluation_status)) return false;
    const evaluationStatus = value.evaluation_status;
    if (!EVALUATION_FIELDS.every((field) => isNonNegativeInteger(evaluationStatus[field]))) return false;
    const summary = value.summary;
    if (summary === undefined) return true;
    if (!isRecord(summary)) return false;
    return SUMMARY_FIELDS.every((field) => isNonNegativeInteger(summary[field]));
};

const calculateCompletionPercent = (completedToday: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (completedToday / total) * 100));
};

export const createDashboardFallbackData = (): IDashboardData => clonePresentationData();

export const adaptDashboardOverview = (overview: unknown): IDashboardData => {
    if (!isDashboardOverview(overview)) throw new Error('Invalid dashboard overview response');

    const data = clonePresentationData();

    return {
        ...data,
        metrics: data.metrics.map((metric) => {
            if (metric.id === 'runs') return { ...metric, value: overview.evaluation_status.running };
            if (metric.id === 'reports') return { ...metric, value: overview.evaluation_status.completed_today };
            return metric;
        }),
        taskRing: {
            total: overview.evaluation_status.total,
            running: overview.evaluation_status.running,
            queued: overview.evaluation_status.queued,
            doneToday: overview.evaluation_status.completed_today,
            completionPercent: calculateCompletionPercent(overview.evaluation_status.completed_today, overview.evaluation_status.total),
        },
    };
};

export const getDashboardData = async (): Promise<IDashboardData> => {
    if (IS_DEMO_MODE) return createDashboardFallbackData();
    const response = await Http.get<never, unknown>(DASHBOARD_OVERVIEW, { forbidMsg: true });
    if (response.data === null || response.data === undefined || (response.code !== undefined && response.code !== 0 && response.code !== '0')) {
        throw new Error('Dashboard overview request failed');
    }
    return adaptDashboardOverview(response.data);
};
