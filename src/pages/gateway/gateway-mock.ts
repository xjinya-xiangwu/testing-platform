export type GatewayTab = 'agents' | 'api' | 'docs' | 'keys' | 'sessions' | 'verify';

export interface IGatewayAgent {
    cost: string;
    endpoint: string;
    id: string;
    isVerified: boolean;
    kindKey: string;
    nameKey: string;
    tasks: number;
    tokensKey: string;
    trajectoriesKey: string;
    verifiedAt: string;
}

export interface IGatewaySession {
    agentKey: string;
    id: string;
    resultKey: string;
    taskKey: string;
    time: string;
    turns: number;
}

export const GATEWAY_TABS: readonly GatewayTab[] = ['agents', 'keys', 'docs', 'verify', 'sessions', 'api'];

export const GATEWAY_AGENTS: readonly IGatewayAgent[] = [
    {
        id: 'ext-glm52',
        nameKey: 'gateway.mock.agent.glm',
        kindKey: 'gateway.agent.kind.model',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4',
        isVerified: true,
        verifiedAt: '2026-08-05T16:20:00+08:00',
        tasks: 46,
        tokensKey: 'gateway.mock.agent.glm.tokens',
        trajectoriesKey: 'gateway.mock.agent.glm.trajectories',
        cost: '¥ 1,286',
    },
    {
        id: 'ext-gpt54',
        nameKey: 'gateway.mock.agent.gpt',
        kindKey: 'gateway.agent.kind.model',
        endpoint: 'https://api.openai.com/v1',
        isVerified: true,
        verifiedAt: '2026-08-04T11:02:00+08:00',
        tasks: 31,
        tokensKey: 'gateway.mock.agent.gpt.tokens',
        trajectoriesKey: 'gateway.mock.agent.gpt.trajectories',
        cost: '¥ 1,904',
    },
    {
        id: 'ext-claude',
        nameKey: 'gateway.mock.agent.claude',
        kindKey: 'gateway.agent.kind.model',
        endpoint: 'https://api.anthropic.com',
        isVerified: true,
        verifiedAt: '2026-08-03T09:44:00+08:00',
        tasks: 58,
        tokensKey: 'gateway.mock.agent.claude.tokens',
        trajectoriesKey: 'gateway.mock.agent.claude.trajectories',
        cost: '¥ 2,417',
    },
    {
        id: 'ext-redbot',
        nameKey: 'gateway.mock.agent.redbot',
        kindKey: 'gateway.agent.kind.agent',
        endpoint: 'https://agent.customer.lab/mcp',
        isVerified: false,
        verifiedAt: '',
        tasks: 0,
        tokensKey: 'common.notAvailable',
        trajectoriesKey: 'common.notAvailable',
        cost: '—',
    },
];

export const GATEWAY_STATS = [
    { labelKey: 'gateway.stats.tasks', valueKey: 'gateway.stats.tasksValue' },
    { labelKey: 'gateway.stats.tokens', valueKey: 'gateway.stats.tokensValue' },
    { labelKey: 'gateway.stats.trajectories', valueKey: 'gateway.stats.trajectoriesValue' },
    { labelKey: 'gateway.stats.cost', valueKey: 'gateway.stats.costValue' },
] as const;

export const GATEWAY_FLOW = ['auth', 'scope', 'loop', 'evidence'] as const;
export const GATEWAY_QUOTAS = ['isolation', 'tokens', 'rate', 'cost'] as const;
export const GATEWAY_VERIFY_STEPS = ['auth', 'connectivity', 'loop', 'evidence', 'catalog'] as const;

export const getGatewayDocs = (origin: string) => {
    const evalUrl = new URL('/api/v1/evals', origin).toString();
    const mcpUrl = new URL('/mcp', origin).toString();

    return [
        {
            id: 'rest',
            title: 'REST API',
            code: `curl -X POST ${evalUrl} \\\n  -H "Authorization: Bearer $AIR_KEY" \\\n  -d '{"scene":"SCN-01","model":"claude-opus-4.7"}'`,
        },
        {
            id: 'mcp',
            title: 'MCP',
            code: `{
  "mcpServers": {
    "ai-range": {
      "url": "${mcpUrl}",
      "headers": { "Authorization": "Bearer $AIR_KEY" }
    }
  }
}`,
        },
        {
            id: 'cli',
            title: 'CLI',
            code: `air login --key $AIR_KEY
air eval create --scene SCN-01 --model glm-5.2
air report fetch JOB-20260804-07 --format pdf`,
        },
        {
            id: 'skill',
            title: 'Skill',
            code: `# SKILL.md
name: ai-range-eval
tools:
  - range.eval.create
  - range.judge.review`,
        },
    ] as const;
};

export const GATEWAY_SESSIONS: readonly IGatewaySession[] = [
    {
        id: 'SES-20260805-21',
        agentKey: 'gateway.mock.agent.glm',
        time: '2026-08-05T16:22:00+08:00',
        taskKey: 'gateway.mock.session.task.range',
        resultKey: 'gateway.mock.session.result.94',
        turns: 88,
    },
    { id: 'SES-20260805-18', agentKey: 'gateway.mock.agent.gpt', time: '2026-08-05T14:07:00+08:00', taskKey: 'gateway.mock.session.task.code', resultKey: 'gateway.mock.session.result.58', turns: 64 },
    {
        id: 'SES-20260804-33',
        agentKey: 'gateway.mock.agent.claude',
        time: '2026-08-04T11:26:00+08:00',
        taskKey: 'gateway.mock.session.task.pentest',
        resultKey: 'gateway.mock.session.result.92',
        turns: 112,
    },
    {
        id: 'SES-20260804-19',
        agentKey: 'gateway.mock.agent.glm',
        time: '2026-08-04T09:15:00+08:00',
        taskKey: 'gateway.mock.session.task.verify',
        resultKey: 'gateway.mock.session.result.verified',
        turns: 6,
    },
    {
        id: 'SES-20260803-27',
        agentKey: 'gateway.mock.agent.redbot',
        time: '2026-08-03T17:40:00+08:00',
        taskKey: 'gateway.mock.session.task.verify',
        resultKey: 'gateway.mock.session.result.failed',
        turns: 2,
    },
];

export const isGatewayEndpoint = (value: string) => {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};
