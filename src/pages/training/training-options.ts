import type {
    ITrainingTaskDraft,
    TrainingAlgorithm,
    TrainingBase,
    TrainingBenchmark,
    TrainingDataset,
    TrainingDuration,
    TrainingFramework,
    TrainingPriority,
    TrainingSplit,
    TrainingStatus,
    TrainingType,
} from '@/api/training-tasks';

export interface ITrainingOption<T> {
    labelKey: string;
    value: T;
}

export const TRAINING_PRIORITIES: readonly ITrainingOption<TrainingPriority>[] = [
    { value: 0, labelKey: 'training.priority.0' },
    { value: 1, labelKey: 'training.priority.1' },
    { value: 2, labelKey: 'training.priority.2' },
];

export const TRAINING_TYPES: readonly ITrainingOption<TrainingType>[] = [
    { value: 0, labelKey: 'training.type.0' },
    { value: 1, labelKey: 'training.type.1' },
    { value: 2, labelKey: 'training.type.2' },
    { value: 3, labelKey: 'training.type.3' },
];

export const TRAINING_DATASETS: readonly ITrainingOption<TrainingDataset>[] = [
    { value: 0, labelKey: 'training.dataset.0' },
    { value: 1, labelKey: 'training.dataset.1' },
    { value: 2, labelKey: 'training.dataset.2' },
    { value: 3, labelKey: 'training.dataset.3' },
];

export const TRAINING_BENCHMARKS: readonly ITrainingOption<TrainingBenchmark>[] = [
    { value: 0, labelKey: 'training.benchmark.0' },
    { value: 1, labelKey: 'training.benchmark.1' },
    { value: 2, labelKey: 'training.benchmark.2' },
    { value: 3, labelKey: 'training.benchmark.3' },
];

export const TRAINING_SPLITS: readonly ITrainingOption<TrainingSplit>[] = [
    { value: 0, labelKey: 'training.split.0' },
    { value: 1, labelKey: 'training.split.1' },
    { value: 2, labelKey: 'training.split.2' },
];

export const TRAINING_BASES: readonly ITrainingOption<TrainingBase>[] = [
    { value: 'v2.2', labelKey: 'training.base.v2.2' },
    { value: 'v2.1', labelKey: 'training.base.v2.1' },
    { value: 'v2.0', labelKey: 'training.base.v2.0' },
];

export const TRAINING_FRAMEWORKS: readonly ITrainingOption<TrainingFramework>[] = [
    { value: 'rl', labelKey: 'training.framework.rl' },
    { value: 'sft', labelKey: 'training.framework.sft' },
];

export const TRAINING_ALGORITHMS: readonly ITrainingOption<TrainingAlgorithm>[] = [
    { value: 'grpo', labelKey: 'training.algorithm.grpo' },
    { value: 'ppo', labelKey: 'training.algorithm.ppo' },
    { value: 'gspo', labelKey: 'training.algorithm.gspo' },
];

export const TRAINING_DURATIONS: readonly ITrainingOption<TrainingDuration>[] = [
    { value: 0, labelKey: 'training.duration.0' },
    { value: 1, labelKey: 'training.duration.1' },
    { value: 2, labelKey: 'training.duration.2' },
    { value: 3, labelKey: 'training.duration.3' },
];

export const TRAINING_STATUSES: readonly ITrainingOption<TrainingStatus>[] = [
    { value: 0, labelKey: 'training.status.0' },
    { value: 1, labelKey: 'training.status.1' },
    { value: 2, labelKey: 'training.status.2' },
    { value: 3, labelKey: 'training.status.3' },
    { value: 4, labelKey: 'training.status.4' },
];

export const TRAINING_PIPELINE = ['data', 'configuration', 'execution', 'monitoring', 'publishing'] as const;

export const TRAINING_HYPERPARAMETERS = [
    ['LR', '1e-6'],
    ['EPS_CLIP', '0.2'],
    ['RL_EPOCH', '1000'],
    ['RL_GLOBAL_BATCH_SIZE', '512'],
    ['RL_GROUP_SIZE', '8'],
    ['MAX_TOKENS_PER_GPU', '5000'],
    ['SGLANG_MEM_FRACTION_STATIC', '0.45'],
    ['ROLLOUT_NUM_GPUS', '3'],
    ['ACTOR_NUM_GPUS_PER_NODE', '1'],
] as const;

export const INITIAL_TRAINING_DRAFT: ITrainingTaskDraft = {
    name: '',
    priority: 1,
    type: 1,
    goal: '',
    dataset: 0,
    benchmarks: [0],
    split: 1,
    base: 'v2.2',
    framework: 'rl',
    rlAlgorithm: 'grpo',
    gpu: [{ model: 'H100', count: 8 }],
    duration: 1,
    hyperparameters: Object.fromEntries(TRAINING_HYPERPARAMETERS),
};

export const getOptionLabelKey = <T>(options: readonly ITrainingOption<T>[], value: T) => options.find((option) => option.value === value)?.labelKey ?? '';
