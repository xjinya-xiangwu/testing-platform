export interface ITrainingMetricSeries {
    group: 'effect' | 'efficiency' | 'quality' | 'stability';
    id: string;
    values: readonly number[];
}

export interface ITrainingGpuMetric {
    id: string;
    power: number;
    temperature: number;
    utilization: number;
}

export interface ITrainingTelemetry {
    gpu: readonly ITrainingGpuMetric[];
    logs: readonly string[];
    sample: number;
    series: readonly ITrainingMetricSeries[];
}

const METRICS = [
    ['effect', 'rollout/raw_reward', 0.31],
    ['effect', 'rollout/truncated_ratio', 0.17],
    ['effect', 'rollout/response_len', 496],
    ['quality', 'fetched/reward', 0.44],
    ['quality', 'used/reward', 0.51],
    ['stability', 'train/ppo_kl', 0.032],
    ['stability', 'train/pg_clipfrac', 0.11],
    ['stability', 'train/entropy_loss', 0.71],
    ['efficiency', 'perf/wait_time_ratio', 0.11],
    ['efficiency', 'perf/train_wait_time', 2.6],
    ['efficiency', 'perf/train_time', 8.9],
    ['efficiency', 'perf/step_time', 11.5],
] as const;

const hashTaskId = (taskId: string) => Array.from(taskId).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
const pseudoRandom = (seed: number) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
};

const makeValues = (seed: number, base: number, index: number) =>
    Array.from({ length: 24 }, (_, point) => {
        const scale = base > 10 ? base * 0.08 : Math.max(base * 0.18, 0.01);
        return Math.max(0, base + (pseudoRandom(seed + index * 101 + point * 17) - 0.5) * scale);
    });

export const createTrainingTelemetry = (taskId: string): ITrainingTelemetry => {
    const seed = hashTaskId(taskId);
    return {
        sample: 0,
        series: METRICS.map(([group, id, base], index) => ({ group, id, values: makeValues(seed, base, index) })),
        gpu: Array.from({ length: 8 }, (_, index) => {
            const utilization = Math.round(58 + pseudoRandom(seed + index * 37) * 32);
            return { id: `H100-${index}`, utilization, temperature: Math.round(52 + utilization * 0.22), power: Math.round(320 + utilization * 2.4) };
        }),
        logs: ['training.telemetry.scheduler', 'training.telemetry.rollout', 'training.telemetry.checkpoint'],
    };
};

export const advanceTrainingTelemetry = (telemetry: ITrainingTelemetry): ITrainingTelemetry => {
    const sample = telemetry.sample + 1;
    return {
        sample,
        series: telemetry.series.map((metric, index) => {
            const previous = metric.values.at(-1) ?? 0;
            const change = (pseudoRandom(sample * 71 + index * 19) - 0.5) * Math.max(previous * 0.06, 0.005);
            return { ...metric, values: [...metric.values.slice(1), Math.max(0, previous + change)] };
        }),
        gpu: telemetry.gpu.map((metric, index) => {
            const utilization = Math.max(30, Math.min(97, Math.round(metric.utilization + (pseudoRandom(sample * 47 + index * 13) - 0.5) * 8)));
            return { ...metric, utilization, temperature: Math.round(52 + utilization * 0.22), power: Math.round(320 + utilization * 2.4) };
        }),
        logs: [...telemetry.logs, 'training.telemetry.heartbeat'].slice(-12),
    };
};
