import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJobDetail, runJobAction } from '@/api/job-detail';
import { generateJobReport, getJobReviewData, getPendingReviewData, getPendingReviewSummary, getSettledReviewData, updateReviewTicket } from '@/api/review';
import { QUERY_KEYS } from '@/api/query-keys';
import { DEMO_JOB_POLL_INTERVAL_MS, PINNED_JOB_ID } from '@/config/demo-job';
import type { JobAction } from '@/api/job-detail';
import type { IReviewData, IUpdateReviewTicketInput, JobReviewDataView } from '@/api/review';

const JOB_DETAIL_POLL_INTERVAL_MS = 3 * 1000;

export const useJobDetail = (jobId: string | null) => {
    const normalizedJobId = jobId ?? '';
    return useQuery({
        queryKey: QUERY_KEYS.jobs.detail(normalizedJobId),
        queryFn: () => getJobDetail(normalizedJobId),
        enabled: normalizedJobId.trim().length > 0,
        refetchInterval: (query) => {
            if (normalizedJobId === PINNED_JOB_ID) return DEMO_JOB_POLL_INTERVAL_MS;
            const status = query.state.data?.top_info.status;
            return status === 'INITIALIZING' || status === 'RUNNING' ? JOB_DETAIL_POLL_INTERVAL_MS : false;
        },
        refetchIntervalInBackground: false,
    });
};

export const useJobAction = (jobId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (action: JobAction) => runJobAction({ action, jobId }),
        onSuccess: (detail) => queryClient.setQueryData(QUERY_KEYS.jobs.detail(jobId), detail),
    });
};

export const useConfirmation = (isEnabled = true) => {
    return useQuery({
        queryKey: QUERY_KEYS.jobs.confirmation(),
        queryFn: getPendingReviewData,
        enabled: isEnabled,
        staleTime: 30 * 1000,
    });
};

export const useSettledConfirmation = (isEnabled = false) => {
    return useQuery({
        queryKey: QUERY_KEYS.jobs.settledConfirmation(),
        queryFn: getSettledReviewData,
        enabled: isEnabled,
        staleTime: 30 * 1000,
    });
};

export const useJobConfirmation = (jobId: string | null, isEnabled = true, shouldPollForReport = false, view: JobReviewDataView = 'finished') => {
    const normalizedJobId = jobId ?? '';
    return useQuery({
        queryKey: QUERY_KEYS.jobs.review(normalizedJobId, view),
        queryFn: () => getJobReviewData(normalizedJobId, view),
        enabled: isEnabled && normalizedJobId.trim().length > 0,
        refetchInterval: (query) => {
            const reportStatus = query.state.data?.reportStatus;
            if (reportStatus === 'COMPLETED' || reportStatus === 'FAILED') return false;
            return shouldPollForReport || reportStatus === 'GENERATING' ? 5 * 1000 : false;
        },
        refetchIntervalInBackground: false,
        staleTime: 30 * 1000,
    });
};

export const usePendingReviewSummary = (isEnabled = true) => {
    return useQuery({
        queryKey: QUERY_KEYS.jobs.pendingReviewSummary(),
        queryFn: getPendingReviewSummary,
        enabled: isEnabled,
        staleTime: 30 * 1000,
    });
};

export const useReviewAction = (jobId?: string | null, view: JobReviewDataView = 'finished') => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: IUpdateReviewTicketInput) => updateReviewTicket(payload),
        onSuccess: async (updatedTicket) => {
            if (jobId) {
                queryClient.setQueryData<IReviewData>(QUERY_KEYS.jobs.review(jobId, view), (current) => {
                    if (!current) return current;
                    const tickets = current.tickets.map((ticket) =>
                        ticket.jobId === updatedTicket.jobId
                            ? {
                                  ...ticket,
                                  score: updatedTicket.score,
                                  sealedAt: updatedTicket.sealedAt || ticket.sealedAt,
                                  status: updatedTicket.status,
                                  ...(updatedTicket.revisionNote ? { revisionNote: updatedTicket.revisionNote } : {}),
                              }
                            : ticket,
                    );
                    return {
                        ...current,
                        pendingCount: tickets.filter((ticket) => ticket.status === 'pending').length,
                        tickets,
                    };
                });
                await Promise.all([queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.pendingReviewSummary() }), queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list() })]);
                return;
            }
            const reviewData = await getPendingReviewData();
            queryClient.setQueryData(QUERY_KEYS.jobs.confirmation(), reviewData);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.settledConfirmation() }),
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.pendingReviewSummary() }),
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list() }),
            ]);
        },
    });
};

export const useGenerateJobReport = (jobId: string | null) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            if (!jobId) throw new Error('jobId is required');
            return generateJobReport(jobId);
        },
        onSuccess: async () => {
            if (!jobId) return;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.review(jobId, 'finished'), exact: true }),
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.review(jobId, 'reported'), exact: true }),
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.settledConfirmation() }),
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list() }),
            ]);
        },
    });
};

type JobReportStatus = 'COMPLETED' | 'FAILED' | 'GENERATING' | 'NOT_REQUESTED' | 'UNKNOWN';

interface JobReportStateInput {
    jobId: string;
    reportId?: string;
    reportStatus?: string;
}

const normalizeReportStatus = (status?: string): JobReportStatus => {
    const normalizedStatus = status?.trim().toUpperCase();
    if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'FAILED' || normalizedStatus === 'GENERATING' || normalizedStatus === 'NOT_REQUESTED') return normalizedStatus;
    return 'UNKNOWN';
};

export const useJobReportState = ({ jobId, reportId: initialReportId, reportStatus: initialReportStatus }: JobReportStateInput) => {
    const generateReport = useGenerateJobReport(jobId);
    const generatedStatus = normalizeReportStatus(generateReport.data?.status);
    const normalizedInitialStatus = normalizeReportStatus(initialReportStatus);
    const hasAcceptedGeneration = Boolean(generateReport.data?.reportId);
    const isGeneratedStatusTerminal = generatedStatus === 'COMPLETED' || generatedStatus === 'FAILED';
    const shouldLoadGeneratedReport = normalizedInitialStatus === 'GENERATING' || (hasAcceptedGeneration && !isGeneratedStatusTerminal);
    const confirmation = useJobConfirmation(jobId, shouldLoadGeneratedReport, shouldLoadGeneratedReport);
    const confirmationReportStatus = normalizeReportStatus(confirmation.data?.reportStatus);
    const isConfirmationTerminal = confirmationReportStatus === 'COMPLETED' || confirmationReportStatus === 'FAILED';

    let fallbackReportStatus = normalizedInitialStatus;
    if (generateReport.data) fallbackReportStatus = generatedStatus;
    if (hasAcceptedGeneration && generatedStatus === 'UNKNOWN') fallbackReportStatus = 'GENERATING';

    const hasKnownFallback = fallbackReportStatus !== 'NOT_REQUESTED' && fallbackReportStatus !== 'UNKNOWN';
    let reportStatus = confirmationReportStatus;
    if (!isConfirmationTerminal && hasKnownFallback) reportStatus = fallbackReportStatus;

    const report = confirmation.data?.reports[0];
    const reportId = report?.reportNo ?? generateReport.data?.reportId ?? initialReportId;
    return {
        generate: () => generateReport.mutate(),
        isError: generateReport.isError || confirmation.isError,
        isGenerating: generateReport.isPending || reportStatus === 'GENERATING',
        isReportReady: reportStatus === 'COMPLETED' && Boolean(reportId),
        report,
        reportId,
        reportStatus,
    };
};
