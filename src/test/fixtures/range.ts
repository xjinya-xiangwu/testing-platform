import type { IRangeEnvironment, IRangeHallData, IRangeTopology } from '@/api/range';

const EMPTY_TOPOLOGY: IRangeTopology = { attackPath: [], edges: [], nodes: [], viewBox: '0 0 920 360', zones: [] };

const CORP_TOPOLOGY: IRangeTopology = {
    viewBox: '0 0 920 360',
    zones: [
        { id: 'pub', label: '公网区', x: 20, width: 250 },
        { id: 'app', label: '业务区', x: 300, width: 300 },
    ],
    nodes: [
        {
            id: 'wp',
            label: '企业门户网站',
            ip: '10.10.0.18',
            type: 'server',
            os: 'Ubuntu 22.04 / WordPress',
            services: ['http :80', 'https :443'],
            vulnerabilities: ['CVE-2024-8353'],
            x: 145,
            y: 170,
            zone: 'pub',
        },
        {
            id: 'redis',
            label: '缓存数据库',
            ip: '10.20.2.212',
            type: 'database',
            os: 'Redis 7.2',
            services: ['redis :6379'],
            vulnerabilities: ['Redis 未认证'],
            x: 430,
            y: 170,
            zone: 'app',
        },
    ],
    edges: [['wp', 'redis']],
    attackPath: ['wp', 'redis'],
};

const makePendingEnvironment = (id: string, taskEnvironmentId: string, name: string, industry: string): IRangeEnvironment => ({
    id,
    taskEnvironmentId,
    name,
    description: '预置演示场景 · 接入中。',
    industry,
    isReal: false,
    status: 'pending',
    networkScale: '4 网段 / 16 节点',
    imageProfile: '',
    warmup: '',
    agents: [],
    stages: [],
    killChain: [],
    subnet: '',
    vulnerabilitySurface: '',
    telemetry: [],
    topology: EMPTY_TOPOLOGY,
});

const ENVIRONMENTS: readonly IRangeEnvironment[] = [
    {
        id: 'SCN-01',
        taskEnvironmentId: 'corp',
        name: 'ENT-0520 靶场',
        description: '真实接入企业内网环境。',
        industry: '企业内网',
        isReal: true,
        status: 'available',
        networkScale: '5 网区 / 20 节点',
        imageProfile: '20 镜像',
        warmup: '构建 32min',
        agents: ['Mythos-Attack-v2'],
        stages: ['公网扫描立足', '私钥横向提权'],
        killChain: ['侦察探测', '漏洞利用', '权限提升', '横向移动', '目标达成'],
        subnet: '10.10.0.0/24 → 10.20.4.0/24',
        vulnerabilitySurface: 'CVE-2024-8353；Redis 未授权',
        telemetry: [
            { label: '在线节点', value: '20 / 20' },
            { label: '告警队列', value: '5 条', isAlert: true },
        ],
        topology: CORP_TOPOLOGY,
    },
    {
        id: 'SCN-02',
        taskEnvironmentId: 'nuclear',
        name: 'ENG-0416 靶场',
        description: '能源预置演示场景。',
        industry: '能源',
        isReal: false,
        status: 'available',
        networkScale: '4 网段 / 16 节点',
        imageProfile: '20 镜像',
        warmup: '构建 52min',
        agents: ['ICS-Hawk'],
        stages: ['供应链入口侦察', '边界穿透立足'],
        killChain: ['侦察探测', '漏洞利用', '权限提升', '横向移动', '目标达成'],
        subnet: '172.20.3.0/24',
        vulnerabilitySurface: '隔离网闸协议绕过',
        telemetry: [{ label: '在线节点', value: '16 / 16' }],
        topology: CORP_TOPOLOGY,
    },
    makePendingEnvironment('SCN-03', 'bank', 'FIN-0418 靶场', '金融'),
    makePendingEnvironment('SCN-04', 'cloud', 'GOV-0415 靶场', '政务'),
    makePendingEnvironment('SCN-05', 'transport', 'TRN-0414 靶场', '交通'),
];

const cloneEnvironment = (environment: IRangeEnvironment): IRangeEnvironment => structuredClone(environment);

export const createRangeHallFixture = (): IRangeHallData => ({ environments: ENVIRONMENTS.map(cloneEnvironment) });

export const getRangeEnvironmentFixture = (environmentId: string): IRangeEnvironment => {
    const environment = ENVIRONMENTS.find(({ id }) => id === environmentId);
    if (!environment) throw new Error('Range environment fixture not found');
    return cloneEnvironment(environment);
};
