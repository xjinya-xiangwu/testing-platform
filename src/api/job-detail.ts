import Http from '@/utils/axios';
import { DEMO_JOB } from '@/config/cgi';
import { PINNED_JOB_ID } from '@/config/demo-job';
import { adaptRangeTopology, isRangeTopology, type IRangeTopology } from '@/api/range';
import { parseTopology } from '@/features/topology/domain/validate-topology';
import { projectWorkbenchTopology } from '@/features/topology/layout/workbench-topology-projection';
import { IS_DEMO_MODE } from '@/config/demo-mode';
import { createJobDetailFixture } from '@/test/fixtures/job-detail';

export type JobAction = 'PAUSE' | 'RESUME' | 'TERMINATE';
export type JobStatus = 'INITIALIZING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type JobType = 'RANGE' | 'CODE_EVAL';
export type MilestoneStatus = 'PENDING' | 'CANDIDATE' | 'OBSERVED' | 'VERIFIED';

export interface IJobDetail {
    top_info: {
        name: string;
        subtitle?: string;
        tags: string[];
        job_type: JobType;
        agent_id: string;
        run_mode: 'AGENT' | 'MANUAL';
        interaction_mode: 'OBSERVE' | 'INTERACTIVE';
        status: JobStatus;
        available_actions: JobAction[];
    };
    milestones: {
        total: number;
        completed: number;
        verified: number;
        latest_reached?: string;
        items: readonly {
            ordinal: number;
            id: string;
            service: string;
            status: MilestoneStatus;
            observed_at?: string;
            verified_at?: string;
        }[];
    };
    runtime_status?: {
        elapsed_sec: number;
        last_polled_at?: string;
    };
    environment?: {
        target_subnet: string;
        cve: string;
        cvss: number;
        network_environment: string;
        environment_task: string;
    };
    evaluation?: {
        object_type: string;
        object_id: string;
        question_bank_count: number;
        dynamic_variation: boolean;
        rounds: number;
        scene: string;
        detection_item_count: number;
    };
    current_step?: {
        sequence: number;
        total: number;
        id: string;
        service: string;
        status: string;
    };
    topology?: unknown;
    risk_checks: readonly { name: string; level: string; status: string; verdict?: string }[];
    console?: { prompt: string; entries: readonly { kind: string; content: string }[] };
    workspace_files?: readonly { name: string; content: string }[];
    observations: readonly { type: string; level: string; summary: string; occurred_at: string }[];
    available_tools: readonly string[];
    settlement?: { verdict: string; close_mode: 'AUTO' | 'MANUAL' };
}

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const asNumber = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const asStringArray = (value: unknown) => asArray(value).filter((item): item is string => typeof item === 'string');

const adaptTopology = (value: unknown): IRangeTopology | undefined => {
    if (isRangeTopology(value)) return value;
    const topology = asRecord(value);
    if (Array.isArray(topology.zones) && Array.isArray(topology.networks) && Array.isArray(topology.nodes) && Array.isArray(topology.links)) {
        return projectWorkbenchTopology(parseTopology(value));
    }
    if (asArray(topology.nodes).length === 0) return undefined;
    return adaptRangeTopology(value);
};

const normalizeJobStatus = (value: unknown, availableActions: readonly JobAction[]): JobStatus => {
    const status = asString(value).trim().toUpperCase();
    if (status === 'PAUSED') return 'PAUSED';
    if (status === 'RUNNING') return 'RUNNING';
    if (status === 'INITIALIZING' || status === 'CREATED' || status === 'QUEUED' || status === 'PROVISIONING' || status === 'TERMINATING') return 'INITIALIZING';
    if (availableActions.length > 0) return 'INITIALIZING';
    return 'COMPLETED';
};

const normalizeMilestoneStatus = (value: unknown): MilestoneStatus => {
    const status = asString(value).trim().toUpperCase();
    if (status === 'CANDIDATE' || status === 'RUNNING') return 'CANDIDATE';
    if (status === 'OBSERVED' || status === 'FAILED') return 'OBSERVED';
    if (status === 'VERIFIED' || status === 'COMPLETED') return 'VERIFIED';
    return 'PENDING';
};

const requireJobId = (jobId: string) => {
    const normalized = jobId.trim();
    if (!normalized || normalized.length > 256) throw new Error('jobId is invalid');
    return normalized;
};

