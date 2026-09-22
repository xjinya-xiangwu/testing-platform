export const QUERY_KEYS = {
    auth: {
        all: ['auth'] as const,
        currentUser: () => [...QUERY_KEYS.auth.all, 'me'] as const,
    },
    dashboard: {
        all: ['dashboard'] as const,
        snapshot: () => [...QUERY_KEYS.dashboard.all, 'snapshot'] as const,
    },
    topology: {
        all: ['topology'] as const,
        range: (rangeId: string) => [...QUERY_KEYS.topology.all, 'range', rangeId] as const,
    },
    tasks: {
        all: ['tasks'] as const,
        creation: () => [...QUERY_KEYS.tasks.all, 'creation'] as const,
        demo: () => [...QUERY_KEYS.tasks.all, 'demo'] as const,
        list: (query?: Readonly<{ filter: string; keyword: string; page: number; pageSize: number }>) =>
            query ? ([...QUERY_KEYS.tasks.all, 'list', query] as const) : ([...QUERY_KEYS.tasks.all, 'list'] as const),
    },
    trainingTasks: {
        all: ['training-tasks'] as const,
        detail: (taskId: string) => [...QUERY_KEYS.trainingTasks.all, 'detail', taskId] as const,
        list: (query: Readonly<{ keyword?: string; page?: number; pageSize?: number; status?: number; type?: number }>) => [...QUERY_KEYS.trainingTasks.all, 'list', query] as const,
    },
    range: {
        all: ['range'] as const,
        hall: () => [...QUERY_KEYS.range.all, 'hall'] as const,
        detail: (envId: string) => [...QUERY_KEYS.range.all, 'detail', envId] as const,
    },
    jobs: {
        all: ['jobs'] as const,
        detail: (jobId: string) => [...QUERY_KEYS.jobs.all, 'detail', jobId] as const,
        reviewScope: (jobId: string) => [...QUERY_KEYS.jobs.all, 'review', jobId] as const,
        review: (jobId: string, view = 'finished') => [...QUERY_KEYS.jobs.reviewScope(jobId), view] as const,
        confirmation: () => [...QUERY_KEYS.jobs.all, 'confirmation'] as const,
        settledConfirmation: () => [...QUERY_KEYS.jobs.all, 'confirmation', 'settled'] as const,
        pendingReviewSummary: () => [...QUERY_KEYS.jobs.all, 'pending-review-summary'] as const,
    },
    apiTokens: {
        all: ['api-tokens'] as const,
        list: (page: number, pageSize: number) => [...QUERY_KEYS.apiTokens.all, 'list', page, pageSize] as const,
    },
    gatewayProviders: {
        all: ['gateway-providers'] as const,
        list: () => [...QUERY_KEYS.gatewayProviders.all, 'list'] as const,
    },
    gatewaySessions: {
        all: ['gateway-sessions'] as const,
        list: (query: Readonly<{ providerId: string | null; result: string }>) => [...QUERY_KEYS.gatewaySessions.all, 'list', query] as const,
    },
    questionBank: {
        all: ['question-bank'] as const,
        snapshot: () => [...QUERY_KEYS.questionBank.all, 'snapshot'] as const,
        overview: () => [...QUERY_KEYS.questionBank.all, 'overview'] as const,
        samples: (versionId: string, query: Readonly<{ domainLabeled?: 'labeled' | 'unlabeled'; page: number }>) => [...QUERY_KEYS.questionBank.all, 'samples', versionId, query] as const,
    },
} as const;
