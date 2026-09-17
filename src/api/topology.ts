import { ITopologyDTO } from '@/features/topology/domain/topology';
import { parseTopology } from '@/features/topology/domain/validate-topology';

const BASE_URL = import.meta.env.BASE_URL;

export const RANGE3_TOPOLOGY_URL = `${BASE_URL}data/topology/range3.json`;

const assertSuccessfulResponse = (response: Response, resource: string) => {
    if (!response.ok) throw new Error(`${resource} load failed (HTTP ${response.status})`);
};

export const getDashboardTopology = async (signal?: AbortSignal): Promise<ITopologyDTO> => {
    const response = await fetch(RANGE3_TOPOLOGY_URL, { cache: 'no-store', signal });
    assertSuccessfulResponse(response, 'Range 3 topology');
    return parseTopology(await response.json());
};