const requireJobAction = (action: JobAction) => {
    if (action !== 'PAUSE' && action !== 'RESUME' && action !== 'TERMINATE') throw new Error('Job action is invalid');
    return action;
};

export const adaptJobDetailResponse = (value: unknown): IJobDetail => {
    const response = asRecord(value);
    const topInfo = asRecord(response.top_info);
    const rawMilestones = response.milestones;
    const milestoneSummary = Array.isArray(rawMilestones) ? asRecord(response.progress) : asRecord(rawMilestones);
    const milestoneSource = Array.isArray(rawMilestones) ? rawMilestones : asArray(milestoneSummary.items);
    const runtimeStatus = Object.keys(asRecord(response.runtime_status)).length > 0 ? asRecord(response.runtime_status) : asRecord(response.metrics);
    const environment = asRecord(response.environment);
    const evaluation = asRecord(response.evaluation);
    const currentStep = asRecord(response.current_step);
    const consoleData = asRecord(response.console);
    const workspaceFiles = asArray(response.workspace_files).map((item) => ({ name: asString(asRecord(item).name), content: asString(asRecord(item).content) }));
    const settlement = asRecord(response.settlement);
    const availableActions = asStringArray(topInfo.available_actions ?? response.available_actions).filter(
        (action): action is JobAction => action === 'PAUSE' || action === 'RESUME' || action === 'TERMINATE',
    );
    const status = normalizeJobStatus(topInfo.status ?? response.status, availableActions);
    const milestoneItems = milestoneSource.map((item, index) => {
        const milestone = asRecord(item);
        const id = asString(milestone.id, asString(milestone.group_id, asString(milestone.milestone_id, `milestone-${index + 1}`)));
        return {
            ordinal: asNumber(milestone.ordinal, index),
            id,
            service: asString(milestone.service, asString(milestone.name, id)),
            status: normalizeMilestoneStatus(milestone.status),
            observed_at: asString(milestone.observed_at) || undefined,
            verified_at: asString(milestone.verified_at) || undefined,
        };
    });
    const completedMilestoneCount = milestoneItems.filter((item) => item.status === 'OBSERVED' || item.status === 'VERIFIED').length;
    const verifiedMilestoneCount = milestoneItems.filter((item) => item.status === 'VERIFIED').length;

    return {
        top_info: {
            name: asString(topInfo.name, asString(response.name, asString(response.job_id))),
            subtitle: asString(topInfo.subtitle, asString(response.subtitle)) || undefined,
            tags:
                asStringArray(topInfo.tags).length > 0
                    ? asStringArray(topInfo.tags)
                    : [asString(response.execution_mode), asString(response.run_mode), asString(response.interaction_mode)].filter((tag) => tag.length > 0),
            job_type: (topInfo.job_type ?? response.job_type) === 'CODE_EVAL' ? 'CODE_EVAL' : 'RANGE',
            agent_id: asString(topInfo.agent_id, asString(asRecord(response.agent).agent_id)),
            run_mode: (topInfo.run_mode ?? response.run_mode) === 'MANUAL' ? 'MANUAL' : 'AGENT',
            interaction_mode: (topInfo.interaction_mode ?? response.interaction_mode) === 'INTERACTIVE' ? 'INTERACTIVE' : 'OBSERVE',
            status,
            available_actions: availableActions,
        },
        milestones: {
            total: asNumber(milestoneSummary.total, asNumber(milestoneSummary.total_steps, milestoneItems.length)),
            completed: asNumber(milestoneSummary.completed, asNumber(milestoneSummary.completed_steps, completedMilestoneCount)),
            verified: asNumber(milestoneSummary.verified, verifiedMilestoneCount),
            latest_reached: asString(milestoneSummary.latest_reached, asString(milestoneSummary.current_group, asString(milestoneSummary.current_milestone))) || undefined,
            items: milestoneItems,
        },
        ...(Object.keys(runtimeStatus).length > 0 ? { runtime_status: { elapsed_sec: asNumber(runtimeStatus.elapsed_sec), last_polled_at: asString(runtimeStatus.last_polled_at) || undefined } } : {}),
        environment:
            Object.keys(environment).length > 0
                ? {
                      target_subnet: asString(environment.target_subnet),
                      cve: asString(environment.cve),
                      cvss: asNumber(environment.cvss),
                      network_environment: asString(environment.network_environment, asString(environment.network_type)),
                      environment_task: asString(environment.environment_task, asString(environment.objective, asString(environment.name))),
                  }
                : undefined,
        evaluation:
            Object.keys(evaluation).length > 0
                ? {
                      object_type: asString(evaluation.object_type),
                      object_id: asString(evaluation.object_id),
                      question_bank_count: asNumber(evaluation.question_bank_count),
                      dynamic_variation: Boolean(evaluation.dynamic_variation),
                      rounds: asNumber(evaluation.rounds),
                      scene: asString(evaluation.scene),
                      detection_item_count: asNumber(evaluation.detection_item_count),
                  }
                : undefined,
        current_step:
            Object.keys(currentStep).length > 0
                ? {
                      sequence: asNumber(currentStep.sequence),
                      total: asNumber(currentStep.total),
                      id: asString(currentStep.id, asString(currentStep.step_id, asString(currentStep.name))),
                      service: asString(currentStep.service, asString(currentStep.name)),
                      status: asString(currentStep.status),
                  }
                : undefined,
        topology: adaptTopology(response.topology),
        risk_checks: asArray(response.risk_checks).map((item) => {
            const check = asRecord(item);
            return { name: asString(check.name), level: asString(check.level), status: asString(check.status), verdict: asString(check.verdict) || undefined };
        }),
        ...(Object.keys(consoleData).length > 0
            ? {
                  console: {
                      prompt: asString(consoleData.prompt),
                      entries: asArray(consoleData.entries).map((item) => ({ kind: asString(asRecord(item).kind), content: asString(asRecord(item).content) })),
                  },
              }
            : {}),
        ...(Array.isArray(response.workspace_files) ? { workspace_files: workspaceFiles } : {}),
        observations: asArray(response.observations).map((item) => ({
            type: asString(asRecord(item).type, asString(asRecord(item).category)),
            level: asString(asRecord(item).level),
            summary: asString(asRecord(item).summary),
            occurred_at: asString(asRecord(item).occurred_at),
        })),
        available_tools: asArray(response.available_tools)
            .map((item) => (typeof item === 'string' ? item : asString(asRecord(item).name, asString(asRecord(item).tool_id))))
            .filter((tool) => tool.length > 0),
        settlement:
            Object.keys(settlement).length > 0 ? { verdict: asString(settlement.verdict, asString(settlement.summary)), close_mode: settlement.close_mode === 'AUTO' ? 'AUTO' : 'MANUAL' } : undefined,
    };
};

