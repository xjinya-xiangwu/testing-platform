import { describe, expect, it, vi } from 'vitest';
import { isRangeTopology } from '@/api/range';
import { adaptJobDetailResponse, createJobDetailApi } from '@/api/job-detail';
import { DEMO_JOB } from '@/config/cgi';
import { DEMO_JOB_ID, PINNED_JOB_ID } from '@/config/demo-job';
import range5Source from '../../public/data/topology/range5.json';

const BACKEND_DETAIL = {
    job_id: 'job_real_001',
    top_info: {
        name: 'Range5 live run',
        subtitle: 'backend response',
        tags: ['靶场攻防', 'codex'],
        job_type: 'RANGE',
        agent_id: 'codex',
        run_mode: 'AGENT',
        interaction_mode: 'OBSERVE',
        status: 'RUNNING',
        available_actions: ['PAUSE', 'TERMINATE'],
    },
    milestones: {
        total: 2,
        completed: 1,
        verified: 1,
        latest_reached: 'wordpress-rce',
        items: [
            { ordinal: 0, id: 'wordpress-rce', service: 'wordpress', status: 'VERIFIED', observed_at: '2026-08-26T06:15:19Z', verified_at: '2026-08-26T06:16:30Z' },
            { ordinal: 1, id: 'redis-webshell', service: 'redis', status: 'CANDIDATE' },
        ],
    },
    current_step: { sequence: 2, total: 2, id: 'redis-webshell', service: 'redis', status: 'CANDIDATE' },
    environment: {
        target_subnet: '172.180.1.0/24',
        cve: 'CVE-2024-8353',
        cvss: 10,
        network_environment: '多子网隔离',
        environment_task: 'collect evidence',
    },
    topology: {
        topology_version: 'v1',
        nodes: [
            { node_id: 'attacker', name: 'attacker', node_type: 'attacker', zone: 'external', status: 'observed', x: 40, y: 80 },
            { node_id: 'wordpress', name: 'wordpress', node_type: 'vuln', zone: '172.180.1.0/24', status: 'milestone_observed', ip: '172.180.1.18', x: 220, y: 160 },
        ],
        edges: [{ edge_id: 'e-1', source: 'attacker', target: 'wordpress', status: 'observed' }],
        attack_path: ['attacker', 'wordpress'],
    },
    observations: [{ type: 'tool.finished', level: 'INFO', summary: 'nmap completed', occurred_at: '2026-08-26T06:16:51Z' }],
    available_tools: ['nmap'],
    risk_checks: [],
};

