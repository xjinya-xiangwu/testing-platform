import { useRef } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTaskIdempotencyKey, enqueueTask, getTaskCenterData, getTaskCreationData, ITaskDraftPayload, ITaskListQuery, terminateTask } from '@/api/tasks';
import { getDemoJob } from '@/api/demo-job';
import { QUERY_KEYS } from '@/api/query-keys';
import { DEMO_JOB_POLL_INTERVAL_MS } from '@/config/demo-job';

const TASK_LIST_POLL_INTERVAL_MS = 5 * 1000;

export const useTaskCenter = (query: ITaskListQuery) => {
    return useQuery({
        queryKey: QUERY_KEYS.tasks.list(query),
        queryFn: () => getTaskCenterData(query),
        placeholderData: keepPreviousData,
        refetchInterval: (currentQuery) => (currentQuery.state.data?.shouldPoll ? TASK_LIST_POLL_INTERVAL_MS : false),
        refetchIntervalInBackground: false,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        staleTime: 0,
    });
};

export const useDemoJob = (isEnabled = true) => {
    return useQuery({
        queryKey: QUERY_KEYS.tasks.demo(),
        queryFn: getDemoJob,
        enabled: isEnabled,
        refetchInterval: DEMO_JOB_POLL_INTERVAL_MS,
        refetchIntervalInBackground: false,
        retry: false,
        staleTime: 0,
    });
};

export const useTaskCreationData = (isEnabled: boolean) => {
    return useQuery({
        queryKey: QUERY_KEYS.tasks.creation(),
        queryFn: getTaskCreationData,
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000,
    });
};

export const useTerminateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: terminateTask,
        onSuccess: async () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list() }),
    });
};

export const useEnqueueTask = () => {
    const queryClient = useQueryClient();
    const operation = useRef<{ fingerprint: string; key: string }>();
    return useMutation({
        mutationFn: (draft: ITaskDraftPayload) => {
            const fingerprint = JSON.stringify(draft);
            if (operation.current?.fingerprint !== fingerprint) operation.current = { fingerprint, key: createTaskIdempotencyKey() };
            return enqueueTask(draft, operation.current.key);
        },
        onSuccess: async () => {
            operation.current = undefined;
            return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list() });
        },
    });
};
