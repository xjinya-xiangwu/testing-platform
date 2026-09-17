import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTopology } from '@/features/topology/domain/validate-topology';

const loadTopology = (rangeId: string) => {
    const source = JSON.parse(readFileSync(resolve(process.cwd(), `public/data/topology/${rangeId}.json`), 'utf8')) as unknown;
    return parseTopology(source);
};

describe('canonical topology JSON data', () => {
    it.each([
        ['range3', 6, 24, 2],
        ['range4', 6, 23, 0],
        ['range5', 5, 21, 2],
        ['range6', 3, 16, 2],
    ])('validates %s with its documented entity and attack-path counts', (rangeId, networkCount, nodeCount, attackPathCount) => {
        const topology = loadTopology(rangeId as string);

        expect(topology.networks).toHaveLength(networkCount as number);
        expect(topology.nodes).toHaveLength(nodeCount as number);
        expect(topology.attackPaths ?? []).toHaveLength(attackPathCount as number);
        expect(JSON.stringify(topology)).not.toContain('${');
    });

    it('leaves Range 4 attack paths unconfigured instead of guessing an entry order', () => {
        expect(loadTopology('range4').attackPaths).toBeUndefined();
    });

    it('derives the unambiguous vulnerable-node branches for Range 5 and Range 6', () => {
        expect(loadTopology('range5').attackPaths?.map((path) => path.nodeIds)).toEqual([
            ['attacker', 'wordpress', 'ubuntu', 'redis', 'antivirus'],
            ['attacker', 'wordpress', 'ubuntu', 'cms', 'emlog'],
        ]);
        expect(loadTopology('range6').attackPaths?.map((path) => path.nodeIds)).toEqual([
            ['attacker', 'halo', 'confluence', 'jenkins'],
            ['attacker', 'halo', 'confluence', 'kod'],
        ]);
    });
});
