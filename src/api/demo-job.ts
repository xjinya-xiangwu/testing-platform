import { DEMO_JOB } from '@/config/cgi';
import { DEMO_JOB_ID } from '@/config/demo-job';
import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';

export interface IDemoJobMilestones {
    completed: number;
    total: number;
    verified: number;
}

export interface IDemoJobCard {
    agentId: string;
    attackChain: string;
    displayNo: string;
    jobId: typeof DEMO_JOB_ID;
    milestones: IDemoJobMilestones;
    name: string;
    progress: number;
    resourceName: string;
    runModeText: string;
    status: 'RUNNING';
    subtitle: string;
    topologySummary: string;
}

export interface IDemoJobData {
    card: IDemoJobCard;
    detail: unknown;
}

const requireRecord = (value: unknown, field: string): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${field}`);
    return value as Record<string, unknown>;
};

const requireString = (value: unknown, field: string): string => {
    if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`Invalid ${field}`);
    return value;
};

const requireNonNegativeNumber = (value: unknown, field: string): number => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Invalid ${field}`);
    return value;
};

export const adaptDemoJobResponse = (value: unknown): IDemoJobData => {
    const response = requireRecord(value, 'demo job response');
    const card = requireRecord(response.card, 'demo job card');
    const milestones = requireRecord(card.milestones, 'demo job milestones');
    const jobId = requireString(card.job_id, 'demo job id');
    const progress = requireNonNegativeNumber(card.progress, 'demo job progress');
    if (jobId !== DEMO_JOB_ID) throw new Error('Invalid demo job id');
    if (card.status !== 'RUNNING') throw new Error('Invalid demo job status');
    if (progress > 100) throw new Error('Invalid demo job progress');
    requireRecord(response.detail, 'demo job detail');

    return {
        card: {
            agentId: requireString(card.agent_id, 'demo job agent'),
            attackChain: requireString(card.attack_chain, 'demo job attack chain'),
            displayNo: requireString(card.display_no, 'demo job display number'),
            jobId: DEMO_JOB_ID,
            milestones: {
                completed: requireNonNegativeNumber(milestones.completed, 'demo job completed milestones'),
                total: requireNonNegativeNumber(milestones.total, 'demo job total milestones'),
                verified: requireNonNegativeNumber(milestones.verified, 'demo job verified milestones'),
            },
            name: requireString(card.name, 'demo job name'),
            progress,
            resourceName: requireString(card.resource_name, 'demo job resource'),
            runModeText: requireString(card.run_mode_text, 'demo job run mode'),
            status: 'RUNNING',
            subtitle: requireString(card.subtitle, 'demo job subtitle'),
            topologySummary: requireString(card.topo_summary, 'demo job topology summary'),
        },
        detail: response.detail,
    };
};

export const createDemoJobApi = ({ request }: { request: (path: string) => Promise<unknown> }) => ({
    getDemoJob: async (): Promise<IDemoJobData> => adaptDemoJobResponse(await request(DEMO_JOB)),
});

const requestDemoJob = async (path: string): Promise<unknown> => {
    const response = await Http.get<never, unknown>(path, { forbidMsg: true });
    if (!response.data) throw new Error('Demo job response is empty');
    return response.data;
};

const demoJobApi = createDemoJobApi({ request: requestDemoJob });

export const getDemoJob = () =>
    IS_DEMO_MODE
        ? Promise.resolve<IDemoJobData>({
              card: {
                  agentId: 'Mythos-Attack-v2',
                  attackChain: '外部入口 → 应用服务 → 缓存数据库 → 目标验证',
                  displayNo: 'DEMO-RANGE-001',
                  jobId: DEMO_JOB_ID,
                  milestones: { completed: 3, total: 5, verified: 2 },
                  name: '靶场评测演示任务',
                  progress: 64,
                  resourceName: 'SCN-01 · 企业内网',
                  runModeText: '隔离环境自动评测',
                  status: 'RUNNING',
                  subtitle: '演示数据 · 非真实运行',
                  topologySummary: '5 网区 · 20 节点',
              },
              detail: {},
          })
        : demoJobApi.getDemoJob();
