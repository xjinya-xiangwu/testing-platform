import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTrainingTask, getTrainingTaskDetail, getTrainingTasks, terminateTrainingTask } from '@/api/training-tasks';
import { QUERY_KEYS } from '@/api/query-keys';
import type { ITrainingTaskDraft, ITrainingTaskQuery } from '@/api/training-tasks';

export const useTrainingTasks = (query: ITrainingTaskQuery) =>
    useQuery({
        queryKey: QUERY_KEYS.trainingTasks.list(query),
        queryFn: () => getTrainingTasks(query),
        refetchInterval: 5000,
    });

export const useTrainingTaskDetail = (taskId: string) =>
    useQuery({
        queryKey: QUERY_KEYS.trainingTasks.detail(taskId),
        queryFn: () => getTrainingTaskDetail(taskId),
        enabled: Boolean(taskId),
        refetchInterval: (query) => {
            const interval = query.state.data?.refreshAfterMs;
            return interval && interval > 0 ? interval : false;
        },
    });

export const useCreateTrainingTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (draft: ITrainingTaskDraft) => createTrainingTask(draft),
        onSuccess: async () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingTasks.all }),
    });
};

export const useTerminateTrainingTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (taskId: string) => terminateTrainingTask(taskId),
        onSettled: async (_data, _error, taskId) => {
            await Promise.all([queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingTasks.all }), queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingTasks.detail(taskId) })]);
        },
    });
};
