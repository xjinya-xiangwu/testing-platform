import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    applySampleLabel,
    buildManifestHash,
    createQuestionSet,
    createSetVersion,
    cancelPrecheck,
    computeCandidates,
    confirmLabelSuggestions,
    createExportRequest,
    createSamplingPlan,
    decideExportRequest,
    decideLabelCorrection,
    deleteQuestionSet,
    deleteSetVersion,
    diffVersions,
    downloadExport,
    freezeSampling,
    getDomainGate,
    getOverview,
    getQuestionBankSnapshot,
    getVersionFacets,
    getVersionSamples,
    previewSampling,
    publishVersion,
    retireVersion,
    updateQuestionSet,
    revokeExport,
    setPlanStatus,
    startImportJob,
    startPrecheck,
    suggestDomains,
    type EvaluationDirection,
    type ImportJob,
    type QuestionBankSample,
    type QuestionSetVersion,
    type SamplingPlan,
    type SamplingPreview,
    type SamplingRequest,
    type SamplingScope,
    type TargetDomain,
    type VersionDiffRow,
} from '@/api/question-bank';
import { QUERY_KEYS } from '@/api/query-keys';

// Every panel in the data center reads the same snapshot; mutations invalidate it
// plus the overview so the four-count board and the governance todos stay in sync.
const refreshQuestionBank = (queryClient: ReturnType<typeof useQueryClient>) => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.questionBank.all });
};

export const useQuestionBankSnapshot = () =>
    useQuery({
        queryKey: QUERY_KEYS.questionBank.snapshot(),
        queryFn: getQuestionBankSnapshot,
        // Background ticks advance running precheck/import jobs; poll while any job runs.
        refetchInterval: (query) => {
            const data = query.state.data as { precheckJobs?: { status: string }[]; importJobs?: { status: string }[] } | undefined;
            const hasRunning = data?.precheckJobs?.some((job) => job.status === 'running') || data?.importJobs?.some((job) => job.status === 'running');
            return hasRunning ? 900 : false;
        },
    });

export const useQuestionBankOverview = () =>
    useQuery({
        queryKey: QUERY_KEYS.questionBank.overview(),
        queryFn: getOverview,
        refetchInterval: (query) => {
            const data = query.state.data as QuestionBankOverviewShape | undefined;
            return data && data.todos.runningJobs > 0 ? 1200 : false;
        },
    });

interface QuestionBankOverviewShape {
    todos: { runningJobs: number };
}

export const useVersionSamples = (versionId: string | null, query: { domainLabeled?: 'labeled' | 'unlabeled'; page: number }) =>
    useQuery({
        queryKey: QUERY_KEYS.questionBank.samples(versionId ?? '', query),
        queryFn: () => getVersionSamples(versionId ?? '', query),
        enabled: versionId !== null,
        placeholderData: (previous) => previous,
    });

export const useVersionFacets = (versionId: string | null) =>
    useQuery({
        queryKey: [...QUERY_KEYS.questionBank.all, 'facets', versionId] as const,
        queryFn: () => getVersionFacets(versionId ?? ''),
        enabled: versionId !== null,
    });

export const usePublishVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (versionId: string) => publishVersion(versionId),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useRetireVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (versionId: string) => retireVersion(versionId),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useSuggestDomains = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (versionId: string) => suggestDomains(versionId),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useConfirmLabelSuggestions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { versionId: string; sampleIds: string[] }) => confirmLabelSuggestions(input.versionId, input.sampleIds),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useApplySampleLabel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { versionId: string; sampleId: string; domain: TargetDomain | null }) => applySampleLabel(input.versionId, input.sampleId, input.domain),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useCreateQuestionSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; code: string; description: string; type: 'benchmark' | 'custom'; directions: EvaluationDirection[] }) => createQuestionSet(input),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useUpdateQuestionSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { setId: string; name: string; description: string }) => updateQuestionSet(input.setId, { name: input.name, description: input.description }),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useDeleteQuestionSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (setId: string) => deleteQuestionSet(setId),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useCreateSetVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { setId: string; releaseVersion: string; sourceRef: string }) => createSetVersion(input.setId, { releaseVersion: input.releaseVersion, sourceRef: input.sourceRef }),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useDeleteSetVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (versionId: string) => deleteSetVersion(versionId),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useDecideLabelCorrection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { correctionId: string; decision: 'applied' | 'rejected' }) => decideLabelCorrection(input.correctionId, input.decision),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useStartPrecheck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { versionId: string; concurrency: number }) => startPrecheck(input.versionId, input.concurrency),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useCancelPrecheck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (jobId: string) => cancelPrecheck(jobId),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useStartImportJob = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { fileName: string; sizeMb: number; owner?: 'platform' | 'project' }) => startImportJob(input.fileName, input.sizeMb, 'web', input.owner ?? 'platform'),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useCreateExportRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { objectType: 'version_metadata' | 'task_list' | 'dataset'; targetLabel: string; purpose: string; recipient: string }) => createExportRequest(input),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useDecideExportRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { requestId: string; decision: 'approved' | 'rejected' }) => decideExportRequest(input.requestId, input.decision),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useDownloadExport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (requestId: string) => downloadExport(requestId),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useRevokeExport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (requestId: string) => revokeExport(requestId),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useCreateSamplingPlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; mode: SamplingPlan['mode']; seed: number; size: number; strata: SamplingPlan['strata']; scope: SamplingPlan['scope']; owner?: SamplingPlan['owner'] }) => createSamplingPlan(input),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useSetPlanStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { planId: string; status: SamplingPlan['status'] }) => setPlanStatus(input.planId, input.status),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

export const useFreezeSampling = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { planId: string; planName: string; preview: SamplingPreview }) => freezeSampling(input.planId, input.planName, input.preview),
        onSuccess: () => refreshQuestionBank(queryClient),
    });
};

/* ------------------------------ pure selectors ------------------------------ */

export const previewSamplingRequest = (request: SamplingRequest): SamplingPreview => previewSampling(request);
export const scopeCandidates = (scope: SamplingScope) => computeCandidates(scope);
export const domainGate = (versionId: string) => getDomainGate(versionId);
export const manifestHash = (value: string) => buildManifestHash(value);
export const versionDiff = (current: QuestionSetVersion, previous: QuestionSetVersion): VersionDiffRow[] => diffVersions(current, previous);

export type { ImportJob, QuestionBankSample };