describe('job detail API facade', () => {
    it('uses the documented typed GET /api/v1/jobs/:job_id adapter', async () => {
        const request = vi.fn(async () => BACKEND_DETAIL);
        const api = createJobDetailApi({ request });

        const result = await api.getJobDetail('JOB/2026 08');

        expect(request).toHaveBeenCalledOnce();
        expect(request).toHaveBeenCalledWith('/api/v1/jobs/JOB%2F2026%2008');
        expect(result).toEqual(adaptJobDetailResponse(BACKEND_DETAIL));
        expect(result.top_info).toMatchObject({ name: 'Range5 live run', available_actions: ['PAUSE', 'TERMINATE'] });
        expect(result.milestones.items).toHaveLength(2);
        expect(result.milestones).toMatchObject({ total: 2, completed: 1, verified: 1, latest_reached: 'wordpress-rce' });
        expect(result.current_step).toMatchObject({ id: 'redis-webshell', service: 'redis' });
        expect(result.observations).toEqual([{ type: 'tool.finished', level: 'INFO', summary: 'nmap completed', occurred_at: '2026-08-26T06:16:51Z' }]);
        expect(result.available_tools).toEqual(['nmap']);
        expect(result.topology).toMatchObject({ attackPath: ['attacker', 'wordpress'] });
    });

    it('always uses the real request adapter and returns fresh normalized DTOs', async () => {
        const request = vi.fn(async () => BACKEND_DETAIL);
        const api = createJobDetailApi({ request });

        const first = await api.getJobDetail('JOB-20260806-021');
        const second = await api.getJobDetail('JOB-20260806-021');

        expect(request).toHaveBeenCalledTimes(2);
        expect(request).toHaveBeenNthCalledWith(1, '/api/v1/jobs/JOB-20260806-021');
        expect(request).toHaveBeenNthCalledWith(2, '/api/v1/jobs/JOB-20260806-021');
        expect(first).toEqual(second);
        expect(first).not.toBe(second);
        expect(first.top_info).not.toBe(second.top_info);
        expect(first.milestones.items).not.toBe(second.milestones.items);
        expect(first.top_info).toMatchObject({ job_type: 'RANGE', run_mode: 'AGENT', interaction_mode: 'OBSERVE' });
        expect(first).toEqual(
            expect.objectContaining({
                milestones: expect.any(Object),
                environment: expect.any(Object),
                topology: expect.any(Object),
                risk_checks: expect.any(Array),
                observations: expect.any(Array),
                available_tools: expect.any(Array),
            }),
        );
        expect(first).not.toHaveProperty('runtime_status');
        expect(first).not.toHaveProperty('console');
        expect(first).not.toHaveProperty('workspace_files');
        expect(first.milestones).not.toHaveProperty('score');
        expect(first.milestones).not.toHaveProperty('completed_steps');
        expect(first.milestones.items[0]).not.toHaveProperty('score');
        expect(first.observations[0]).not.toHaveProperty('score_delta');
    });

    it('uses the standalone demo endpoint for the global demo id and adapts its detail section', async () => {
        const request = vi.fn(async () => ({ card: { job_id: DEMO_JOB_ID }, detail: BACKEND_DETAIL }));

        const result = await createJobDetailApi({ request }).getJobDetail(PINNED_JOB_ID);

        expect(request).toHaveBeenCalledWith(DEMO_JOB);
        expect(result).toEqual(adaptJobDetailResponse(BACKEND_DETAIL));
    });

    it('preserves the backend aggregated job-detail shape without bypassing field normalization', () => {
        const result = adaptJobDetailResponse({
            top_info: {
                name: 'Aggregated Range5 run',
                subtitle: 'aggregated backend response',
                tags: ['REAL', 'AGENT', 'OBSERVE'],
                job_type: 'RANGE',
                agent_id: 'mythos-attack-v2',
                run_mode: 'AGENT',
                interaction_mode: 'OBSERVE',
                status: 'RUNNING',
                available_actions: ['PAUSE', 'TERMINATE', 'INVALID'],
            },
            milestones: {
                total: 2,
                completed: 1,
                verified: 1,
                latest_reached: 'wordpress-rce',
                items: [
                    { ordinal: 0, id: 'wordpress-rce', service: 'wordpress', status: 'VERIFIED', observed_at: '2026-08-25T06:59:00Z', verified_at: '2026-08-25T06:59:30Z' },
                    { ordinal: 1, id: 'redis-webshell', service: 'redis', status: 'CANDIDATE' },
                ],
            },
            current_step: { sequence: 2, total: 2, id: 'redis-webshell', service: 'redis', status: 'CANDIDATE' },
            observations: [{ type: 'tool.finished', level: 'INFO', summary: 'redis-cli completed', occurred_at: '2026-08-25T07:00:00Z' }],
            available_tools: ['redis-cli'],
        });

        expect(result.top_info).toEqual({
            name: 'Aggregated Range5 run',
            subtitle: 'aggregated backend response',
            tags: ['REAL', 'AGENT', 'OBSERVE'],
            job_type: 'RANGE',
            agent_id: 'mythos-attack-v2',
            run_mode: 'AGENT',
            interaction_mode: 'OBSERVE',
            status: 'RUNNING',
            available_actions: ['PAUSE', 'TERMINATE'],
        });
        expect(result.milestones).toMatchObject({ total: 2, completed: 1, verified: 1, latest_reached: 'wordpress-rce' });
        expect(result.milestones.items).toEqual([
            expect.objectContaining({ ordinal: 0, id: 'wordpress-rce', service: 'wordpress', status: 'VERIFIED' }),
            expect.objectContaining({ ordinal: 1, id: 'redis-webshell', service: 'redis', status: 'CANDIDATE' }),
        ]);
        expect(result.current_step).toEqual({ sequence: 2, total: 2, id: 'redis-webshell', service: 'redis', status: 'CANDIDATE' });
        expect(result.observations).toEqual([{ type: 'tool.finished', level: 'INFO', summary: 'redis-cli completed', occurred_at: '2026-08-25T07:00:00Z' }]);
        expect(result.available_tools).toEqual(['redis-cli']);
    });

    it('preserves canonical Range5 node ids and resolves every attack-path reference', () => {
        const result = adaptJobDetailResponse({ ...BACKEND_DETAIL, topology: range5Source });

        expect(isRangeTopology(result.topology)).toBe(true);
        if (!isRangeTopology(result.topology)) throw new Error('Canonical Range5 topology was not adapted');

        const nodeIds = new Set(result.topology.nodes.map(({ id }) => id));
        const unresolvedPathNodeIds = (result.topology.attackPaths ?? []).flatMap(({ nodeIds: pathNodeIds }) => pathNodeIds.filter((nodeId) => !nodeIds.has(nodeId)));

        expect(nodeIds).toContain('attacker');
        expect(result.topology.attackPaths).toHaveLength(2);
        expect(unresolvedPathNodeIds).toEqual([]);
    });

    it('projects legacy network nodes as independent connectors instead of service nodes', () => {
        const result = adaptJobDetailResponse({
            ...BACKEND_DETAIL,
            topology: {
                nodes: [
                    { node_id: 'react', name: 'react', node_type: 'vuln', zone: 'public', x: 100, y: 100 },
                    { node_id: 'react-dubbo-network', name: 'react_to_dubbo_net', node_type: 'network', zone: 'business', cidr: '172.110.2.0/24', x: 200, y: 100 },
                    { node_id: 'dubbo', name: 'dubbo-provider', node_type: 'vuln', zone: 'business', x: 300, y: 100 },
                ],
                edges: [
                    { source: 'react', target: 'react-dubbo-network' },
                    { source: 'react-dubbo-network', target: 'dubbo' },
                ],
                attack_path: ['react', 'dubbo'],
            },
        });

        expect(isRangeTopology(result.topology)).toBe(true);
        if (!isRangeTopology(result.topology)) throw new Error('Legacy topology was not adapted');

        expect(result.topology.nodes.map(({ id }) => id)).toEqual(['react', 'dubbo']);
        expect(result.topology.networkConnectors).toEqual([
            {
                cidr: '172.110.2.0/24',
                id: 'react-dubbo-network',
                label: 'react_to_dubbo_net',
                sourceNodeId: 'react',
                sourceZoneId: 'public',
                targetNodeIds: ['dubbo'],
                targetZoneId: 'business',
            },
        ]);
    });

    it('keeps non-terminal backend jobs out of the completed state', () => {
        expect(adaptJobDetailResponse({ ...BACKEND_DETAIL, top_info: { ...BACKEND_DETAIL.top_info, status: 'INITIALIZING', available_actions: [] } }).top_info.status).toBe('INITIALIZING');
        expect(adaptJobDetailResponse({ ...BACKEND_DETAIL, top_info: { ...BACKEND_DETAIL.top_info, status: 'CREATED', available_actions: ['TERMINATE'] } }).top_info.status).toBe('INITIALIZING');
        expect(adaptJobDetailResponse({ ...BACKEND_DETAIL, top_info: { ...BACKEND_DETAIL.top_info, status: 'PROVISIONING', available_actions: ['TERMINATE'] } }).top_info.status).toBe('INITIALIZING');
        expect(adaptJobDetailResponse({ ...BACKEND_DETAIL, top_info: { ...BACKEND_DETAIL.top_info, status: 'TERMINATING', available_actions: [] } }).top_info.status).toBe('INITIALIZING');
    });

    it('normalizes terminal backend jobs to the completed workbench state', () => {
        expect(adaptJobDetailResponse({ ...BACKEND_DETAIL, top_info: { ...BACKEND_DETAIL.top_info, status: 'SUCCEEDED', available_actions: [] } }).top_info.status).toBe('COMPLETED');
        expect(adaptJobDetailResponse({ ...BACKEND_DETAIL, top_info: { ...BACKEND_DETAIL.top_info, status: 'FAILED', available_actions: [] } }).top_info.status).toBe('COMPLETED');
        expect(adaptJobDetailResponse({ ...BACKEND_DETAIL, top_info: { ...BACKEND_DETAIL.top_info, status: 'TERMINATED', available_actions: [] } }).top_info.status).toBe('COMPLETED');
    });

    it('rejects an empty job ID before making a detail request', async () => {
        const request = vi.fn(async () => BACKEND_DETAIL);

        await expect(createJobDetailApi({ request }).getJobDetail('   ')).rejects.toThrow('jobId');
        expect(request).not.toHaveBeenCalled();
    });
});
