import { create } from 'zustand';
import { ICompletedTask, ITaskConstraints, TaskConstraintKey, TaskObjectSource, TaskType } from '@/api/tasks';

export type TaskWizardStep = 1 | 2 | 3 | 4 | 5;
export type TaskEvaluationDirection = 'discovery' | 'reproduction' | 'exploit' | 'repair';
export type TaskSamplingMode = 'all' | 'stratified';
export type TaskSamplingStratum = 'dataset' | 'difficulty' | 'domain' | 'vulnerability';
export type TaskStratumWeights = Record<TaskSamplingStratum, number>;

interface ITaskDraftState {
    constraints: ITaskConstraints;
    environmentId: string;
    evaluationDirections: TaskEvaluationDirection[];
    selectedCombinations: string[];
    selectedDatasetIds: string[];
    targetDomains: string[];
    samplingMode: TaskSamplingMode;
    sampleCount: number;
    samplingStrata: TaskSamplingStratum[];
    stratumWeights: TaskStratumWeights;
    firstStageRatio: number;
    isOpen: boolean;
    isTaskTypeFixed: boolean;
    modelId: string;
    objectSource: TaskObjectSource;
    questionSetId: string;
    step: TaskWizardStep;
    taskType: TaskType | null;
    validationErrorKey: string | null;
    closeWizard: () => void;
    loadCompletedTask: (task: ICompletedTask) => void;
    openWizard: (taskType?: TaskType) => void;
    setEvaluationDirections: (directions: TaskEvaluationDirection[]) => void;
    setSelectedCombinations: (combinations: string[]) => void;
    setSelectedDatasetIds: (ids: string[]) => void;
    setTargetDomains: (domains: string[]) => void;
    setSamplingMode: (mode: TaskSamplingMode) => void;
    setSampleCount: (count: number) => void;
    setSamplingStrata: (strata: TaskSamplingStratum[]) => void;
    setStratumWeight: (stratum: TaskSamplingStratum, weight: number) => void;
    setFirstStageRatio: (ratio: number) => void;
    selectTaskType: (taskType: TaskType) => void;
    setConstraint: (key: TaskConstraintKey, value: number) => void;
    setEnvironmentId: (environmentId: string) => void;
    setModelId: (modelId: string) => void;
    setObjectSource: (objectSource: TaskObjectSource) => void;
    setQuestionSetId: (questionSetId: string) => void;
    setStep: (step: TaskWizardStep) => void;
    setValidationErrorKey: (validationErrorKey: string | null) => void;
}

const INITIAL_DRAFT = {
    constraints: { duration: 45, token: 20, tools: 60, cost: 200 },
    environmentId: 'rng_range5',
    evaluationDirections: [] as TaskEvaluationDirection[],
    selectedCombinations: [] as string[],
    selectedDatasetIds: [] as string[],
    targetDomains: [] as string[],
    samplingMode: 'all' as TaskSamplingMode,
    sampleCount: 200,
    samplingStrata: ['dataset', 'difficulty', 'domain'] as TaskSamplingStratum[],
    stratumWeights: { dataset: 40, difficulty: 25, domain: 20, vulnerability: 15 } as TaskStratumWeights,
    firstStageRatio: 30,
    isOpen: false,
    isTaskTypeFixed: false,
    modelId: 'mythos-attack-v2',
    objectSource: 'builtin' as TaskObjectSource,
    questionSetId: 'suite_websec_v1',
    step: 1 as TaskWizardStep,
    taskType: null as TaskType | null,
    validationErrorKey: null as string | null,
};

export const useTaskDraftStore = create<ITaskDraftState>((set) => ({
    ...INITIAL_DRAFT,
    closeWizard: () => set({ isOpen: false, validationErrorKey: null }),
    loadCompletedTask: (task) =>
        set({
            ...task.config,
            constraints: { ...task.config.constraints },
            isOpen: true,
            isTaskTypeFixed: true,
            step: 1,
            validationErrorKey: null,
        }),
    openWizard: (taskType) =>
        set({
            ...INITIAL_DRAFT,
            constraints: { ...INITIAL_DRAFT.constraints },
            isOpen: true,
            isTaskTypeFixed: Boolean(taskType),
            taskType: taskType ?? null,
        }),
    setEvaluationDirections: (evaluationDirections) => set({ evaluationDirections, validationErrorKey: null }),
    setSelectedCombinations: (selectedCombinations) => set({ selectedCombinations, validationErrorKey: null }),
    setSelectedDatasetIds: (selectedDatasetIds) => set({ selectedDatasetIds, validationErrorKey: null }),
    setTargetDomains: (targetDomains) => set({ targetDomains, validationErrorKey: null }),
    setSamplingMode: (samplingMode) => set({ samplingMode }),
    setSampleCount: (sampleCount) => set({ sampleCount }),
    setSamplingStrata: (samplingStrata) => set({ samplingStrata }),
    setStratumWeight: (stratum, weight) => set((state) => ({ stratumWeights: { ...state.stratumWeights, [stratum]: weight } })),
    setFirstStageRatio: (firstStageRatio) => set({ firstStageRatio }),
    selectTaskType: (taskType) => set({ taskType, validationErrorKey: null }),
    setConstraint: (key, value) => set((state) => ({ constraints: { ...state.constraints, [key]: value } })),
    setEnvironmentId: (environmentId) => set({ environmentId }),
    setModelId: (modelId) => set({ modelId }),
    setObjectSource: (objectSource) =>
        set({
            objectSource,
            modelId: objectSource === 'external' ? 'ext-glm52' : 'mythos-attack-v2',
        }),
    setQuestionSetId: (questionSetId) => set({ questionSetId }),
    setStep: (step) => set({ step, validationErrorKey: null }),
    setValidationErrorKey: (validationErrorKey) => set({ validationErrorKey }),
}));

export const resetTaskDraftStore = () => {
    useTaskDraftStore.setState({ ...INITIAL_DRAFT, constraints: { ...INITIAL_DRAFT.constraints } });
};
