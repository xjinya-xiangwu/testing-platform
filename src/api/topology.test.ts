import { afterEach, describe, expect, it, vi } from 'vitest';
import { RANGE3_TOPOLOGY_URL, getDashboardTopology } from '@/api/topology';
import { parseTopology } from '@/features/topology/domain/validate-topology';
import topologySource from '../../public/data/topology/range3.json';

const TOPOLOGY = parseTopology(topologySource);

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('dashboard topology API', () => {
    it('loads the canonical Range 3 JSON with one request and returns a validated DTO', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue(TOPOLOGY) });
        vi.stubGlobal('fetch', fetchMock);
        const controller = new AbortController();

        const topology = await getDashboardTopology(controller.signal);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(RANGE3_TOPOLOGY_URL, { cache: 'no-store', signal: controller.signal });
        expect(topology.nodes).toHaveLength(24);
        expect(topology.links).toHaveLength(29);
    });

    it('reports the failed JSON source and HTTP status', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

        await expect(getDashboardTopology()).rejects.toThrow('Range 3 topology load failed (HTTP 503)');
    });

    it('rejects malformed topology JSON at the API boundary', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ zones: [], networks: [], nodes: [{}], links: [] }) }));

        await expect(getDashboardTopology()).rejects.toThrow(/node/i);
    });
});
