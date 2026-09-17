import { afterEach, describe, expect, it, vi } from 'vitest';
import Http from '@/utils/axios';
import { adaptRangeTopology, getRangeEnvironmentDetail, getRangeHallData, isRangeTopology } from '@/api/range';
import range3Source from '../../public/data/topology/range3.json';
import range4Source from '../../public/data/topology/range4.json';
import range5Source from '../../public/data/topology/range5.json';
import range6Source from '../../public/data/topology/range6.json';

vi.mock('@/utils/axios', () => ({
    default: { get: vi.fn() },
}));

const detailResponse = {
    range_id: 'rng_range5',
    name: 'Range5 · 多网段横向移动企业内网',
    industry: '互联网',
    description: '5 网区 20 节点的企业内网',
    objective: '从 WordPress 入口依次达成 6 个里程碑',
    status: 'ACTIVE',
    estimated_duration_sec: 1800,
    allow_real_run: true,
    can_quick_create_job: true,
    supported_agent_types: ['claude_code', 'codex'],
    capacity: { total: 4, available: 4, queued: 0 },
    authorization: {
        network_scopes: ['172.180.1.0/24', '172.180.2.0/24'],
        allowed_actions: ['recon', 'exploit'],
        denied_actions: ['denial-of-service'],
    },
    vulnerability_surface: [
        {
            vulnerability_id: 'vuln-1_wordpress',
            cve: 'CVE-2024-8353',
            name: 'WordPress GiveWP RCE',
            severity: 'CRITICAL',
            cvss: 10,
            node_id: '1_wordpress',
            exploitable: true,
            description: 'RCE',
        },
    ],
    topology: {
        topology_version: 'postexploitbench-range5-v1',
        nodes: [
            {
                node_id: 'attacker',
                name: '攻击者',
                node_type: 'attacker',
                zone: 'external',
                status: 'unknown',
                is_exploitable: false,
                is_decoy: false,
                vulnerability_ids: [],
                x: 0,
                y: 0,
            },
            {
                node_id: '1_wordpress',
                name: '1_wordpress',
                node_type: 'vuln',
                zone: '172.180.1.0/24',
                status: 'unknown',
                ip: '172.180.1.18',
                is_exploitable: true,
                is_decoy: false,
                vulnerability_ids: ['vuln-1_wordpress'],
                x: 160,
                y: 160,
            },
        ],
        edges: [{ edge_id: 'e-1', source: 'attacker', target: '1_wordpress', link_type: 'http', status: 'unknown' }],
        attack_path: ['attacker', '1_wordpress'],
    },
    updated_at: '2026-08-18T08:00:00Z',
};