export const createJobDetailApi = ({ request }: { request: (path: string) => Promise<unknown> }) => ({
    getJobDetail: async (jobId: string): Promise<IJobDetail> => {
        const normalizedJobId = requireJobId(jobId);
        const isDemoJob = normalizedJobId === PINNED_JOB_ID;
        const response = await request(isDemoJob ? DEMO_JOB : `/api/v1/jobs/${encodeURIComponent(normalizedJobId)}`);
        if (!isDemoJob) return adaptJobDetailResponse(response);

        const detail = asRecord(response).detail;
        if (!detail) throw new Error('Demo job detail response is empty');
        return adaptJobDetailResponse(detail);
    },
});

const requestJobDetail = async (path: string): Promise<unknown> => {
    const response = await Http.get<never, unknown>(path, { forbidMsg: true });
    if (!response.data) throw new Error('Job detail response is empty');
    return response.data;
};

const jobDetailApi = createJobDetailApi({ request: requestJobDetail });

export const getJobDetail = (jobId: string) => (IS_DEMO_MODE ? Promise.resolve(createJobDetailFixture()) : jobDetailApi.getJobDetail(jobId));

export const runJobAction = async ({ action, jobId }: { action: JobAction; jobId: string }): Promise<IJobDetail> => {
    if (IS_DEMO_MODE) return createJobDetailFixture();
    const normalizedJobId = requireJobId(jobId);
    const normalizedAction = requireJobAction(action);
    const response = await Http.post<{ action: JobAction }, { job_id: string; status: string }>(`/api/v1/jobs/${encodeURIComponent(normalizedJobId)}/actions`, {
        data: { action: normalizedAction },
        forbidMsg: true,
    });
    if (!response.data) throw new Error('Job action response is empty');
    return getJobDetail(normalizedJobId);
};
