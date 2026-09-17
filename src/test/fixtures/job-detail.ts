import type { IJobDetail } from '@/api/job-detail';
import type { IRangeTopology } from '@/api/range';

const TOPOLOGY: IRangeTopology = {
    viewBox: '0 0 920 360',
    zones: [
        { id: 'pub', label: '公网区', x: 20, width: 170 },
        { id: 'app', label: '核心交换区', x: 215, width: 170 },
        { id: 'cache', label: '业务交换区', x: 410, width: 170 },
        { id: 'sec', label: '数据交换区', x: 605, width: 135 },
        { id: 'cms', label: '接入交换区', x: 765, width: 135 },
    ],
    nodes: [
        { id: 'attacker', label: '攻击源', ip: '203.0.113.10', type: 'workstation', os: 'Kali Linux', services: [], vulnerabilities: [], x: 80, y: 84, zone: 'pub' },
        { id: 'wp', label: '企业门户', ip: '10.10.0.18', type: 'server', os: 'Ubuntu', services: ['http :80'], vulnerabilities: ['CVE-2024-8353'], x: 145, y: 170, zone: 'pub' },
        { id: 'app', label: '应用服务器', ip: '10.20.1.116', type: 'server', os: 'Ubuntu', services: ['ssh :22'], vulnerabilities: [], x: 285, y: 118, zone: 'app' },
        { id: 'redis', label: '缓存数据库', ip: '10.20.2.212', type: 'database', os: 'Debian', services: ['redis :6379'], vulnerabilities: [], x: 475, y: 118, zone: 'cache' },
        { id: 'av', label: '安全检测', ip: '10.20.3.7', type: 'firewall', os: 'SecurityOS', services: [], vulnerabilities: [], x: 670, y: 118, zone: 'sec' },
        { id: 'cms', label: '内容平台', ip: '10.20.4.50', type: 'server', os: 'Ubuntu', services: ['http :80'], vulnerabilities: [], x: 825, y: 118, zone: 'cms' },
    ],
    edges: [
        ['attacker', 'wp'],
        ['wp', 'app'],
        ['app', 'redis'],
        ['redis', 'av'],
        ['av', 'cms'],
    ],
    attackPath: ['attacker', 'wp', 'app', 'redis', 'av', 'cms'],
    attackPaths: [
        { id: 'fixture-primary-path', nodeIds: ['attacker', 'wp', 'app', 'redis', 'av', 'cms'] },
        { id: 'fixture-secondary-path', nodeIds: ['attacker', 'wp', 'app', 'cms'] },
    ],
};

export const createJobDetailFixture = (): IJobDetail => ({
    top_info: {
        name: 'CVE-2024-8353 红蓝攻防',
        subtitle: 'SCN-01 · 企业内网横向移动 · Mythos-Attack-v2',
        tags: ['困难', '红蓝攻防 · 智能体 Mythos-Attack-v2', '观察模式'],
        job_type: 'RANGE',
        agent_id: 'mythos-attack-v2',
        run_mode: 'AGENT',
        interaction_mode: 'OBSERVE',
        status: 'RUNNING',
        available_actions: ['PAUSE', 'TERMINATE'],
    },
    milestones: {
        total: 5,
        completed: 3,
        verified: 2,
        latest_reached: 'privilege-escalation',
        items: [
            {
                ordinal: 0,
                id: 'recon',
                service: 'discovery',
                status: 'VERIFIED',
                observed_at: '2026-08-26T06:15:19Z',
                verified_at: '2026-08-26T06:16:30Z',
            },
            {
                ordinal: 1,
                id: 'exploit',
                service: 'wordpress',
                status: 'VERIFIED',
                observed_at: '2026-08-26T06:15:20Z',
                verified_at: '2026-08-26T06:16:30Z',
            },
            { ordinal: 2, id: 'privilege-escalation', service: 'ssh', status: 'OBSERVED', observed_at: '2026-08-26T06:16:09Z' },
            { ordinal: 3, id: 'lateral-movement', service: 'redis', status: 'CANDIDATE' },
            { ordinal: 4, id: 'objective', service: 'clamav', status: 'PENDING' },
        ],
    },
    environment: {
        target_subnet: '10.10.0.0/24 → 10.20.4.0/24',
        cve: 'CVE-2024-8353',
        cvss: 9.8,
        network_environment: '多子网隔离',
        environment_task: '企业内网横向移动',
    },
    current_step: { sequence: 4, total: 5, id: 'lateral-movement', service: 'redis', status: 'CANDIDATE' },
    topology: TOPOLOGY,
    risk_checks: [],
    observations: [
        { type: 'tool.finished', level: 'INFO', summary: 'Redis 未授权访问证据有效', occurred_at: '2026-08-26T06:16:51Z' },
        { type: 'environment.finding', level: 'WARN', summary: '检测平台发现混淆 payload 上传', occurred_at: '2026-08-26T06:16:52Z' },
    ],
    available_tools: ['nmap', 'curl', 'python3', 'redis-cli', 'ssh'],
});