describe('range API facade', () => {
    afterEach(() => vi.clearAllMocks());

    it('loads and maps the documented range list without inventing detail-only values', async () => {
        vi.mocked(Http.get).mockResolvedValue({
            code: 0,
            data: {
                list: [
                    {
                        range_id: 'rng_range5',
                        name: 'Range5 · 多网段横向移动企业内网',
                        industry: '互联网',
                        status: 'ACTIVE',
                        node_count: 26,
                        estimated_duration_sec: 1800,
                        estimated_wait_sec: 0,
                        allow_real_run: true,
                        can_quick_create_job: true,
                        capacity: { total: 4, available: 4, queued: 0 },
                    },
                    {
                        range_id: 'rng_range6',
                        name: 'Range6',
                        industry: '能源',
                        status: 'INACTIVE',
                        node_count: 10,
                        estimated_duration_sec: 1200,
                        estimated_wait_sec: 30,
                        allow_real_run: false,
                        can_quick_create_job: false,
                        capacity: { total: 4, available: 0, queued: 1 },
                    },
                ],
                page: { page: 1, page_size: 100, total: 2 },
            },
            msg: '',
        });

        const hall = await getRangeHallData();

        expect(hall.environments).toEqual([
            expect.objectContaining({
                id: 'rng_range5',
                taskEnvironmentId: 'rng_range5',
                name: 'Range5 · 多网段横向移动企业内网',
                industry: '互联网',
                status: 'available',
                isReal: true,
                networkScale: '26',
                imageProfile: '',
                warmup: '',
                description: '',
                agents: [],
                stages: [],
                vulnerabilitySurface: '',
            }),
            expect.objectContaining({ id: 'rng_range6', status: 'pending', isReal: false }),
        ]);
        expect(Http.get).toHaveBeenCalledWith('/api/v1/ranges?page=1&page_size=100', { forbidMsg: true });
    });

    it('loads a range detail and derives the existing topology view from documented fields', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: detailResponse, msg: '' });

        const environment = await getRangeEnvironmentDetail('rng_range5');

        expect(Http.get).toHaveBeenCalledWith('/api/v1/ranges/rng_range5', { forbidMsg: true });
        expect(environment).toMatchObject({
            id: 'rng_range5',
            taskEnvironmentId: 'rng_range5',
            description: '5 网区 20 节点的企业内网',
            agents: ['claude_code', 'codex'],
            subnet: '172.180.1.0/24 / 172.180.2.0/24',
            status: 'available',
            isReal: true,
            stages: [],
            killChain: [],
            vulnerabilitySurface: 'CVE-2024-8353 · WordPress GiveWP RCE · CRITICAL',
        });
        expect(environment.topology).toMatchObject({
            attackPath: ['attacker', '1_wordpress'],
            edges: [['attacker', '1_wordpress']],
        });
        expect(environment.topology.nodes).toEqual([
            expect.objectContaining({ id: 'attacker', label: '攻击者', ip: '', type: 'workstation', vulnerabilities: [] }),
            expect.objectContaining({ id: '1_wordpress', ip: '172.180.1.18', type: 'server', vulnerabilities: ['WordPress GiveWP RCE'] }),
        ]);
        expect(environment.topology.zones.map(({ id }) => id)).toEqual(['external', '172.180.1.0/24']);
        expect(isRangeTopology(environment.topology)).toBe(true);
    });

    it('URL-encodes opaque range IDs and rejects empty backend responses', async () => {
        vi.mocked(Http.get).mockResolvedValue({ code: 0, data: null, msg: '' });

        await expect(getRangeEnvironmentDetail('range/../../other')).rejects.toThrow('Range detail response is empty');
        expect(Http.get).toHaveBeenCalledWith('/api/v1/ranges/range%2F..%2F..%2Fother', { forbidMsg: true });
    });

    it('rejects an empty range ID before making a request', async () => {
        await expect(getRangeEnvironmentDetail('   ')).rejects.toThrow('environmentId');
        expect(Http.get).not.toHaveBeenCalled();
    });

    it('keeps topology validation strict at the rendering boundary', () => {
        expect(isRangeTopology({ nodes: [], edges: [] })).toBe(false);
        expect(isRangeTopology({ viewBox: '0 0 100 100', attackPath: [], zones: [], nodes: [], edges: [['node', 42]] })).toBe(false);
    });

    it('drops malformed backend nodes instead of inventing IDs or coordinates', () => {
        const topology = adaptRangeTopology({
            nodes: [
                { node_id: 'gateway', name: 'Gateway', node_type: 'appliance', zone: 'edge', x: 20, y: 40 },
                { node_id: 'network', name: 'Network', node_type: 'network', zone: 'edge', x: 160, y: 40 },
                { name: 'Missing identity and coordinates', node_type: 'server' },
            ],
            edges: [],
            attack_path: [],
        });

        expect(topology.nodes).toEqual([expect.objectContaining({ id: 'gateway', type: 'device', x: 20, y: 40 })]);
        expect(topology.networkConnectors).toEqual([]);
    });

    it('projects legacy cross-zone node-to-network edges into node-to-zone links', () => {
        const topology = adaptRangeTopology({
            nodes: [
                { node_id: 'attacker', name: 'Attacker', node_type: 'attacker', zone: 'external', x: 0, y: 0 },
                { node_id: 'public-network', name: 'Public network', node_type: 'network', zone: 'public', x: 160, y: 0 },
                { node_id: 'halo', name: 'Halo', node_type: 'service', zone: 'public', x: 160, y: 160 },
                { node_id: 'sub1-network', name: 'Sub1 network', node_type: 'network', zone: 'sub1', x: 320, y: 0 },
            ],
            edges: [
                { edge_id: 'attacker-public', source: 'attacker', target: 'public-network' },
                { edge_id: 'halo-sub1', source: 'halo', target: 'sub1-network' },
                { edge_id: 'halo-public', source: 'halo', target: 'public-network' },
                { edge_id: 'public-halo', source: 'public-network', target: 'halo' },
            ],
            attack_path: [],
        });

        expect(topology.nodeZoneLinks).toEqual([
            { id: 'attacker-public', sourceNodeId: 'attacker', targetZoneId: 'public' },
            { id: 'halo-sub1', sourceNodeId: 'halo', targetZoneId: 'sub1' },
        ]);
        expect(topology.nodes.map(({ id }) => id)).not.toEqual(expect.arrayContaining(['public-network', 'sub1-network']));
        expect(topology.networkConnectors).toEqual([
            { id: 'public-network', label: 'Public network', sourceNodeId: 'attacker', sourceZoneId: 'external', targetNodeIds: ['halo'], targetZoneId: 'public' },
            { id: 'sub1-network', label: 'Sub1 network', sourceNodeId: 'halo', sourceZoneId: 'public', targetNodeIds: [], targetZoneId: 'sub1' },
        ]);
    });

    it.each([
        ['range3', range3Source, 6, 23],
        ['range4', range4Source, 6, 22],
        ['range5', range5Source, 5, 20],
        ['range6', range6Source, 3, 15],
    ])('projects the canonical %s topology response into the range detail view', (_rangeId, source, expectedZoneCount, expectedNodeCount) => {
        const topology = adaptRangeTopology(source);

        expect(isRangeTopology(topology)).toBe(true);
        expect(topology.zones).toHaveLength(expectedZoneCount);
        expect(topology.nodes).toHaveLength(expectedNodeCount);
        expect(topology.nodes.some(({ id }) => id === 'attacker')).toBe(false);
        expect(topology.zones.some(({ id }) => id === 'internet')).toBe(false);
        expect(topology.connections?.length).toBeGreaterThan(0);
        expect(topology.zoneEdges?.length).toBeGreaterThan(0);
        expect(new Set(topology.nodes.map(({ x, y }) => `${x}:${y}`)).size).toBe(topology.nodes.length);
        topology.nodes.forEach((node) => {
            expect(Number.isFinite(node.x)).toBe(true);
            expect(Number.isFinite(node.y)).toBe(true);
            const zone = topology.zones.find(({ id }) => id === node.zone);
            expect(zone).toBeDefined();
            expect(node.x).toBeGreaterThan(zone!.x);
            expect(node.x).toBeLessThan(zone!.x + zone!.width);
            expect(node.y).toBeGreaterThan(zone!.y ?? 0);
            expect(node.y).toBeLessThan((zone!.y ?? 0) + (zone!.height ?? 0));
        });
    });

    it('preserves canonical node metadata and branching zone relationships', () => {
        const topology = adaptRangeTopology(range3Source);

        expect(topology.nodes).toContainEqual(
            expect.objectContaining({
                id: 'react',
                ip: '172.110.1.18',
                role: 'primary',
                type: 'server',
            }),
        );
        expect(topology.nodes).toContainEqual(expect.objectContaining({ id: 'postfix', role: 'decoy' }));
        expect(topology.zoneEdges).toEqual(
            expect.arrayContaining([
                ['public-access', 'business-application'],
                ['business-application', 'gis-service'],
                ['business-application', 'ops-monitoring'],
            ]),
        );
        expect(topology.nodeZoneLinks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ sourceNodeId: 'react', targetZoneId: 'business-application' }),
                expect.objectContaining({ sourceNodeId: 'dubbo', targetZoneId: 'gis-service' }),
                expect.objectContaining({ sourceNodeId: 'dubbo', targetZoneId: 'ops-monitoring' }),
            ]),
        );
        expect(topology.nodeZoneLinks?.some(({ sourceNodeId }) => sourceNodeId === 'attacker')).toBe(false);
        expect(topology.zones.find(({ id }) => id === 'public-access')).toMatchObject({ cidr: '172.110.1.0/24' });
        expect(topology.networkConnectors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'react_dubbo',
                    label: 'react_to_dubbo_net',
                    sourceNodeId: 'react',
                    sourceZoneId: 'public-access',
                    targetZoneId: 'business-application',
                }),
            ]),
        );
        expect(topology.nodes.some(({ id }) => id === 'react_dubbo')).toBe(false);
    });
});
